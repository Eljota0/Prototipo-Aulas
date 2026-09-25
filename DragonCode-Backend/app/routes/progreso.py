from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import SQLAlchemyError
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
    AulaJugador,
    EstadoAula,
    EstadoReto,
    Notificacion,
)
from app.schemas.progreso import GuardarProgresoRequest, ProgresoResponse
from app.core.deps import get_current_user
from app.core.scoring import calcular_calificacion, calcular_estrellas, calcular_estrellas_aventura
from app.core.academic import ahora_utc, plazo_vencido
from app.core.academic_closure import cerrar_retos_vencidos

router = APIRouter()

@router.post("/guardar", response_model=ProgresoResponse)
def guardar_progreso(
    datos: GuardarProgresoRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> Any:
    """Guarda el mejor resultado sin mezclar Aventura y actividades de aula."""
    reto = db.query(RetoNivel).filter(RetoNivel.id == datos.reto_nivel_id).first()
    if not reto:
        raise HTTPException(status_code=404, detail="Nivel no encontrado.")

    # Aventura es secuencial; las actividades de aula se validan por separado.
    if not datos.aula_id and reto.orden > 1:
        progreso_actual = db.query(ProgresoJugador.id).filter(
            ProgresoJugador.jugador_id == current_user.id,
            ProgresoJugador.reto_nivel_id == reto.id,
            ProgresoJugador.completado == True,
        ).first()
        nivel_anterior = db.query(RetoNivel).filter(
            RetoNivel.orden == reto.orden - 1
        ).first()
        progreso_anterior = nivel_anterior and db.query(ProgresoJugador.id).filter(
            ProgresoJugador.jugador_id == current_user.id,
            ProgresoJugador.reto_nivel_id == nivel_anterior.id,
            ProgresoJugador.completado == True,
        ).first()
        if not progreso_actual and not progreso_anterior:
            raise HTTPException(
                status_code=409,
                detail=f"Completa el Nivel {reto.orden - 1} antes de continuar la aventura.",
            )

    parametros = reto.parametros_evaluacion or {}
    reto_personalizado = None
    if datos.aula_id:
        aula = db.query(AulaVirtual).filter(AulaVirtual.id == datos.aula_id).first()
        if not aula:
            raise HTTPException(status_code=404, detail="Aula no encontrada.")
        inscripcion = db.query(AulaJugador.id).filter(
            AulaJugador.aula_id == aula.id,
            AulaJugador.jugador_id == current_user.id,
        ).first()
        # El dueño mantiene acceso para probar sus actividades; un usuario ajeno no.
        if aula.anfitrion_id != current_user.id and not inscripcion:
            raise HTTPException(status_code=403, detail="No tienes acceso a esta aula. Ingresa con su código antes de entregar.")
        if aula.estado != EstadoAula.activa:
            raise HTTPException(status_code=409, detail="El aula está archivada y no admite entregas.")
        if cerrar_retos_vencidos(db, aula_id=aula.id):
            try:
                db.commit()
            except SQLAlchemyError:
                db.rollback()
                raise HTTPException(
                    status_code=500,
                    detail="No se pudo actualizar el estado de la actividad. Vuelve a intentarlo.",
                ) from None

        query = db.query(RetoPersonalizado).filter(RetoPersonalizado.aula_id == datos.aula_id)
        if datos.reto_personalizado_id:
            reto_personalizado = query.filter(RetoPersonalizado.id == datos.reto_personalizado_id).first()
        else:
            # Compatibilidad con clientes antiguos: no adivinar entre actividades del mismo nivel.
            candidatos = query.filter(RetoPersonalizado.reto_nivel_id == datos.reto_nivel_id).limit(2).all()
            if len(candidatos) > 1:
                raise HTTPException(status_code=409, detail="Hay varias actividades de este nivel. Abre la actividad específica desde el aula.")
            reto_personalizado = candidatos[0] if candidatos else None
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
        if reto_personalizado.estado != EstadoReto.publicado:
            raise HTTPException(status_code=409, detail="La actividad aún no está publicada y no admite entregas.")
        if reto_personalizado.fecha_cierre is not None or plazo_vencido(reto_personalizado.fecha_limite):
            raise HTTPException(
                status_code=409,
                detail="La actividad está cerrada o su fecha límite ya venció.",
            )
        parametros = reto_personalizado.parametros_evaluacion or parametros

        if datos.ayudas_usadas is True:
            raise HTTPException(
                status_code=409,
                detail="Las ayudas no están disponibles en actividades de aula.",
            )

    estrellas_ganadas = calcular_estrellas(datos.vidas_restantes, datos.ayudas_usadas)
    if not datos.aula_id and datos.tarjetas_usadas is not None and datos.vidas_perdidas is not None:
        estrellas_ganadas = calcular_estrellas_aventura(
            reto.orden, datos.ayudas_usadas, datos.tarjetas_usadas,
            datos.vidas_perdidas, datos.intentos,
        )
    calificacion_numerica = calcular_calificacion(datos.intentos)

    # El bloqueo evita descontar o premiar dos veces en solicitudes simultáneas.
    current_user = db.query(Usuario).filter(Usuario.id == current_user.id).populate_existing().with_for_update().one()
    es_primera_vez = False
    if not datos.aula_id:
        progreso_existente = db.query(ProgresoJugador).filter(
            ProgresoJugador.jugador_id == current_user.id,
            ProgresoJugador.reto_nivel_id == datos.reto_nivel_id
        ).first()
        es_primera_vez = progreso_existente is None or not progreso_existente.completado
        anteriores = (progreso_existente.estrellas_obtenidas or 0) if not es_primera_vez else 0
        if progreso_existente is None:
            progreso_existente = ProgresoJugador(
                jugador_id=current_user.id, reto_nivel_id=datos.reto_nivel_id
            )
            db.add(progreso_existente)
        if es_primera_vez or estrellas_ganadas > anteriores:
            current_user.estrellas_totales += estrellas_ganadas - anteriores
            progreso_existente.completado = True
            progreso_existente.estrellas_obtenidas = estrellas_ganadas
            progreso_existente.tiempo_segundos = datos.tiempo_segundos
            progreso_existente.intentos = datos.intentos
            progreso_existente.codigo_solucion = datos.codigo_solucion
            progreso_existente.fecha_completado = ahora_utc()

    if datos.aula_id and reto_personalizado:
        progreso_aula = db.query(ProgresoAula).filter(
            ProgresoAula.jugador_id == current_user.id,
            ProgresoAula.reto_personalizado_id == reto_personalizado.id
        ).first()

        es_primera_vez = progreso_aula is None or not progreso_aula.completado
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

    # El progreso y el saldo se confirman juntos para evitar datos incompletos.
    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="No se pudo guardar el resultado. Tu saldo y progreso no fueron modificados.",
        ) from None

    return ProgresoResponse(
        mensaje=f"¡Actividad completada! Resultado: {estrellas_ganadas} estrella(s). Las actividades no añaden saldo a la tienda." if datos.aula_id else f"¡Nivel completado! Obtuviste {estrellas_ganadas} estrella(s).",
        estrellas_obtenidas=estrellas_ganadas,
        estrellas_totales_usuario=current_user.estrellas_totales,
        es_primera_vez=es_primera_vez
    )


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
            # La interfaz navega por el orden pedagógico, no por la clave
            # interna de la base de datos. Ambos valores se conservan para
            # que el contrato siga siendo compatible con clientes anteriores.
            "nivel_orden": p.reto.orden,
            "completado": p.completado,
            "estrellas_obtenidas": p.estrellas_obtenidas,
            "intentos": p.intentos,
            "tiempo_segundos": p.tiempo_segundos,
            "fecha_completado": p.fecha_completado
        }
        for p in progresos
    ]
