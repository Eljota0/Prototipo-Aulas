from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.academic_closure import cerrar_retos_vencidos
from app.core.persistence import confirmar_transaccion
from app.database import get_db
from app.models.models import Notificacion, Usuario
from app.schemas.notificacion import NotificacionResponse

router = APIRouter()


@router.get("/", response_model=List[NotificacionResponse])
def mis_notificaciones(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> Any:
    if cerrar_retos_vencidos(db, anfitrion_id=current_user.id):
        confirmar_transaccion(
            db, "No se pudo actualizar el estado de las actividades. Vuelve a intentarlo."
        )
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
    confirmar_transaccion(
        db, "No se pudieron marcar las notificaciones como leídas. Vuelve a intentarlo."
    )
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
    confirmar_transaccion(
        db, "No se pudo marcar la notificación como leída. Vuelve a intentarlo."
    )
    db.refresh(notificacion)
    return notificacion
