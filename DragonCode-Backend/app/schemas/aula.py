from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.models import EstadoAula, EstadoReto, TipoReto

# --- Schemas para Aulas ---

class AulaCreate(BaseModel):
    nombre_aula: str

class AulaResponse(BaseModel):
    id: str
    nombre_aula: str
    codigo_acceso: str
    estado: EstadoAula
    fecha_creacion: datetime
    anfitrion_id: str

    class Config:
        from_attributes = True

class AulaDetalleResponse(AulaResponse):
    total_jugadores: int = 0
    actividades_pendientes: Optional[bool] = None

# --- Schemas para unirse a un Aula ---

class UnirseAulaRequest(BaseModel):
    codigo_acceso: str

class JugadorEnAulaResponse(BaseModel):
    jugador_id: str
    nombre: str
    apellido: str
    email: str
    estrellas_totales: int
    fecha_ingreso: datetime

    class Config:
        from_attributes = True

# --- Schemas para Retos / Niveles ---

class RetoNivelResponse(BaseModel):
    id: int
    orden: int
    titulo: str
    descripcion: str
    tipo_reto: str
    recompensa_estrellas: int

    class Config:
        from_attributes = True

# --- Schemas para Reto Personalizado (Aula del Profesor) ---

class ParametrosEvaluacion(BaseModel):
    """Parámetros de dificultad que el profesor puede ajustar sobre un nivel existente."""
    tiempo_3_estrellas: int = 60    # Segundos máximos para obtener 3 estrellas
    tiempo_2_estrellas: int = 120   # Segundos máximos para obtener 2 estrellas
    intentos_max_sin_penalidad: int = 2
    anti_copia: bool = False
    fases_seleccionadas: Optional[List[int]] = None

class RetoPersonalizadoCreate(BaseModel):
    """Datos para crear un reto personalizado dentro de un aula."""
    reto_nivel_id: int              # ID del nivel oficial que se reutiliza (ej: 1 = El Ogro)
    titulo: str                     # Título descriptivo (ej: "Evaluación Semana 3")
    recompensa_estrellas: int = 5
    parametros: ParametrosEvaluacion = Field(default_factory=ParametrosEvaluacion)
    fecha_limite: Optional[datetime] = None

class RetoPersonalizadoResponse(BaseModel):
    id: str
    aula_id: str
    reto_nivel_id: int
    titulo: str
    estado: EstadoReto
    tipo_reto: str
    recompensa_estrellas: int
    parametros_evaluacion: dict
    fecha_creacion: datetime
    fecha_limite: Optional[datetime] = None
    fecha_cierre: Optional[datetime] = None
    completado: bool = False

    class Config:
        from_attributes = True


class ProgramacionRetoUpdate(BaseModel):
    fecha_limite: Optional[datetime]


class SeguimientoJugadorResponse(BaseModel):
    jugador_id: str
    nombre: str
    apellido: str
    email: str
    completado: bool
    estrellas_obtenidas: int = 0
    calificacion_numerica: int = 0
    intentos: int = 0
    tiempo_segundos: int = 0
    codigo_solucion: Optional[str] = None
    fecha_completado: Optional[datetime] = None


class SeguimientoActividadResponse(BaseModel):
    reto_id: str
    reto_nivel_id: int
    titulo: str
    estado: str
    fecha_limite: Optional[datetime] = None
    fecha_cierre: Optional[datetime] = None
    total_jugadores: int
    completados: int
    pendientes: int
    promedio_calificacion: float
    jugadores: List[SeguimientoJugadorResponse]


class ReporteAulaResponse(BaseModel):
    aula_id: str
    nombre_aula: str
    generado_en: datetime
    actividades: List[SeguimientoActividadResponse]

