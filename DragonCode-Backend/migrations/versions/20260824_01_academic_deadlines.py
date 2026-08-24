"""Añade programación y cierre de actividades académicas.

Revision ID: 20260824_01
Revises: None
"""
from typing import Optional

from alembic import op
import sqlalchemy as sa

revision: str = "20260824_01"
down_revision: Optional[str] = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "retos_personalizados" not in inspector.get_table_names():
        return

    columnas = {columna["name"] for columna in inspector.get_columns("retos_personalizados")}
    if "reto_nivel_id" not in columnas:
        op.add_column(
            "retos_personalizados",
            sa.Column("reto_nivel_id", sa.Integer(), nullable=True),
        )
        op.execute(sa.text(
            "UPDATE retos_personalizados SET reto_nivel_id = 1 WHERE reto_nivel_id IS NULL"
        ))
    if "fecha_limite" not in columnas:
        op.add_column(
            "retos_personalizados",
            sa.Column("fecha_limite", sa.DateTime(), nullable=True),
        )
    if "fecha_cierre" not in columnas:
        op.add_column(
            "retos_personalizados",
            sa.Column("fecha_cierre", sa.DateTime(), nullable=True),
        )

    if "progreso_aula" in inspector.get_table_names():
        op.execute(sa.text(
            """
            UPDATE progreso_aula
            SET calificacion_numerica = CASE
                WHEN intentos <= 1 THEN 10
                WHEN intentos = 2 THEN 8
                ELSE 6
            END
            WHERE completado = TRUE
              AND (calificacion_numerica IS NULL OR calificacion_numerica = 0)
            """
        ))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "retos_personalizados" not in inspector.get_table_names():
        return

    columnas = {columna["name"] for columna in inspector.get_columns("retos_personalizados")}
    if "fecha_cierre" in columnas:
        op.drop_column("retos_personalizados", "fecha_cierre")
    if "fecha_limite" in columnas:
        op.drop_column("retos_personalizados", "fecha_limite")
    if "reto_nivel_id" in columnas:
        op.drop_column("retos_personalizados", "reto_nivel_id")
