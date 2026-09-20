"""Cierre idempotente de actividades vencidas y generación de su resumen final."""

from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.core.academic import (
    ahora_utc,
    calcular_resumen_calificaciones,
    normalizar_fecha_utc,
    plazo_vencido,
)
from app.core.scoring import calcular_calificacion
from app.models.models import (
    AulaJugador,
    AulaVirtual,
    EstadoReto,
    Notificacion,
    ProgresoAula,
    RetoPersonalizado,
    Usuario,
)


def cerrar_retos_vencidos(
    db: Session,
    *,
    aula_id: Optional[str] = None,
    anfitrion_id: Optional[str] = None,
    ahora: Optional[datetime] = None,
) -> int:
    """Marca vencimientos y crea avisos una sola vez dentro de la transacción actual.

    El llamador decide cuándo confirmar. En PostgreSQL el bloqueo de fila evita
    duplicar el reporte cuando dos peticiones detectan el mismo vencimiento.
    """
    momento = normalizar_fecha_utc(ahora or ahora_utc())
    consulta = db.query(RetoPersonalizado).join(
        AulaVirtual, AulaVirtual.id == RetoPersonalizado.aula_id
    ).filter(
        RetoPersonalizado.estado == EstadoReto.publicado,
        RetoPersonalizado.fecha_cierre.is_(None),
        RetoPersonalizado.fecha_limite.is_not(None),
        RetoPersonalizado.fecha_limite <= momento,
    )
    if aula_id is not None:
        consulta = consulta.filter(RetoPersonalizado.aula_id == aula_id)
    if anfitrion_id is not None:
        consulta = consulta.filter(AulaVirtual.anfitrion_id == anfitrion_id)

    cerrados = 0
    for reto in consulta.with_for_update().all():
        # Revalidar después de adquirir el bloqueo para mantener idempotencia.
        if reto.fecha_cierre is not None or not plazo_vencido(reto.fecha_limite, momento):
            continue
        aula = db.query(AulaVirtual).filter(AulaVirtual.id == reto.aula_id).first()
        if aula is None:
            continue

        inscripciones = db.query(AulaJugador).filter(
            AulaJugador.aula_id == aula.id
        ).all()
        progresos = db.query(ProgresoAula).filter(
            ProgresoAula.reto_personalizado_id == reto.id,
            ProgresoAula.completado == True,
        ).all()
        progreso_por_jugador = {progreso.jugador_id: progreso for progreso in progresos}
        calificaciones = [
            progreso.calificacion_numerica
            or calcular_calificacion(progreso.intentos or 1)
            for progreso in progresos
        ]
        resumen = calcular_resumen_calificaciones(calificaciones, len(inscripciones))

        # La actividad terminó en su fecha límite, aunque se materialice después.
        reto.fecha_cierre = normalizar_fecha_utc(reto.fecha_limite)
        for inscripcion in inscripciones:
            if inscripcion.jugador_id not in progreso_por_jugador:
                db.add(Notificacion(
                    usuario_id=inscripcion.jugador_id,
                    titulo="Actividad vencida",
                    mensaje=(
                        f"La actividad '{reto.titulo}' del aula '{aula.nombre_aula}' "
                        "finalizó sin una entrega registrada."
                    ),
                ))

        db.add(Notificacion(
            usuario_id=aula.anfitrion_id,
            titulo="Reporte final disponible",
            mensaje=(
                f"La actividad '{reto.titulo}' del aula '{aula.nombre_aula}' finalizó: "
                f"{resumen['completados']}/{resumen['total_jugadores']} entregas, "
                f"{resumen['pendientes']} pendiente(s) y promedio "
                f"{resumen['promedio_calificacion']}/10."
            ),
        ))

        # Preparar lista de alumnos para el correo
        lista_alumnos = []
        jugadores_ids = [insc.jugador_id for insc in inscripciones]
        if jugadores_ids:
            jugadores = db.query(Usuario).filter(Usuario.id.in_(jugadores_ids)).order_by(Usuario.apellido, Usuario.nombre).all()
            for j in jugadores:
                prog = progreso_por_jugador.get(j.id)
                if prog and prog.completado:
                    cal = prog.calificacion_numerica or calcular_calificacion(prog.intentos or 1)
                    estado_texto = f"{cal}/10"
                else:
                    estado_texto = "Sin entrega"
                
                lista_alumnos.append({
                    "nombre_completo": f"{j.apellido} {j.nombre}",
                    "calificacion": estado_texto
                })

        fecha_formateada = (reto.fecha_cierre or momento).strftime("%d/%m/%Y")

        # Enviar reporte detallado por correo electrónico al anfitrión
        try:
            from app.core.email import enviar_reporte_actividad
            anfitrion = db.query(Usuario).filter(Usuario.id == aula.anfitrion_id).first()
            if anfitrion:
                enviar_reporte_actividad(
                    email_destino=anfitrion.email,
                    nombre_aula=aula.nombre_aula,
                    titulo_actividad=reto.titulo,
                    fecha_cierre=fecha_formateada,
                    completados=resumen['completados'],
                    total_jugadores=resumen['total_jugadores'],
                    pendientes=resumen['pendientes'],
                    promedio=resumen['promedio_calificacion'],
                    lista_alumnos=lista_alumnos
                )
        except Exception:
            # Un fallo de correo no debe impedir el cierre de la actividad
            pass

        cerrados += 1

    return cerrados
