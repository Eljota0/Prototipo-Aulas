from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Any

from app.database import get_db
from app.models.models import (
    ProgresoJugador,
    RetoNivel,
    Usuario,
    RetoPersonalizado,
    ProgresoAula,
    AulaVirtual,
    Notificacion,
)
from app.schemas.progreso import GuardarProgresoRequest, ProgresoResponse
from app.core.deps import get_current_user
from app.core.scoring import calcular_calificacion, calcular_estrellas
from app.core.academic import ahora_utc, plazo_vencido

router = APIRouter()

# ------------------------------------------------------------------
# GUARDAR PROGRESO DE UN NIVEL (Modo Aventura)
# ------------------------------------------------------------------
@router.post("/guardar", response_model=ProgresoResponse)
def guardar_progreso(
    datos: GuardarProgresoRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> Any:
    """
    Guarda el resultado de un nivel completado.
    - Si ya existe progreso previo, solo actualiza si el nuevo puntaje es mejor.
    - Suma las estrellas SOLO en el primer intento exitoso para no inflar el contador.
    """
    # 1. Verificar que el nivel existe en la BD
    reto = db.query(RetoNivel).filter(RetoNivel.id == datos.reto_nivel_id).first()
    if not reto:
        raise HTTPException(status_code=404, detail="Nivel no encontrado.")

    # 1.5 Si el jugador está en un aula, obtener los parámetros personalizados
    parametros = reto.parametros_evaluacion or {}
    reto_personalizado = None
    if datos.aula_id:
        query = db.query(RetoPersonalizado).filter(RetoPersonalizado.aula_id == datos.aula_id)
        if datos.reto_personalizado_id:
            query = query.filter(RetoPersonalizado.id == datos.reto_personalizado_id)
        else:
            query = query.filter(RetoPersonalizado.reto_nivel_id == datos.reto_nivel_id)
            
        reto_personalizado = query.first()
        if not reto_personalizado:
            raise HTTPException(
                status_code=404,
                detail="La actividad indicada no existe o no pertenece al aula.",
            )
        if reto_personalizado.reto_nivel_id != datos.reto_nivel_id:
            raise HTTPException(
                status_code=409,
                detail="La actividad no corresponde al nivel enviado.",
            )
        if reto_personalizado.fecha_cierre is not None or plazo_vencido(reto_personalizado.fecha_limite):
            raise HTTPException(
                status_code=409,
                detail="La actividad está cerrada o su fecha límite ya venció.",
            )
        parametros = reto_personalizado.parametros_evaluacion or parametros

    # 2. Calcular las estrellas ganadas en este intento
    estrellas_ganadas = calcular_estrellas(
        datos.tiempo_segundos,
        datos.intentos,
        parametros
    )
    calificacion_numerica = calcular_calificacion(datos.intentos)

    # 3. Buscar si ya existe un registro previo de este jugador en este nivel
    progreso_existente = db.query(ProgresoJugador).filter(
        ProgresoJugador.jugador_id == current_user.id,
        ProgresoJugador.reto_nivel_id == datos.reto_nivel_id
    ).first()

    es_primera_vez = progreso_existente is None or not progreso_existente.completado

    if progreso_existente is None:
        # PRIMER INTENTO: Crear un registro nuevo
        nuevo_progreso = ProgresoJugador(
            jugador_id=current_user.id,
            reto_nivel_id=datos.reto_nivel_id,
            completado=True,
            estrellas_obtenidas=estrellas_ganadas,
            intentos=datos.intentos,
            tiempo_segundos=datos.tiempo_segundos,
            codigo_solucion=datos.codigo_solucion,
            fecha_completado=ahora_utc()
        )
        db.add(nuevo_progreso)
        # Sumar estrellas al perfil del usuario (primera vez)
        current_user.estrellas_totales += estrellas_ganadas

    else:
        # INTENTO POSTERIOR: Solo actualizar si el nuevo resultado es mejor
        if estrellas_ganadas > progreso_existente.estrellas_obtenidas:
            # La diferencia de estrellas es la ganancia real
            diferencia = estrellas_ganadas - progreso_existente.estrellas_obtenidas
            current_user.estrellas_totales += diferencia

            progreso_existente.estrellas_obtenidas = estrellas_ganadas
            progreso_existente.tiempo_segundos = datos.tiempo_segundos
            progreso_existente.intentos = datos.intentos
            progreso_existente.codigo_solucion = datos.codigo_solucion
            progreso_existente.fecha_completado = ahora_utc()

        # Si el resultado es igual o peor, se conserva íntegro el mejor
        # registro. ``intentos`` describe ese intento guardado, no la cantidad
        # histórica de veces que el usuario volvió a jugar el nivel.

    # 3.5 Guardar o actualizar progreso de aula si existe reto_personalizado
    if datos.aula_id and reto_personalizado:
        progreso_aula = db.query(ProgresoAula).filter(
            ProgresoAula.jugador_id == current_user.id,
            ProgresoAula.reto_personalizado_id == reto_personalizado.id
        ).first()

        if not progreso_aula:
            nuevo_progreso_aula = ProgresoAula(
                jugador_id=current_user.id,
                reto_personalizado_id=reto_personalizado.id,
                completado=True,
                estrellas_obtenidas=estrellas_ganadas,
                calificacion_numerica=calificacion_numerica,
                intentos=datos.intentos,
                tiempo_segundos=datos.tiempo_segundos,
                codigo_solucion=datos.codigo_solucion,
                fecha_completado=ahora_utc()
            )
            db.add(nuevo_progreso_aula)

            aula = db.query(AulaVirtual).filter(AulaVirtual.id == datos.aula_id).first()
            if aula:
                db.add(Notificacion(
                    usuario_id=aula.anfitrion_id,
                    titulo="Actividad entregada",
                    mensaje=(
                        f"{current_user.nombre} {current_user.apellido} completó "
                        f"'{reto_personalizado.titulo}' con calificación {calificacion_numerica}."
                    ),
                ))
        else:
            mejora_estrellas = estrellas_ganadas > (progreso_aula.estrellas_obtenidas or 0)
            mejora_calificacion = calificacion_numerica > (progreso_aula.calificacion_numerica or 0)
            if mejora_estrellas or mejora_calificacion:
                if mejora_estrellas:
                    progreso_aula.estrellas_obtenidas = estrellas_ganadas
                if mejora_calificacion:
                    progreso_aula.calificacion_numerica = calificacion_numerica
                progreso_aula.intentos = datos.intentos
                progreso_aula.tiempo_segundos = datos.tiempo_segundos
                progreso_aula.codigo_solucion = datos.codigo_solucion
                progreso_aula.fecha_completado = ahora_utc()

    # 4. Guardar todos los cambios en la BD en una sola transacción
    db.commit()

    return ProgresoResponse(
        mensaje=f"¡Actividad completada! Obtuviste {estrellas_ganadas} estrella(s)." if datos.aula_id else f"¡Nivel completado! Obtuviste {estrellas_ganadas} estrella(s).",
        estrellas_obtenidas=estrellas_ganadas,
        estrellas_totales_usuario=current_user.estrellas_totales,
        es_primera_vez=es_primera_vez
    )


# ------------------------------------------------------------------
# VER MI PROGRESO COMPLETO (Modo Aventura)
# ------------------------------------------------------------------
@router.get("/mis-niveles")
def mi_progreso(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> Any:
    """Retorna el historial de progreso del jugador en todos los niveles."""
    progresos = db.query(ProgresoJugador).filter(
        ProgresoJugador.jugador_id == current_user.id
    ).all()

    return [
        {
            "reto_nivel_id": p.reto_nivel_id,
            "completado": p.completado,
            "estrellas_obtenidas": p.estrellas_obtenidas,
            "intentos": p.intentos,
            "tiempo_segundos": p.tiempo_segundos,
            "fecha_completado": p.fecha_completado
        }
        for p in progresos
    ]
