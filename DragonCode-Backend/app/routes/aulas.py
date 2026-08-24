import random
import string
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Any

from app.database import get_db
from app.models.models import AulaVirtual, AulaJugador, Usuario, RetoNivel, RetoPersonalizado, EstadoAula, RolUsuario, TipoReto
from app.schemas.aula import (
    AulaCreate, AulaResponse, AulaDetalleResponse,
    UnirseAulaRequest, JugadorEnAulaResponse, RetoNivelResponse,
    RetoPersonalizadoCreate, RetoPersonalizadoResponse
)
from app.core.deps import get_current_user

router = APIRouter()

def generar_codigo_acceso(longitud: int = 6) -> str:
    """Genera un código de acceso único alfanumérico en mayúsculas."""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=longitud))

# ------------------------------------------------------------------
# CREAR AULA (Solo Anfitrión)
# ------------------------------------------------------------------
@router.post("/", response_model=AulaResponse, status_code=status.HTTP_201_CREATED)
def crear_aula(
    aula_in: AulaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> Any:
    """Crea un aula virtual nueva. Solo disponible para Anfitriones."""
    # Generar código único
    while True:
        codigo = generar_codigo_acceso()
        existe = db.query(AulaVirtual).filter(AulaVirtual.codigo_acceso == codigo).first()
        if not existe:
            break

    nueva_aula = AulaVirtual(
        anfitrion_id=current_user.id,
        nombre_aula=aula_in.nombre_aula,
        codigo_acceso=codigo,
    )
    db.add(nueva_aula)
    db.commit()
    db.refresh(nueva_aula)
    return nueva_aula

# ------------------------------------------------------------------
# VER MIS AULAS (Anfitrión ve las que creó / Jugador ve las que está inscrito)
# ------------------------------------------------------------------
@router.get("/mis-aulas", response_model=List[AulaDetalleResponse])
def mis_aulas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> Any:
    """Retorna las aulas según el rol: si es Anfitrión, retorna las que creó; si es Jugador, las que se unió."""
    # Al eliminar los roles, el usuario puede haber creado aulas o haberse unido a aulas. 
    # Devolvemos ambas listas combinadas (sin duplicados, por si acaso).
    aulas_creadas = db.query(AulaVirtual).filter(AulaVirtual.anfitrion_id == current_user.id).all()
    
    inscripciones = db.query(AulaJugador).filter(AulaJugador.jugador_id == current_user.id).all()
    aulas_inscritas = [i.aula for i in inscripciones]

    aulas_set = {a.id: a for a in aulas_creadas + aulas_inscritas}
    aulas = list(aulas_set.values())
    
    # Ordenar las aulas de más reciente a más antigua
    aulas.sort(key=lambda x: x.fecha_creacion, reverse=True)

    resultado = []
    for aula in aulas:
        total = db.query(AulaJugador).filter(AulaJugador.aula_id == aula.id).count()
        
        actividades_pendientes = None
        # Si el usuario es un estudiante (no es el creador del aula), calculamos sus actividades pendientes
        if aula.anfitrion_id != current_user.id:
            retos_aula = db.query(RetoPersonalizado).filter(RetoPersonalizado.aula_id == aula.id).all()
            if retos_aula:
                # Si hay retos, asumimos False hasta encontrar uno que no esté completado
                actividades_pendientes = False
                for reto in retos_aula:
                    from app.models.progreso import ProgresoAula  # Importación local para evitar dependencias cruzadas si no está
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

# ------------------------------------------------------------------
# UNIRSE A UN AULA (Solo Jugadores)
# ------------------------------------------------------------------
@router.post("/unirse", status_code=status.HTTP_200_OK)
def unirse_aula(
    datos: UnirseAulaRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> Any:
    """Permite a un jugador unirse a un aula usando el código de acceso."""
    # Verificar que el código existe
    aula = db.query(AulaVirtual).filter(
        AulaVirtual.codigo_acceso == datos.codigo_acceso.upper(),
        AulaVirtual.estado == EstadoAula.activa
    ).first()
    if not aula:
        raise HTTPException(
            status_code=404,
            detail="El código de acceso es inválido o el aula no está activa."
        )

    # Verificar que no esté ya inscrito
    inscripcion_existente = db.query(AulaJugador).filter(
        AulaJugador.aula_id == aula.id,
        AulaJugador.jugador_id == current_user.id
    ).first()
    if inscripcion_existente:
        raise HTTPException(status_code=400, detail="Ya estás inscrito en esta aula.")

    # Crear la inscripción
    nueva_inscripcion = AulaJugador(
        aula_id=aula.id,
        jugador_id=current_user.id
    )
    db.add(nueva_inscripcion)
    db.commit()

    return {
        "mensaje": f"Te uniste exitosamente al aula '{aula.nombre_aula}'.",
        "aula_id": aula.id,
        "nombre_aula": aula.nombre_aula
    }

# ------------------------------------------------------------------
# VER JUGADORES DE UN AULA (Solo Anfitrión dueño del aula)
# ------------------------------------------------------------------
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

    inscripciones = db.query(AulaJugador).filter(AulaJugador.aula_id == aula_id).all()

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

# ------------------------------------------------------------------
# VER NIVELES DISPONIBLES EN EL AULA (Jugador inscrito)
# ------------------------------------------------------------------
@router.get("/{aula_id}/niveles", response_model=List[RetoNivelResponse])
def niveles_del_aula(
    aula_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> Any:
    """Retorna los 10 niveles disponibles para jugar en el contexto de un aula."""
    # Verificar que el jugador esté inscrito en el aula
    inscripcion = db.query(AulaJugador).filter(
        AulaJugador.aula_id == aula_id,
        AulaJugador.jugador_id == current_user.id
    ).first()
    aula = db.query(AulaVirtual).filter(AulaVirtual.id == aula_id).first()
    es_anfitrion = aula and aula.anfitrion_id == current_user.id

    if not inscripcion and not es_anfitrion:
        raise HTTPException(status_code=403, detail="No estás inscrito en esta aula.")

    niveles = db.query(RetoNivel).order_by(RetoNivel.orden).all()
    return niveles

# ------------------------------------------------------------------
# ARCHIVAR AULA (Solo Anfitrión dueño)
# ------------------------------------------------------------------
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
    db.commit()
    db.refresh(aula)
    return aula

# ------------------------------------------------------------------
# CREAR RETO PERSONALIZADO EN UN AULA (Solo Anfitrión dueño)
# ------------------------------------------------------------------
@router.post("/{aula_id}/retos", response_model=RetoPersonalizadoResponse, status_code=status.HTTP_201_CREATED)
def crear_reto_en_aula(
    aula_id: str,
    datos: RetoPersonalizadoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> Any:
    """
    Crea un reto personalizado dentro de un aula reutilizando un nivel oficial.
    El profesor solo define los parámetros de evaluación (tiempos, intentos).
    El nivel en sí (el mapa del juego) es el oficial y no se modifica.
    """
    # 1. Verificar que el aula pertenece al anfitrión actual
    aula = db.query(AulaVirtual).filter(
        AulaVirtual.id == aula_id,
        AulaVirtual.anfitrion_id == current_user.id
    ).first()
    if not aula:
        raise HTTPException(status_code=404, detail="Aula no encontrada o no tienes permiso.")

    # 2. Verificar que el nivel oficial existe
    nivel_oficial = db.query(RetoNivel).filter(RetoNivel.id == datos.reto_nivel_id).first()
    if not nivel_oficial:
        raise HTTPException(status_code=404, detail=f"El nivel con ID {datos.reto_nivel_id} no existe.")

    # 3. Construir el diccionario de parámetros a partir del schema recibido
    parametros_dict = datos.parametros.model_dump()

    # 4. Crear el reto personalizado en la BD
    nuevo_reto = RetoPersonalizado(
        aula_id=aula_id,
        titulo=datos.titulo,
        tipo_reto=nivel_oficial.tipo_reto,   # Hereda el tipo del nivel oficial
        parametros_evaluacion=parametros_dict,
        recompensa_estrellas=datos.recompensa_estrellas
    )
    db.add(nuevo_reto)
    db.commit()
    db.refresh(nuevo_reto)
    return nuevo_reto

# ------------------------------------------------------------------
# VER RETOS DEL AULA (Anfitrión o Jugador inscrito)
# ------------------------------------------------------------------
from app.models.models import AulaVirtual, AulaJugador, Usuario, RetoNivel, RetoPersonalizado, EstadoAula, RolUsuario, TipoReto, ProgresoAula

@router.get("/{aula_id}/retos", response_model=list[RetoPersonalizadoResponse])
def retos_del_aula(
    aula_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> Any:
    """Retorna los retos personalizados que el profesor asignó a su aula."""
    # Verificar acceso (anfitrión o jugador inscrito)
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

    retos = db.query(RetoPersonalizado).filter(RetoPersonalizado.aula_id == aula_id).all()
    
    # Inyectar estado "completado" para el current_user
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

# ------------------------------------------------------------------
# ELIMINAR AULA (Solo Anfitrión)
# ------------------------------------------------------------------
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

    # Las relaciones con cascade="all, delete-orphan" en SQLAlchemy (si están configuradas) 
    # borrarán automáticamente AulaJugador y RetoPersonalizado. 
    # Por seguridad, si no lo están, podemos borrarlas manualmente o dejar que la BD lo maneje si hay ON DELETE CASCADE.
    # Asumimos que los models tienen cascade (o lo borramos manualmente para asegurar):
    db.query(AulaJugador).filter(AulaJugador.aula_id == aula_id).delete()
    db.query(RetoPersonalizado).filter(RetoPersonalizado.aula_id == aula_id).delete()
    
    db.delete(aula)
    db.commit()

    return {"mensaje": "Aula eliminada correctamente."}
