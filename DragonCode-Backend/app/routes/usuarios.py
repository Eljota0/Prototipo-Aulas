from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Any
from datetime import datetime

from app.database import get_db
from app.models.models import Usuario, TiendaAvatar
from app.schemas.usuario import PerfilResponse, AvatarResponse, EquiparAvatarRequest
from app.core.deps import get_current_user

router = APIRouter()

# ------------------------------------------------------------------
# OBTENER PERFIL DEL USUARIO AUTENTICADO
# ------------------------------------------------------------------
@router.get("/me", response_model=PerfilResponse)
def get_me(current_user: Usuario = Depends(get_current_user)) -> Any:
    """Retorna el perfil completo del usuario que tiene la sesión activa."""
    return current_user

# ------------------------------------------------------------------
# VER TODOS LOS AVATARES DE LA TIENDA
# ------------------------------------------------------------------
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
            desbloqueado=avatar.id in desbloqueados
        ))
    return resultado

# ------------------------------------------------------------------
# COMPRAR / DESBLOQUEAR UN AVATAR
# ------------------------------------------------------------------
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

    desbloqueados = current_user.avatares_desbloqueados or []
    if avatar_id in desbloqueados:
        raise HTTPException(status_code=400, detail="Ya tienes este avatar desbloqueado.")

    if current_user.estrellas_totales < avatar.precio_estrellas:
        raise HTTPException(
            status_code=400,
            detail=f"Estrellas insuficientes. Necesitas {avatar.precio_estrellas} y tienes {current_user.estrellas_totales}."
        )

    # Descontar estrellas y agregar a lista de desbloqueados
    current_user.estrellas_totales -= avatar.precio_estrellas
    current_user.avatares_desbloqueados = desbloqueados + [avatar_id]
    db.commit()

    return {"mensaje": f"¡Avatar '{avatar.nombre_skin}' desbloqueado exitosamente!", "estrellas_restantes": current_user.estrellas_totales}

# ------------------------------------------------------------------
# EQUIPAR UN AVATAR
# ------------------------------------------------------------------
@router.patch("/avatares/equipar")
def equipar_avatar(
    datos: EquiparAvatarRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> Any:
    """Cambia el avatar activo del jugador."""
    desbloqueados = current_user.avatares_desbloqueados or []
    if datos.avatar_id not in desbloqueados:
        raise HTTPException(status_code=403, detail="No has desbloqueado este avatar.")

    current_user.avatar_actual_id = datos.avatar_id
    current_user.ultimo_acceso = datetime.utcnow()
    db.commit()

    return {"mensaje": "Avatar equipado exitosamente.", "avatar_id": datos.avatar_id}
