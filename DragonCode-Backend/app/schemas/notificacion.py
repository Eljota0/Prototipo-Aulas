from datetime import datetime

from pydantic import BaseModel


class NotificacionResponse(BaseModel):
    id: str
    titulo: str
    mensaje: str
    leida: bool
    fecha_creacion: datetime

    class Config:
        from_attributes = True
