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


def seed_initial_data(db: Session) -> bool:
    """Crea únicamente el registro del Nivel 1 existente en una base vacía."""
    if db.query(RetoNivel).first():
        return False

    db.add(RetoNivel(**NIVEL_UNO))
    db.commit()
    return True
