from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from typing import Any

from app.database import get_db
from app.models.models import Usuario
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token, CambiarPasswordRequest
from app.core.security import get_password_hash, verify_password, create_user_access_token
from app.core.deps import get_current_user
from app.core.rate_limit import login_attempt_limiter
from app.core.academic import ahora_utc


class RutaAutenticacion(APIRoute):
    """No devolver entradas con contraseñas en errores de validación de FastAPI."""

    def get_route_handler(self):
        original = super().get_route_handler()

        async def sin_datos_sensibles(request):
            try:
                return await original(request)
            except RequestValidationError:
                return JSONResponse(status_code=422, content={"detail": "Revisa los datos de autenticación y sus requisitos."})

        return sin_datos_sensibles


router = APIRouter(route_class=RutaAutenticacion)

_HASH_COMPARACION_INEXISTENTE = get_password_hash("DragonCodeComparacionTemporal1!")


def _clave_intentos(request: Request, email: str) -> str:
    cliente = request.client.host if request.client else None
    return login_attempt_limiter.crear_clave(cliente, email)


def _comprobar_bloqueo(clave: str) -> None:
    espera = login_attempt_limiter.segundos_restantes(clave)
    if espera:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados intentos. Espera unos minutos antes de volver a intentarlo.",
            headers={"Retry-After": str(espera)},
        )


def _rechazar_credenciales(clave: str) -> None:
    espera = login_attempt_limiter.registrar_fallo(clave)
    if espera:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados intentos. Espera unos minutos antes de volver a intentarlo.",
            headers={"Retry-After": str(espera)},
        )
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Correo electrónico o contraseña incorrectos",
        headers={"WWW-Authenticate": "Bearer"},
    )


def _autenticar(db: Session, email: str, password: str, clave: str) -> Usuario:
    _comprobar_bloqueo(clave)
    user = db.query(Usuario).filter(func.lower(Usuario.email) == email.lower()).first()
    hash_comparacion = user.password_hash if user else _HASH_COMPARACION_INEXISTENTE
    if not verify_password(password, hash_comparacion) or user is None:
        _rechazar_credenciales(clave)
    login_attempt_limiter.limpiar(clave)
    return user


def _registrar_ultimo_acceso(db: Session, user: Usuario) -> None:
    user.ultimo_acceso = ahora_utc()
    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No se pudo iniciar sesión en este momento. Vuelve a intentarlo.",
        ) from None

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)) -> Any:
    """Crea una cuenta con correo único y contraseña protegida."""
    user = db.query(Usuario).filter(func.lower(Usuario.email) == str(user_in.email).lower()).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="El correo electrónico ya está registrado en el sistema.",
        )
    
    new_user = Usuario(
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        nombre=user_in.nombre,
        apellido=user_in.apellido
    )
    
    db.add(new_user)
    try:
        db.commit()
        db.refresh(new_user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="El correo electrónico ya está registrado en el sistema.",
        ) from None
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="No se pudo crear la cuenta. Vuelve a intentarlo.",
        ) from None
    
    return new_user

@router.post("/login", response_model=Token)
def login(user_in: UserLogin, request: Request, db: Session = Depends(get_db)) -> Any:
    """Inicia una sesión con las credenciales enviadas en formato JSON."""
    email = str(user_in.email).lower()
    clave = _clave_intentos(request, email)
    user = _autenticar(db, email, user_in.password, clave)
    _registrar_ultimo_acceso(db, user)
    
    access_token = create_user_access_token(user)
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/token", response_model=Token)
def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> Any:
    """Inicia una sesión desde Swagger usando datos de formulario."""
    email = form_data.username.strip().lower()
    clave = _clave_intentos(request, email)
    user = _autenticar(db, email, form_data.password, clave)
    _registrar_ultimo_acceso(db, user)
    
    access_token = create_user_access_token(user)
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.patch("/password", status_code=204, response_class=Response)
def cambiar_password(
    datos: CambiarPasswordRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Reautentica, guarda el nuevo hash e invalida las sesiones anteriores."""
    hash_anterior = current_user.password_hash
    if not verify_password(datos.password_actual.get_secret_value(), hash_anterior):
        raise HTTPException(status_code=400, detail="La contraseña actual es incorrecta.")
    nueva = datos.password_nueva.get_secret_value()
    if verify_password(nueva, hash_anterior):
        raise HTTPException(status_code=409, detail="La nueva contraseña debe ser diferente de la actual.")

    hash_nuevo = get_password_hash(nueva)
    try:
        # Comparación y escritura atómicas: dos cambios simultáneos no se pisan.
        modificados = db.query(Usuario).filter(
            Usuario.id == current_user.id,
            Usuario.password_hash == hash_anterior,
        ).update({Usuario.password_hash: hash_nuevo}, synchronize_session=False)
        if modificados != 1:
            db.rollback()
            raise HTTPException(status_code=409, detail="La cuenta cambió durante la operación. Inicia sesión nuevamente.")
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo confirmar el cambio de contraseña.") from None
    return Response(status_code=204)
