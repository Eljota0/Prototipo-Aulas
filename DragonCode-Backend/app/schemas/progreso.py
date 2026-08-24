from pydantic import BaseModel, Field
from typing import Optional

# --- Schemas para el guardado de progreso del juego ---

class GuardarProgresoRequest(BaseModel):
    """Datos que el frontend envía al terminar un nivel."""
    reto_nivel_id:   int            # ID del nivel en la BD (ej: 1 para el Ogro)
    tiempo_segundos: int = Field(ge=0) # Segundos que tardó el jugador en completarlo
    intentos:        int = Field(ge=1) # Número de veces que intentó el nivel
    codigo_solucion: str            # El código que escribió el jugador
    aula_id:         Optional[str] = None  # Si existe, el jugador está en modo Aula
    reto_personalizado_id: Optional[str] = None # UUID del reto específico completado en el aula

class ProgresoResponse(BaseModel):
    """Respuesta del servidor al guardar el progreso."""
    mensaje: str
    estrellas_obtenidas: int
    estrellas_totales_usuario: int
    es_primera_vez: bool      # Para saber si fue el primer intento exitoso

    class Config:
        from_attributes = True
