from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator, model_validator
from typing import Annotated, Dict, Literal, Optional, List, Union
from datetime import datetime
from app.models.models import EstadoAula, EstadoReto, TipoReto
from app.core.academic import fecha_utc_para_respuesta
from app.core.validation import normalizar_texto_visible

# Aulas

class AulaCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nombre_aula: str = Field(min_length=1, max_length=100, strict=True)

    @field_validator("nombre_aula", mode="before")
    @classmethod
    def normalizar_nombre(cls, valor):
        return normalizar_texto_visible(valor, "El nombre del aula")

class AulaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    nombre_aula: str
    codigo_acceso: str
    estado: EstadoAula
    fecha_creacion: datetime
    anfitrion_id: str

    @field_serializer("fecha_creacion", when_used="json")
    def serializar_fecha_creacion(self, fecha):
        return fecha_utc_para_respuesta(fecha)

class AulaDetalleResponse(AulaResponse):
    total_jugadores: int = 0
    actividades_pendientes: Optional[bool] = None

# Acceso y participantes

class UnirseAulaRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    codigo_acceso: str = Field(pattern=r"^[A-Z0-9]{6}$", strict=True)

    @field_validator("codigo_acceso", mode="before")
    @classmethod
    def normalizar_codigo(cls, valor):
        if not isinstance(valor, str):
            raise ValueError("El código de acceso debe ser texto.")
        return valor.strip().upper()

class JugadorEnAulaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    jugador_id: str
    nombre: str
    apellido: str
    email: str
    estrellas_totales: int
    fecha_ingreso: datetime

    @field_serializer("fecha_ingreso", when_used="json")
    def serializar_fecha_ingreso(self, fecha):
        return fecha_utc_para_respuesta(fecha)

# Niveles oficiales

class RetoNivelResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    orden: int
    titulo: str
    descripcion: str
    tipo_reto: str
    recompensa_estrellas: int

# Actividades creadas por el profesor

class CasillaNivelUno(BaseModel):
    model_config = ConfigDict(extra="forbid")

    x: int = Field(ge=0, le=9, strict=True)
    y: int = Field(ge=0, le=6, strict=True)
    zona: Literal["superior", "editable", "inferior"]
    terreno: Literal["vacio", "suelo", "sueloroto", "suelo-ogro", "salida", "meta-ogro"]
    objeto: Literal["ninguno", "roca", "cofre"]
    tieneFilo: bool = False
    rotacionTerreno: Literal[0, 90, 180, 270] = 0
    estadoAnimacion: Literal["normal", "colapsando", "colision", "temblando"] = "normal"

    @model_validator(mode="after")
    def validar_objeto_sobre_suelo(self):
        if self.objeto != "ninguno" and self.terreno != "suelo":
            raise ValueError("Las rocas y cofres deben estar colocados sobre suelo normal.")
        return self


class MapaNivelUno(BaseModel):
    model_config = ConfigDict(extra="forbid")

    idNivel: int = Field(ge=1, le=5, strict=True)
    filasEditables: int = Field(ge=2, le=5, strict=True)
    columnas: int = Field(ge=2, le=10, strict=True)
    matriz: List[List[CasillaNivelUno]] = Field(min_length=4, max_length=7)

    @model_validator(mode="after")
    def validar_tablero(self):
        if len(self.matriz) != self.filasEditables + 2:
            raise ValueError("La cantidad de filas no coincide con el tamaño configurado.")

        apariciones_inicio = 0
        apariciones_meta = 0
        ultima_fila = len(self.matriz) - 1
        for y, fila in enumerate(self.matriz):
            if len(fila) != self.columnas:
                raise ValueError("Todas las filas del mapa deben tener el mismo número de columnas.")
            zona_esperada = "superior" if y == 0 else "inferior" if y == ultima_fila else "editable"
            for x, casilla in enumerate(fila):
                if casilla.x != x or casilla.y != y or casilla.zona != zona_esperada:
                    raise ValueError("Las coordenadas o zonas del mapa no son válidas.")
                apariciones_inicio += int(casilla.terreno == "suelo-ogro")
                apariciones_meta += int(casilla.terreno in {"salida", "meta-ogro"})
                if casilla.terreno in {"salida", "meta-ogro"} and casilla.zona != "inferior":
                    raise ValueError("La meta debe permanecer en la fila inferior.")

        if apariciones_inicio != 1 or apariciones_meta != 1:
            raise ValueError("Cada mapa necesita exactamente un inicio y una meta.")
        return self


class CampanaNivelUno(BaseModel):
    model_config = ConfigDict(extra="forbid")

    totalNiveles: int = Field(ge=1, le=5, strict=True)
    niveles: List[MapaNivelUno] = Field(min_length=1, max_length=5)

    @model_validator(mode="after")
    def validar_campana(self):
        if len(self.niveles) != self.totalNiveles:
            raise ValueError("La cantidad de mapas no coincide con el total indicado.")
        if [nivel.idNivel for nivel in self.niveles] != list(range(1, self.totalNiveles + 1)):
            raise ValueError("Los mapas deben estar ordenados y numerados consecutivamente.")
        return self


