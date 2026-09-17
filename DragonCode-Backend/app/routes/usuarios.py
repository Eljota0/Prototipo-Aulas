from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Any

from app.database import get_db
from app.models.models import Usuario, TiendaAvatar
from app.schemas.usuario import ActualizarPerfilRequest, PerfilResponse, AvatarResponse, EquiparAvatarRequest
from app.core.deps import get_current_user
from app.core.academic import ahora_utc

router = APIRouter()

@router.get("/me", response_model=PerfilResponse)
def get_me(current_user: Usuario = Depends(get_current_user)) -> Any:
    """Retorna el perfil completo del usuario que tiene la sesión activa."""
    return current_user


@router.patch("/me", response_model=PerfilResponse)
def actualizar_mi_perfil(
    datos: ActualizarPerfilRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> Any:
    """Guarda nombre/apellido exclusivamente en la cuenta autenticada."""
    cambios = datos.model_dump(exclude_unset=True)
    if "nombre" in cambios:
        current_user.nombre = cambios["nombre"]
    if "apellido" in cambios:
        current_user.apellido = cambios["apellido"]

    try:
        db.commit()
        db.refresh(current_user)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="No se pudo confirmar la actualización del perfil. Vuelve a intentarlo.",
        ) from None

    return current_user

@router.get("/avatares", response_model=List[AvatarResponse])
def get_avatares(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> Any:
    """Retorna todos los avatares activos de la tienda con indicador de si están desbloqueados."""
    avatares = db.query(TiendaAvatar).filter(TiendaAvatar.activo == True).all()
    desbloqueados = current_user.avatares_desbloqueados or []

    resultado = []
    for avatar in avatares:
        resultado.append(AvatarResponse(
            id=avatar.id,
            nombre_skin=avatar.nombre_skin,
            url_imagen=avatar.url_imagen,
            precio_estrellas=avatar.precio_estrellas,
            activo=avatar.activo,
            desbloqueado=avatar.id in desbloqueados or avatar.precio_estrellas == 0
        ))
    return resultado

@router.post("/avatares/{avatar_id}/comprar")
def comprar_avatar(
    avatar_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> Any:
    """Permite comprar un avatar con estrellas acumuladas."""
    avatar = db.query(TiendaAvatar).filter(
        TiendaAvatar.id == avatar_id,
        TiendaAvatar.activo == True
    ).first()
    if not avatar:
        raise HTTPException(status_code=404, detail="Avatar no encontrado.")

    if avatar.precio_estrellas < 0:
        raise HTTPException(status_code=409, detail="Este avatar no tiene un precio válido.")
    current_user = db.query(Usuario).filter(Usuario.id == current_user.id).populate_existing().with_for_update().one()
    desbloqueados = current_user.avatares_desbloqueados or []
    if avatar_id in desbloqueados:
        raise HTTPException(status_code=400, detail="Ya tienes este avatar desbloqueado.")

    if current_user.estrellas_totales < avatar.precio_estrellas:
        raise HTTPException(
            status_code=400,
            detail=f"Estrellas insuficientes. Necesitas {avatar.precio_estrellas} y tienes {current_user.estrellas_totales}."
        )

    current_user.estrellas_totales -= avatar.precio_estrellas
    current_user.avatares_desbloqueados = desbloqueados + [avatar_id]
    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="No se pudo completar la compra. Tus estrellas no fueron descontadas.",
        ) from None

    return {"mensaje": f"¡Avatar '{avatar.nombre_skin}' desbloqueado exitosamente!", "estrellas_restantes": current_user.estrellas_totales}

@router.patch("/avatares/equipar")
def equipar_avatar(
    datos: EquiparAvatarRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> Any:
    """Cambia el avatar activo del jugador."""
    avatar = db.query(TiendaAvatar).filter(
        TiendaAvatar.id == datos.avatar_id, TiendaAvatar.activo == True
    ).first()
    if not avatar:
        raise HTTPException(status_code=404, detail="Avatar no encontrado.")
    current_user = db.query(Usuario).filter(Usuario.id == current_user.id).populate_existing().with_for_update().one()
    desbloqueados = current_user.avatares_desbloqueados or []
    if datos.avatar_id not in desbloqueados and avatar.precio_estrellas != 0:
        raise HTTPException(status_code=403, detail="No has desbloqueado este avatar.")

    current_user.avatar_actual_id = datos.avatar_id
    current_user.ultimo_acceso = ahora_utc()
    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="No se pudo equipar el avatar. Vuelve a intentarlo.",
        ) from None

    return {"mensaje": "Avatar equipado exitosamente.", "avatar_id": datos.avatar_id}
