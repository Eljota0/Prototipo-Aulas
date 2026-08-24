from datetime import datetime, timezone
from typing import Iterable, Optional


def ahora_utc() -> datetime:
    """Retorna UTC sin zona para conservar compatibilidad con las columnas existentes."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def normalizar_fecha_utc(fecha: Optional[datetime]) -> Optional[datetime]:
    """Convierte fechas con zona a UTC y mantiene fechas antiguas como UTC."""
    if fecha is None:
        return None
    if fecha.tzinfo is None:
        return fecha
    return fecha.astimezone(timezone.utc).replace(tzinfo=None)


def plazo_vencido(fecha_limite: Optional[datetime], ahora: Optional[datetime] = None) -> bool:
    if fecha_limite is None:
        return False
    return normalizar_fecha_utc(fecha_limite) <= normalizar_fecha_utc(ahora or ahora_utc())


def estado_academico(
    estado_base: str,
    fecha_limite: Optional[datetime],
    fecha_cierre: Optional[datetime],
    ahora: Optional[datetime] = None,
) -> str:
    if fecha_cierre is not None:
        return "cerrada"
    if plazo_vencido(fecha_limite, ahora):
        return "vencida"
    return estado_base


def calcular_resumen_calificaciones(
    calificaciones: Iterable[int],
    total_jugadores: int,
) -> dict:
    valores = list(calificaciones)
    completados = len(valores)
    promedio = round(sum(valores) / completados, 2) if completados else 0.0
    return {
        "total_jugadores": total_jugadores,
        "completados": completados,
        "pendientes": max(0, total_jugadores - completados),
        "promedio_calificacion": promedio,
    }
