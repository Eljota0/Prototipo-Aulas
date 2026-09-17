from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from sqlalchemy.orm import Session
from hmac import compare_digest

from app.database import get_db
from app.models.models import Usuario
from app.core.security import SECRET_KEY, ALGORITHM, credential_revision

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Usuario:
    """Valida el token JWT y retorna el usuario autenticado."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales. Sesión inválida o expirada.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, SECRET_KEY, algorithms=[ALGORITHM],
            options={"require": ["exp", "sub"]},
        )
        email: str = payload.get("sub")
        revision = payload.get("credential_revision")
        if (not isinstance(email, str) or not isinstance(revision, str)
                or len(revision) != 64 or not revision.isascii()):
            raise credentials_exception
    except jwt.InvalidTokenError:
        raise credentials_exception

    user = db.query(Usuario).filter(Usuario.email == email).first()
    if user is None or payload.get("id") != user.id:
        raise credentials_exception
    # Los tokens antiguos sin revisión también requieren un nuevo inicio de sesión.
    if not compare_digest(revision, credential_revision(user.id, user.password_hash)):
        raise credentials_exception
    return user

def get_current_anfitrion(current_user: Usuario = Depends(get_current_user)) -> Usuario:
    """Verifica que el usuario autenticado sea un Anfitrión."""
    from app.models.models import RolUsuario
    if current_user.rol not in [RolUsuario.anfitrion, RolUsuario.admin]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. Solo los Anfitriones pueden realizar esta acción.",
        )
    return current_user
