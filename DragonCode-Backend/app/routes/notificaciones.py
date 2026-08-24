from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models.models import Notificacion, Usuario
from app.schemas.notificacion import NotificacionResponse

router = APIRouter()


@router.get("/", response_model=List[NotificacionResponse])
def mis_notificaciones(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> Any:
    return db.query(Notificacion).filter(
        Notificacion.usuario_id == current_user.id,
    ).order_by(Notificacion.fecha_creacion.desc()).all()


@router.patch("/leer-todas")
def leer_todas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> dict:
    actualizadas = db.query(Notificacion).filter(
        Notificacion.usuario_id == current_user.id,
        Notificacion.leida == False,
    ).update({Notificacion.leida: True}, synchronize_session=False)
    db.commit()
    return {"notificaciones_actualizadas": actualizadas}


@router.patch("/{notificacion_id}/leer", response_model=NotificacionResponse)
def leer_notificacion(
    notificacion_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> Any:
    notificacion = db.query(Notificacion).filter(
        Notificacion.id == notificacion_id,
        Notificacion.usuario_id == current_user.id,
    ).first()
    if not notificacion:
        raise HTTPException(status_code=404, detail="Notificación no encontrada.")

    notificacion.leida = True
    db.commit()
    db.refresh(notificacion)
    return notificacion
