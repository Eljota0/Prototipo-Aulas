from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.academic import (
    ahora_utc,
    calcular_resumen_calificaciones,
    estado_academico,
    normalizar_fecha_utc,
)
from app.core.deps import get_current_user
from app.core.scoring import calcular_calificacion
from app.database import get_db
from app.models.models import (
    AulaJugador,
    AulaVirtual,
    Notificacion,
    ProgresoAula,
    RetoPersonalizado,
    Usuario,
)
from app.schemas.aula import (
    ProgramacionRetoUpdate,
    ReporteAulaResponse,
    RetoPersonalizadoResponse,
    SeguimientoActividadResponse,
    SeguimientoJugadorResponse,
)

router = APIRouter()


def _obtener_aula_del_anfitrion(aula_id: str, usuario_id: str, db: Session) -> AulaVirtual:
    aula = db.query(AulaVirtual).filter(
        AulaVirtual.id == aula_id,
        AulaVirtual.anfitrion_id == usuario_id,
    ).first()
    if not aula:
        raise HTTPException(status_code=404, detail="Aula no encontrada o no tienes permiso.")
    return aula


def _obtener_reto_del_aula(aula_id: str, reto_id: str, db: Session) -> RetoPersonalizado:
    reto = db.query(RetoPersonalizado).filter(
        RetoPersonalizado.id == reto_id,
        RetoPersonalizado.aula_id == aula_id,
    ).first()
    if not reto:
        raise HTTPException(status_code=404, detail="Actividad no encontrada en el aula.")
    return reto


@router.patch(
    "/{aula_id}/retos/{reto_id}/programacion",
    response_model=RetoPersonalizadoResponse,
)
def actualizar_programacion_reto(
    aula_id: str,
    reto_id: str,
    datos: ProgramacionRetoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> Any:
    """Define, reemplaza o elimina la fecha límite de una actividad."""
    _obtener_aula_del_anfitrion(aula_id, current_user.id, db)
    reto = _obtener_reto_del_aula(aula_id, reto_id, db)
    if reto.fecha_cierre is not None:
        raise HTTPException(status_code=409, detail="No se puede reprogramar una actividad cerrada.")
    reto.fecha_limite = normalizar_fecha_utc(datos.fecha_limite)
    db.commit()
    db.refresh(reto)
    return reto


@router.post(
    "/{aula_id}/retos/{reto_id}/cerrar",
    response_model=RetoPersonalizadoResponse,
)
def cerrar_reto(
    aula_id: str,
    reto_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> Any:
    """Cierra una actividad e informa a los estudiantes que siguen pendientes."""
    aula = _obtener_aula_del_anfitrion(aula_id, current_user.id, db)
    reto = _obtener_reto_del_aula(aula_id, reto_id, db)

    if reto.fecha_cierre is None:
        reto.fecha_cierre = ahora_utc()

        inscripciones = db.query(AulaJugador).filter(AulaJugador.aula_id == aula_id).all()
        completados = {
            progreso.jugador_id
            for progreso in db.query(ProgresoAula).filter(
                ProgresoAula.reto_personalizado_id == reto_id,
                ProgresoAula.completado == True,
            ).all()
        }
        for inscripcion in inscripciones:
            if inscripcion.jugador_id not in completados:
                db.add(Notificacion(
                    usuario_id=inscripcion.jugador_id,
                    titulo="Actividad cerrada",
                    mensaje=(
                        f"La actividad '{reto.titulo}' del aula '{aula.nombre_aula}' "
                        "se cerró sin una entrega registrada."
                    ),
                ))

        db.commit()
        db.refresh(reto)

    return reto


@router.get("/{aula_id}/seguimiento", response_model=ReporteAulaResponse)
def seguimiento_aula(
    aula_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> ReporteAulaResponse:
    """Genera el reporte académico completo que consumirá el futuro frontend."""
    aula = _obtener_aula_del_anfitrion(aula_id, current_user.id, db)
    inscripciones = db.query(AulaJugador).filter(AulaJugador.aula_id == aula_id).all()
    retos = db.query(RetoPersonalizado).filter(
        RetoPersonalizado.aula_id == aula_id,
    ).order_by(RetoPersonalizado.fecha_creacion).all()

    actividades = []
    for reto in retos:
        progresos = db.query(ProgresoAula).filter(
            ProgresoAula.reto_personalizado_id == reto.id,
        ).all()
        progreso_por_jugador = {p.jugador_id: p for p in progresos}

        jugadores = []
        calificaciones = []
        for inscripcion in inscripciones:
            jugador = inscripcion.jugador
            progreso = progreso_por_jugador.get(jugador.id)
            completado = bool(progreso and progreso.completado)
            calificacion = 0
            if completado:
                calificacion = progreso.calificacion_numerica or calcular_calificacion(
                    progreso.intentos or 1,
                )
                calificaciones.append(calificacion)

            jugadores.append(SeguimientoJugadorResponse(
                jugador_id=jugador.id,
                nombre=jugador.nombre,
                apellido=jugador.apellido,
                email=jugador.email,
                completado=completado,
                estrellas_obtenidas=(progreso.estrellas_obtenidas or 0) if progreso else 0,
                calificacion_numerica=calificacion,
                intentos=(progreso.intentos or 0) if progreso else 0,
                tiempo_segundos=(progreso.tiempo_segundos or 0) if progreso else 0,
                codigo_solucion=progreso.codigo_solucion if progreso else None,
                fecha_completado=progreso.fecha_completado if progreso else None,
            ))

        resumen = calcular_resumen_calificaciones(calificaciones, len(inscripciones))
        estado_base = reto.estado.value if hasattr(reto.estado, "value") else str(reto.estado)
        actividades.append(SeguimientoActividadResponse(
            reto_id=reto.id,
            reto_nivel_id=reto.reto_nivel_id,
            titulo=reto.titulo,
            estado=estado_academico(
                estado_base,
                reto.fecha_limite,
                reto.fecha_cierre,
            ),
            fecha_limite=reto.fecha_limite,
            fecha_cierre=reto.fecha_cierre,
            jugadores=jugadores,
            **resumen,
        ))

    return ReporteAulaResponse(
        aula_id=aula.id,
        nombre_aula=aula.nombre_aula,
        generado_en=ahora_utc(),
        actividades=actividades,
    )
