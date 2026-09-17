import secrets
import string
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session
from typing import List, Any

from app.database import get_db
from app.models.models import (
    AulaVirtual,
    AulaJugador,
    Usuario,
    RetoNivel,
    RetoPersonalizado,
    ProgresoAula,
    Notificacion,
    EstadoAula,
    EstadoReto,
)
from app.schemas.aula import (
    AulaCreate, AulaResponse, AulaDetalleResponse,
    UnirseAulaRequest, JugadorEnAulaResponse, RetoNivelResponse,
    RetoPersonalizadoCreate, RetoPersonalizadoResponse
)
from app.core.deps import get_current_user
from app.core.academic import ahora_utc, normalizar_fecha_utc
from app.core.academic_closure import cerrar_retos_vencidos
from app.core.persistence import confirmar_transaccion

router = APIRouter()

def generar_codigo_acceso(longitud: int = 6) -> str:
    """Genera un código de acceso no predecible en mayúsculas."""
    alfabeto = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alfabeto) for _ in range(longitud))

@router.post("/", response_model=AulaResponse, status_code=status.HTTP_201_CREATED)
def crear_aula(
    aula_in: AulaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> Any:
    """Crea un aula y genera un código de acceso que no esté repetido."""
    # La base de datos resuelve el caso poco común de dos códigos iguales.
    for _ in range(10):
        codigo = generar_codigo_acceso()
        nueva_aula = AulaVirtual(
            anfitrion_id=current_user.id,
            nombre_aula=aula_in.nombre_aula,
            codigo_acceso=codigo,
        )
        db.add(nueva_aula)
        try:
            db.commit()
            db.refresh(nueva_aula)
            return nueva_aula
        except IntegrityError:
            db.rollback()
        except SQLAlchemyError:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail="No se pudo crear el aula. Vuelve a intentarlo.",
            ) from None
    raise HTTPException(
        status_code=503,
        detail="No se pudo generar un código de acceso único. Vuelve a intentarlo.",
    )

@router.get("/mis-aulas", response_model=List[AulaDetalleResponse])
def mis_aulas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> Any:
    """Devuelve las aulas creadas por el usuario y aquellas a las que se unió."""
    if cerrar_retos_vencidos(db, anfitrion_id=current_user.id):
        confirmar_transaccion(
            db, "No se pudo actualizar el estado de las actividades. Vuelve a intentarlo."
        )
    # Una cuenta puede crear aulas y también inscribirse en otras.
    aulas_creadas = db.query(AulaVirtual).filter(AulaVirtual.anfitrion_id == current_user.id).all()
    
    inscripciones = db.query(AulaJugador).filter(AulaJugador.jugador_id == current_user.id).all()
    aulas_inscritas = [i.aula for i in inscripciones]

    aulas_set = {a.id: a for a in aulas_creadas + aulas_inscritas}
    aulas = list(aulas_set.values())
    
    aulas.sort(key=lambda x: x.fecha_creacion, reverse=True)

    resultado = []
    for aula in aulas:
        total = db.query(AulaJugador).filter(AulaJugador.aula_id == aula.id).count()
        
        actividades_pendientes = None
        if aula.anfitrion_id != current_user.id:
            retos_aula = db.query(RetoPersonalizado).filter(
                RetoPersonalizado.aula_id == aula.id,
                RetoPersonalizado.estado == EstadoReto.publicado,
                RetoPersonalizado.fecha_cierre.is_(None),
                or_(
                    RetoPersonalizado.fecha_limite.is_(None),
                    RetoPersonalizado.fecha_limite > ahora_utc(),
                ),
            ).all()
            if retos_aula:
                # Una actividad publicada sin entrega se considera pendiente.
                actividades_pendientes = False
                for reto in retos_aula:
                    progreso = db.query(ProgresoAula).filter(
                        ProgresoAula.reto_personalizado_id == reto.id,
                        ProgresoAula.jugador_id == current_user.id,
                        ProgresoAula.completado == True
                    ).first()
                    if not progreso:
                        actividades_pendientes = True
                        break

        resultado.append(AulaDetalleResponse(
            **{c.name: getattr(aula, c.name) for c in aula.__table__.columns},
            total_jugadores=total,
            actividades_pendientes=actividades_pendientes
        ))
    return resultado

