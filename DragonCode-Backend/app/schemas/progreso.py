from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from typing import Optional
from uuid import UUID

class GuardarProgresoRequest(BaseModel):
    """Datos que el frontend envía al terminar un nivel."""
    model_config = ConfigDict(extra="forbid")

    reto_nivel_id:   int = Field(gt=0, strict=True)
    tiempo_segundos: int = Field(ge=0, le=86400, strict=True)
    intentos:        int = Field(ge=1, le=1000, strict=True)
    codigo_solucion: str = Field(min_length=1, max_length=20000, strict=True)
    vidas_restantes: int = Field(ge=1, le=3, strict=True)
    ayudas_usadas: bool = Field(strict=True)
    aula_id:         Optional[str] = None
    reto_personalizado_id: Optional[str] = None

    @field_validator("aula_id", "reto_personalizado_id")
    @classmethod
    def validar_identificador(cls, valor):
        return str(UUID(valor)) if valor is not None else None

    @model_validator(mode="after")
    def validar_contexto_aula(self):
        if self.reto_personalizado_id is not None and self.aula_id is None:
            raise ValueError("Una entrega de actividad debe indicar también su aula.")
        return self

class ProgresoResponse(BaseModel):
    """Respuesta del servidor al guardar el progreso."""
    model_config = ConfigDict(from_attributes=True)

    mensaje: str
    estrellas_obtenidas: int
    estrellas_totales_usuario: int
    es_primera_vez: bool
