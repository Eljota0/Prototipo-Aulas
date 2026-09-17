from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator, model_validator
from typing import Optional, List
from datetime import datetime
from app.core.academic import fecha_utc_para_respuesta
from app.core.validation import normalizar_texto_visible


class ActualizarPerfilRequest(BaseModel):
    """Edición parcial de los nombres; los demás datos tienen flujos propios."""

    model_config = ConfigDict(extra="forbid")

    nombre: Optional[str] = Field(default=None, strict=True, min_length=1, max_length=100)
    apellido: Optional[str] = Field(default=None, strict=True, min_length=1, max_length=100)

    @field_validator("nombre", "apellido", mode="before")
    @classmethod
    def normalizar_nombre(cls, valor):
        return normalizar_texto_visible(valor, "El nombre o apellido")

    @model_validator(mode="after")
    def exigir_campo(self):
        if not self.model_fields_set:
            raise ValueError("Envía al menos el nombre o el apellido para actualizar el perfil.")
        return self

class PerfilResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    nombre: str
    apellido: str
    rol: str
    estrellas_totales: int
    avatar_actual_id: Optional[int] = None
    avatares_desbloqueados: Optional[List[int]] = Field(default_factory=list)
    ultimo_acceso: datetime
    fecha_registro: datetime

    @field_serializer("ultimo_acceso", "fecha_registro", when_used="json")
    def serializar_fechas(self, fecha):
        return fecha_utc_para_respuesta(fecha)

class AvatarResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre_skin: str
    url_imagen: str
    precio_estrellas: int
    activo: bool
    desbloqueado: bool = False

class EquiparAvatarRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    avatar_id: int = Field(gt=0, strict=True)