@router.post("/unirse", status_code=status.HTTP_200_OK)
def unirse_aula(
    datos: UnirseAulaRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> Any:
    """Permite a un jugador unirse a un aula usando el código de acceso."""
    aula = db.query(AulaVirtual).filter(
        AulaVirtual.codigo_acceso == datos.codigo_acceso.upper(),
        AulaVirtual.estado == EstadoAula.activa
    ).first()
    if not aula:
        raise HTTPException(
            status_code=404,
            detail="El código de acceso es inválido o el aula no está activa."
        )

    inscripcion_existente = db.query(AulaJugador).filter(
        AulaJugador.aula_id == aula.id,
        AulaJugador.jugador_id == current_user.id
    ).first()
    if inscripcion_existente:
        raise HTTPException(status_code=400, detail="Ya estás inscrito en esta aula.")

    nueva_inscripcion = AulaJugador(
        aula_id=aula.id,
        jugador_id=current_user.id
    )
    db.add(nueva_inscripcion)

    retos_publicados = db.query(RetoPersonalizado).filter(
        RetoPersonalizado.aula_id == aula.id,
        RetoPersonalizado.estado == EstadoReto.publicado,
        RetoPersonalizado.fecha_cierre.is_(None),
        or_(
            RetoPersonalizado.fecha_limite.is_(None),
            RetoPersonalizado.fecha_limite > ahora_utc(),
        ),
    ).all()
    for reto in retos_publicados:
        db.add(Notificacion(
            usuario_id=current_user.id,
            titulo="Actividad disponible",
            mensaje=f"La actividad '{reto.titulo}' está disponible en el aula '{aula.nombre_aula}'.",
        ))

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        # Una petición simultánea pudo registrar la inscripción primero.
        if db.query(AulaJugador).filter(
            AulaJugador.aula_id == aula.id,
            AulaJugador.jugador_id == current_user.id,
        ).first():
            raise HTTPException(status_code=400, detail="Ya estás inscrito en esta aula.") from None
        raise HTTPException(
            status_code=500,
            detail="No se pudo completar la inscripción. Vuelve a intentarlo.",
        ) from None
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="No se pudo completar la inscripción. Vuelve a intentarlo.",
        ) from None

    return {
        "mensaje": f"Te uniste exitosamente al aula '{aula.nombre_aula}'.",
        "aula_id": aula.id,
        "nombre_aula": aula.nombre_aula
    }

