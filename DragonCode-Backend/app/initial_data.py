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
        "Resuelve tres fases programando eventos y condicionales para mantener "
        "estable un taladro mágico."
    ),
    "tipo_reto": TipoReto.eventos,
    "parametros_evaluacion": {
        "tiempo_3_estrellas": 60,
        "tiempo_2_estrellas": 120,
        "intentos_max_sin_penalidad": 3,
        "anti_copia": False,
        "fases_seleccionadas": [1, 2, 3],
    },
    "recompensa_estrellas": 5,
}

NIVEL_TRES = {
    "orden": 3,
    "titulo": "La Cueva de las Variables",
    "descripcion": (
        "Resuelve cuatro fases almacenando booleanos, textos y enteros para "
        "preparar el combate de Drako contra los murciélagos."
    ),
    "tipo_reto": TipoReto.variables,
    "parametros_evaluacion": {
        "tiempo_3_estrellas": 60,
        "tiempo_2_estrellas": 120,
        "intentos_max_sin_penalidad": 3,
        "anti_copia": False,
        "fases_seleccionadas": [1, 2, 3, 4],
    },
    "recompensa_estrellas": 5,
}

NIVEL_CUATRO = {
    "orden": 4,
    "titulo": "Control de Calidad",
    "descripcion": (
        "Resuelve cuatro fases clasificando materiales con decisiones si, "
        "sino si y sino dentro de una fábrica minera."
    ),
    "tipo_reto": TipoReto.control_flujo,
    "parametros_evaluacion": {
        "tiempo_3_estrellas": 75,
        "tiempo_2_estrellas": 150,
        "intentos_max_sin_penalidad": 3,
        "anti_copia": False,
        "fases_seleccionadas": [1, 2, 3, 4],
    },
    "recompensa_estrellas": 5,
}

NIVEL_CINCO = {
    "orden": 5,
    "titulo": "Producción en Masa",
    "descripcion": (
        "Resuelve cuatro fases automatizando la fábrica con bucles mientras "
        "y decisiones anidadas hasta vaciar el stock."
    ),
    "tipo_reto": TipoReto.bucles,
    "parametros_evaluacion": {
        "tiempo_3_estrellas": 100,
        "tiempo_2_estrellas": 200,
        "intentos_max_sin_penalidad": 3,
        "anti_copia": False,
        "fases_seleccionadas": [1, 2, 3, 4],
    },
    "recompensa_estrellas": 5,
}

NIVELES_OFICIALES = (
    NIVEL_UNO,
    NIVEL_DOS,
    NIVEL_TRES,
    NIVEL_CUATRO,
    NIVEL_CINCO,
)


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
