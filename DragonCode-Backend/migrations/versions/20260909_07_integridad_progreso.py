"""Impide inscripciones y progresos duplicados.

Revision ID: 20260909_07
Revises: 20260902_06
"""
from typing import Optional

from alembic import op
import sqlalchemy as sa

revision: str = "20260909_07"
down_revision: Optional[str] = "20260902_06"
branch_labels = None
depends_on = None


RESTRICCIONES = (
    (
        "aula_jugadores",
        "uq_aula_jugadores_aula_jugador",
        ("aula_id", "jugador_id"),
    ),
    (
        "progreso_jugador",
        "uq_progreso_jugador_jugador_nivel",
        ("jugador_id", "reto_nivel_id"),
    ),
    (
        "progreso_aula",
        "uq_progreso_aula_jugador_reto",
        ("jugador_id", "reto_personalizado_id"),
    ),
)


def _columnas_unicas(inspector: sa.Inspector, tabla: str) -> set[tuple[str, ...]]:
    restricciones = {
        tuple(restriccion["column_names"])
        for restriccion in inspector.get_unique_constraints(tabla)
    }
    indices = {
        tuple(indice["column_names"])
        for indice in inspector.get_indexes(tabla)
        if indice.get("unique")
    }
    return restricciones | indices


def _tiene_duplicados(bind, tabla: str, columnas: tuple[str, ...]) -> bool:
    nombres = ", ".join(columnas)
    consulta = sa.text(
        f"SELECT 1 FROM {tabla} GROUP BY {nombres} HAVING COUNT(*) > 1 LIMIT 1"
    )
    return bind.execute(consulta).first() is not None


def upgrade() -> None:
    bind = op.get_bind()
    tablas = set(sa.inspect(bind).get_table_names())
    for tabla, nombre, columnas in RESTRICCIONES:
        if tabla not in tablas:
            continue
        inspector = sa.inspect(bind)
        if tuple(columnas) in _columnas_unicas(inspector, tabla):
            continue
        if _tiene_duplicados(bind, tabla, columnas):
            raise RuntimeError(
                f"No se puede crear {nombre}: {tabla} contiene registros duplicados."
            )
        with op.batch_alter_table(tabla) as lote:
            lote.create_unique_constraint(nombre, list(columnas))


def downgrade() -> None:
    bind = op.get_bind()
    tablas = set(sa.inspect(bind).get_table_names())
    for tabla, nombre, _ in reversed(RESTRICCIONES):
        if tabla not in tablas:
            continue
        existentes = {
            restriccion.get("name")
            for restriccion in sa.inspect(bind).get_unique_constraints(tabla)
        }
        if nombre in existentes:
            with op.batch_alter_table(tabla) as lote:
                lote.drop_constraint(nombre, type_="unique")
