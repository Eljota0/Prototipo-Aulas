from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Any

from app.database import get_db
from app.models.models import ProgresoJugador, RetoNivel, Usuario, RetoPersonalizado, ProgresoAula
from app.schemas.progreso import GuardarProgresoRequest, ProgresoResponse
from app.core.deps import get_current_user

router = APIRouter()

# ------------------------------------------------------------------
# LÓGICA DE CALIFICACIÓN: Calcula estrellas según el rendimiento
# ------------------------------------------------------------------
def calcular_estrellas(tiempo_segundos: int, intentos: int, parametros: dict) -> int:
    """
    Lógica de calificación basada en los parámetros del nivel.
    Los parámetros se guardan en la BD en la columna 'parametros_evaluacion' del RetoNivel.
    
    Ejemplo de parámetros:
    {
      "tiempo_3_estrellas": 60,   -> Completa en menos de 60s = 3 estrellas
      "tiempo_2_estrellas": 120,  -> Completa en menos de 120s = 2 estrellas
      "intentos_max_sin_penalidad": 2  -> Más de 2 intentos = -1 estrella
    }
    """
    # Extraer parámetros con valores por defecto seguros
    t3 = parametros.get("tiempo_3_estrellas", 60)
    t2 = parametros.get("tiempo_2_estrellas", 120)
    penalidad_intentos = parametros.get("intentos_max_sin_penalidad", 3)

    # Calcular base de estrellas por tiempo
    if tiempo_segundos <= t3:
        estrellas = 3
    elif tiempo_segundos <= t2:
        estrellas = 2
    else:
        estrellas = 1

    # Aplicar penalidad por intentos excesivos
    if intentos > penalidad_intentos:
        estrellas = max(1, estrellas - 1)

    return estrellas


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
            query = query.filter(RetoPersonalizado.tipo_reto == reto.tipo_reto)
            
        reto_personalizado = query.first()
        if reto_personalizado:
            parametros = reto_personalizado.parametros_evaluacion or parametros

    # 2. Calcular las estrellas ganadas en este intento
    estrellas_ganadas = calcular_estrellas(
        datos.tiempo_segundos,
        datos.intentos,
        parametros
    )

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
            fecha_completado=datetime.utcnow()
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
            progreso_existente.fecha_completado = datetime.utcnow()

        # Si el resultado es igual o peor, no tocamos nada (pero sí actualizamos intentos)
        progreso_existente.intentos += 1

    # 3.5 Guardar o actualizar progreso de aula si existe reto_personalizado
    if datos.aula_id and 'reto_personalizado' in locals() and reto_personalizado:
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
                intentos=datos.intentos,
                tiempo_segundos=datos.tiempo_segundos,
                codigo_solucion=datos.codigo_solucion,
                fecha_completado=datetime.utcnow()
            )
            db.add(nuevo_progreso_aula)
        else:
            if estrellas_ganadas > progreso_aula.estrellas_obtenidas:
                progreso_aula.estrellas_obtenidas = estrellas_ganadas
                progreso_aula.tiempo_segundos = datos.tiempo_segundos
                progreso_aula.codigo_solucion = datos.codigo_solucion
                progreso_aula.fecha_completado = datetime.utcnow()
            progreso_aula.intentos += 1

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
