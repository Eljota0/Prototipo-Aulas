from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_serializer

from app.core.academic import fecha_utc_para_respuesta


class NotificacionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    titulo: str
    mensaje: str
    leida: bool
    fecha_creacion: datetime

    @field_serializer("fecha_creacion", when_used="json")
    def serializar_fecha_creacion(self, fecha):
        return fecha_utc_para_respuesta(fecha)
