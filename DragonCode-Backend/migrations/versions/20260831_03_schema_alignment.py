"""Alinea las restricciones del prototipo de Supabase con el backend.

Revision ID: 20260831_03
Revises: 20260831_02
"""
from typing import Optional

from alembic import op
import sqlalchemy as sa

revision: str = "20260831_03"
down_revision: Optional[str] = "20260831_02"
branch_labels = None
depends_on = None


COLUMNAS_OBLIGATORIAS = {
    "aula_jugadores": ("aula_id", "jugador_id"),
    "aulas_virtuales": ("anfitrion_id",),
    "notificaciones": ("usuario_id",),
    "progreso_aula": ("jugador_id", "reto_personalizado_id"),
    "progreso_jugador": ("jugador_id", "reto_nivel_id"),
    "retos_niveles": ("descripcion", "parametros_evaluacion"),
    "retos_personalizados": (
        "aula_id",
        "reto_nivel_id",
        "parametros_evaluacion",
    ),
}


def upgrade() -> None:
    bind = op.get_bind()
    tablas = set(sa.inspect(bind).get_table_names())

    # No se inventan valores ni relaciones. Si una instalación tuviera algún
    # registro incompleto, PostgreSQL cancelaría toda la migración y conservaría
    # intacto el esquema previo.

    for tabla, nombres in COLUMNAS_OBLIGATORIAS.items():
        if tabla not in tablas:
            continue
        columnas = {
            columna["name"]: columna
            for columna in sa.inspect(bind).get_columns(tabla)
        }
        for nombre in nombres:
            columna = columnas.get(nombre)
            if columna and columna["nullable"]:
                op.alter_column(
                    tabla,
                    nombre,
                    existing_type=columna["type"],
                    nullable=False,
                )


def downgrade() -> None:
    bind = op.get_bind()
    tablas = set(sa.inspect(bind).get_table_names())
    for tabla, nombres in COLUMNAS_OBLIGATORIAS.items():
        if tabla not in tablas:
            continue
        columnas = {
            columna["name"]: columna
            for columna in sa.inspect(bind).get_columns(tabla)
        }
        for nombre in nombres:
            columna = columnas.get(nombre)
            if columna and not columna["nullable"]:
                op.alter_column(
                    tabla,
                    nombre,
                    existing_type=columna["type"],
                    nullable=True,
                )