@router.get("/{aula_id}/jugadores", response_model=List[JugadorEnAulaResponse])
def jugadores_del_aula(
    aula_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> Any:
    """Retorna la lista de jugadores inscritos en el aula."""
    aula = db.query(AulaVirtual).filter(
        AulaVirtual.id == aula_id,
        AulaVirtual.anfitrion_id == current_user.id
    ).first()
    if not aula:
        raise HTTPException(status_code=404, detail="Aula no encontrada o no tienes permiso.")

    inscripciones = (
        db.query(AulaJugador)
        .join(Usuario, AulaJugador.jugador_id == Usuario.id)
        .filter(AulaJugador.aula_id == aula_id)
        .order_by(
            func.lower(Usuario.apellido),
            func.lower(Usuario.nombre),
            func.lower(Usuario.email),
        )
        .all()
    )

    resultado = []
    for inscripcion in inscripciones:
        jugador = inscripcion.jugador
        resultado.append(JugadorEnAulaResponse(
            jugador_id=jugador.id,
            nombre=jugador.nombre,
            apellido=jugador.apellido,
            email=jugador.email,
            estrellas_totales=jugador.estrellas_totales,
            fecha_ingreso=inscripcion.fecha_ingreso
        ))
    return resultado

@router.get("/{aula_id}/niveles", response_model=List[RetoNivelResponse])
def niveles_del_aula(
    aula_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> Any:
    """Retorna los niveles disponibles para jugar en el contexto de un aula."""
    inscripcion = db.query(AulaJugador).filter(
        AulaJugador.aula_id == aula_id,
        AulaJugador.jugador_id == current_user.id
    ).first()
    aula = db.query(AulaVirtual).filter(AulaVirtual.id == aula_id).first()
    es_anfitrion = aula and aula.anfitrion_id == current_user.id

    if not inscripcion and not es_anfitrion:
        raise HTTPException(status_code=403, detail="No estás inscrito en esta aula.")

    if cerrar_retos_vencidos(db, aula_id=aula_id):
        confirmar_transaccion(
            db, "No se pudo actualizar el estado de las actividades. Vuelve a intentarlo."
        )
    niveles = db.query(RetoNivel).order_by(RetoNivel.orden).all()
    return niveles

@router.patch("/{aula_id}/archivar", response_model=AulaResponse)
def archivar_aula(
    aula_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> Any:
    """Cambia el estado del aula a 'archivada'. Los jugadores ya no pueden ingresar."""
    aula = db.query(AulaVirtual).filter(
        AulaVirtual.id == aula_id,
        AulaVirtual.anfitrion_id == current_user.id
    ).first()
    if not aula:
        raise HTTPException(status_code=404, detail="Aula no encontrada o no tienes permiso.")

    aula.estado = EstadoAula.archivada
    confirmar_transaccion(db, "No se pudo archivar el aula. Vuelve a intentarlo.")
    db.refresh(aula)
    return aula

@router.post("/{aula_id}/retos", response_model=RetoPersonalizadoResponse, status_code=status.HTTP_201_CREATED)
def crear_reto_en_aula(
    aula_id: str,
    datos: RetoPersonalizadoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> Any:
    """Publica un nivel oficial con la configuración académica del aula."""
    aula = db.query(AulaVirtual).filter(
        AulaVirtual.id == aula_id,
        AulaVirtual.anfitrion_id == current_user.id
    ).first()
    if not aula:
        raise HTTPException(status_code=404, detail="Aula no encontrada o no tienes permiso.")
    if aula.estado != EstadoAula.activa:
        raise HTTPException(status_code=409, detail="No se pueden publicar actividades en un aula archivada.")

    nivel_oficial = db.query(RetoNivel).filter(RetoNivel.id == datos.reto_nivel_id).first()
    if not nivel_oficial:
        raise HTTPException(status_code=404, detail=f"El nivel con ID {datos.reto_nivel_id} no existe.")

    parametros_dict = datos.parametros.model_dump()
    fases_disponibles = set(
        (nivel_oficial.parametros_evaluacion or {}).get(
            "fases_seleccionadas", [1, 2, 3, 4]
        )
    )
    fases_solicitadas = set(parametros_dict.get("fases_seleccionadas") or fases_disponibles)
    if not fases_solicitadas.issubset(fases_disponibles):
        raise HTTPException(
            status_code=422,
            detail="La actividad contiene una fase que no existe en el nivel seleccionado.",
        )
    # Las ayudas son una mecánica exclusiva del Modo Aventura.
    parametros_dict["ayudas_habilitadas"] = False

    nuevo_reto = RetoPersonalizado(
        aula_id=aula_id,
        reto_nivel_id=nivel_oficial.id,
        titulo=datos.titulo,
        estado=EstadoReto.publicado,
        tipo_reto=nivel_oficial.tipo_reto,
        parametros_evaluacion=parametros_dict,
        recompensa_estrellas=datos.recompensa_estrellas,
        fecha_limite=normalizar_fecha_utc(datos.fecha_limite),
    )
    db.add(nuevo_reto)

    inscripciones = db.query(AulaJugador).filter(AulaJugador.aula_id == aula_id).all()
    for inscripcion in inscripciones:
        db.add(Notificacion(
            usuario_id=inscripcion.jugador_id,
            titulo="Nueva actividad asignada",
            mensaje=f"Se publicó la actividad '{datos.titulo}' en el aula '{aula.nombre_aula}'.",
        ))

    try:
        db.commit()
        db.refresh(nuevo_reto)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="No se pudo publicar la actividad. Vuelve a intentarlo.",
        ) from None
    return nuevo_reto

@router.get("/{aula_id}/retos", response_model=list[RetoPersonalizadoResponse])
def retos_del_aula(
    aula_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> Any:
    """Retorna los retos personalizados que el profesor asignó a su aula."""
    aula = db.query(AulaVirtual).filter(AulaVirtual.id == aula_id).first()
    if not aula:
        raise HTTPException(status_code=404, detail="Aula no encontrada.")

    es_anfitrion = aula.anfitrion_id == current_user.id
    inscripcion = db.query(AulaJugador).filter(
        AulaJugador.aula_id == aula_id,
        AulaJugador.jugador_id == current_user.id
    ).first()

    if not es_anfitrion and not inscripcion:
        raise HTTPException(status_code=403, detail="No tienes acceso a este aula.")

    if cerrar_retos_vencidos(db, aula_id=aula_id):
        confirmar_transaccion(
            db, "No se pudo actualizar el estado de las actividades. Vuelve a intentarlo."
        )
    consulta_retos = db.query(RetoPersonalizado).filter(
        RetoPersonalizado.aula_id == aula_id
    )
    if not es_anfitrion:
        # Los borradores pertenecen al trabajo del anfitrión y no deben aparecer
        # en la experiencia del estudiante antes de publicarse.
        consulta_retos = consulta_retos.filter(
            RetoPersonalizado.estado == EstadoReto.publicado
        )
    retos = consulta_retos.all()
    
    # Cada usuario ve su propio estado de finalización.
    resultado = []
    for reto in retos:
        progreso = db.query(ProgresoAula).filter(
            ProgresoAula.jugador_id == current_user.id,
            ProgresoAula.reto_personalizado_id == reto.id
        ).first()
        
        reto_dict = {c.name: getattr(reto, c.name) for c in reto.__table__.columns}
        reto_dict['completado'] = progreso.completado if progreso else False
        resultado.append(RetoPersonalizadoResponse(**reto_dict))
        
    return resultado

@router.delete("/{aula_id}", status_code=status.HTTP_200_OK)
def eliminar_aula(
    aula_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> Any:
    """Elimina permanentemente un aula y sus dependencias (inscripciones y retos)."""
    aula = db.query(AulaVirtual).filter(
        AulaVirtual.id == aula_id,
        AulaVirtual.anfitrion_id == current_user.id
    ).first()
    
    if not aula:
        raise HTTPException(status_code=404, detail="Aula no encontrada o no tienes permiso para eliminarla.")

    # Las dependencias se eliminan de forma explícita para mantener el mismo
    # comportamiento en SQLite y PostgreSQL.
    ids_retos = [
        reto_id
        for (reto_id,) in db.query(RetoPersonalizado.id).filter(
            RetoPersonalizado.aula_id == aula_id,
        ).all()
    ]
    if ids_retos:
        db.query(ProgresoAula).filter(
            ProgresoAula.reto_personalizado_id.in_(ids_retos),
        ).delete(synchronize_session=False)
    db.query(RetoPersonalizado).filter(
        RetoPersonalizado.aula_id == aula_id,
    ).delete(synchronize_session=False)
    db.query(AulaJugador).filter(
        AulaJugador.aula_id == aula_id,
    ).delete(synchronize_session=False)
    
    db.delete(aula)
    confirmar_transaccion(db, "No se pudo eliminar el aula. Vuelve a intentarlo.")

    return {"mensaje": "Aula eliminada correctamente."}
