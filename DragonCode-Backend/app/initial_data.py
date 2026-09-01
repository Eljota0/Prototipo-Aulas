from sqlalchemy.orm import Session

from app.models.models import RetoNivel, TipoReto


NIVEL_UNO = {
    "orden": 1,
    "titulo": "El Ogro",
    "descripcion": "Resuelve las cuatro fases guiando al ogro mediante comandos secuenciales.",
    "tipo_reto": TipoReto.laberinto,
    "parametros_evaluacion": {
        "tiempo_3_estrellas": 60,
        "tiempo_2_estrellas": 120,
        "intentos_max_sin_penalidad": 3,
        "anti_copia": False,
        "fases_seleccionadas": [1, 2, 3, 4],
    },
    "recompensa_estrellas": 5,
}

NIVEL_DOS = {
    "orden": 2,
    "titulo": "Taladro a Vapor",
    "descripcion": (
        "Resuelve cuatro fases programando eventos y condicionales para mantener "
        "estable un taladro mágico."
    ),
    "tipo_reto": TipoReto.eventos,
    "parametros_evaluacion": {
        "tiempo_3_estrellas": 60,
        "tiempo_2_estrellas": 120,
        "intentos_max_sin_penalidad": 3,
        "anti_copia": False,
        "fases_seleccionadas": [1, 2, 3, 4],
    },
    "recompensa_estrellas": 5,
}

NIVELES_OFICIALES = (NIVEL_UNO, NIVEL_DOS)


def seed_initial_data(db: Session) -> bool:
    """Añade los niveles oficiales que todavía no existan en la base."""
    niveles_creados = False

    for datos_nivel in NIVELES_OFICIALES:
        existente = db.query(RetoNivel).filter(
            RetoNivel.orden == datos_nivel["orden"]
        ).first()
        if existente:
            continue

        db.add(RetoNivel(**datos_nivel))
        niveles_creados = True

    if niveles_creados:
        db.commit()

    return niveles_creados