class ConfiguracionNivelUno(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version: Literal[1] = 1
    nivel_id: Literal[1] = 1
    tipo: Literal["mapa_ogro"] = "mapa_ogro"
    max_vidas: int = Field(default=3, ge=1, le=10, strict=True)
    campana: CampanaNivelUno

class ConfiguracionNivelDos(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version: Literal[1] = 1
    nivel_id: Literal[2] = 2
    tipo: Literal["sensores_taladro"] = "sensores_taladro"
    umbral_temperatura: int = Field(default=100, ge=50, le=200, strict=True)
    presion_objetivo: int = Field(default=50, ge=20, le=100, strict=True)
    profundidad_objetivo: int = Field(default=500, ge=200, le=600, strict=True)


class ConfiguracionNivelTres(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version: Literal[1] = 1
    nivel_id: Literal[3] = 3
    tipo: Literal["variables_cueva"] = "variables_cueva"
    distractores_por_fase: int = Field(default=3, ge=0, le=4, strict=True)


class ConfiguracionNivelFabrica(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version: Literal[1] = 1
    nivel_id: Literal[4, 5]
    tipo: Literal["materiales_fabrica"] = "materiales_fabrica"
    materiales_por_fase: Dict[
        str,
        List[Literal["Carbon", "Diamante", "Explosivo"]],
    ]

    @field_validator("materiales_por_fase")
    @classmethod
    def validar_materiales_por_fase(cls, fases):
        claves_validas = {"1", "2", "3", "4"}
        if not fases or not set(fases).issubset(claves_validas):
            raise ValueError("La configuración contiene una fase desconocida.")
        for materiales in fases.values():
            if not 1 <= len(materiales) <= 10:
                raise ValueError("Cada fase debe contener entre 1 y 10 materiales.")
        return fases

    @model_validator(mode="after")
    def validar_materiales_compatibles(self):
        permitidos = {
            "1": {"Diamante"},
            "2": {"Carbon", "Explosivo"},
            "3": {"Diamante", "Explosivo"},
            "4": {"Carbon", "Diamante", "Explosivo"},
        }
        for fase, materiales in self.materiales_por_fase.items():
            if not set(materiales).issubset(permitidos[fase]):
                raise ValueError(
                    f"La fase {fase} contiene un material que todavía no enseña a procesar."
                )
        return self


ConfiguracionNivelAula = Annotated[
    Union[
        ConfiguracionNivelUno,
        ConfiguracionNivelDos,
        ConfiguracionNivelTres,
        ConfiguracionNivelFabrica,
    ],
    Field(discriminator="tipo"),
]

class ParametrosEvaluacion(BaseModel):
    """Parámetros de dificultad que el profesor puede ajustar sobre un nivel existente."""
    model_config = ConfigDict(extra="forbid")

    tiempo_3_estrellas: int = Field(default=60, ge=10, le=300, strict=True)
    tiempo_2_estrellas: int = Field(default=120, ge=20, le=600, strict=True)
    intentos_max_sin_penalidad: int = Field(default=2, ge=1, le=10, strict=True)
    anti_copia: bool = Field(default=False, strict=True)
    # Se conserva por compatibilidad con clientes anteriores. En las aulas el
    # backend siempre lo normaliza a False; las ayudas pertenecen a Aventura.
    ayudas_habilitadas: bool = Field(default=False, strict=True)
    fases_seleccionadas: Optional[List[int]] = Field(default=None, min_length=1, max_length=4)
    configuracion_nivel: Optional[ConfiguracionNivelAula] = None

    @field_validator("fases_seleccionadas")
    @classmethod
    def validar_fases(cls, fases):
        if fases is None:
            return fases
        if any(type(fase) is not int or fase not in range(1, 5) for fase in fases):
            raise ValueError("Las fases deben ser números enteros del 1 al 4.")
        if len(fases) != len(set(fases)):
            raise ValueError("No se puede seleccionar una fase más de una vez.")
        return fases

    @model_validator(mode="after")
    def validar_umbrales(self):
        if self.tiempo_3_estrellas >= self.tiempo_2_estrellas:
            raise ValueError("El tiempo de 3 estrellas debe ser menor al de 2 estrellas.")
        return self

class RetoPersonalizadoCreate(BaseModel):
    """Datos para crear un reto personalizado dentro de un aula."""
    model_config = ConfigDict(extra="forbid")

    reto_nivel_id: int = Field(gt=0, strict=True)
    titulo: str = Field(min_length=1, max_length=160, strict=True)
    recompensa_estrellas: int = Field(default=5, ge=0, le=100, strict=True)
    parametros: ParametrosEvaluacion = Field(default_factory=ParametrosEvaluacion)
    fecha_limite: Optional[datetime] = None

    @field_validator("titulo", mode="before")
    @classmethod
    def normalizar_titulo(cls, valor):
        return normalizar_texto_visible(valor, "El título de la actividad")

    @model_validator(mode="after")
    def validar_configuracion_del_nivel(self):
        configuracion = self.parametros.configuracion_nivel
        if configuracion and configuracion.nivel_id != self.reto_nivel_id:
            raise ValueError("La configuración no corresponde al nivel seleccionado.")
        return self

class RetoPersonalizadoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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

    @field_validator("parametros_evaluacion", mode="before")
    @classmethod
    def desactivar_ayudas_en_aula(cls, parametros):
        if isinstance(parametros, dict):
            return {**parametros, "ayudas_habilitadas": False}
        return parametros

    @field_serializer("fecha_creacion", "fecha_limite", "fecha_cierre", when_used="json")
    def serializar_fechas(self, fecha):
        return fecha_utc_para_respuesta(fecha)

class ProgramacionRetoUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

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

    @field_serializer("fecha_completado", when_used="json")
    def serializar_fecha_completado(self, fecha):
        return fecha_utc_para_respuesta(fecha)


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

    @field_serializer("fecha_limite", "fecha_cierre", when_used="json")
    def serializar_fechas(self, fecha):
        return fecha_utc_para_respuesta(fecha)


class ReporteAulaResponse(BaseModel):
    aula_id: str
    nombre_aula: str
    generado_en: datetime
    actividades: List[SeguimientoActividadResponse]

    @field_serializer("generado_en", when_used="json")
    def serializar_generado_en(self, fecha):
        return fecha_utc_para_respuesta(fecha)

