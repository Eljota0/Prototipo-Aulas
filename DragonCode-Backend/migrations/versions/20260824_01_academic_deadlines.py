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
    tablas = set(inspector.get_table_names())
    if "retos_personalizados" not in tablas:
        return

    columnas = {columna["name"] for columna in inspector.get_columns("retos_personalizados")}
    if "reto_nivel_id" not in columnas:
        op.add_column(
            "retos_personalizados",
            sa.Column("reto_nivel_id", sa.Integer(), nullable=True),
        )
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

    # La base histórica de Supabase ya contiene las tablas, pero no esta
    # relación. Se añade sin borrar ni recrear registros.
    inspector = sa.inspect(bind)
    claves_foraneas = {
        clave.get("name")
        for clave in inspector.get_foreign_keys("retos_personalizados")
    }
    if (
        "retos_niveles" in tablas
        and "fk_retos_personalizados_reto_nivel_id" not in claves_foraneas
    ):
        op.create_foreign_key(
            "fk_retos_personalizados_reto_nivel_id",
            "retos_personalizados",
            "retos_niveles",
            ["reto_nivel_id"],
            ["id"],
        )

    if "retos_niveles" in tablas:
        restricciones_unicas = {
            restriccion.get("name")
            for restriccion in sa.inspect(bind).get_unique_constraints("retos_niveles")
        }
        if "uq_retos_niveles_orden" not in restricciones_unicas:
            op.create_unique_constraint(
                "uq_retos_niveles_orden",
                "retos_niveles",
                ["orden"],
            )

    if "progreso_aula" in tablas:
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

    claves_foraneas = {
        clave.get("name")
        for clave in inspector.get_foreign_keys("retos_personalizados")
    }
    if "fk_retos_personalizados_reto_nivel_id" in claves_foraneas:
        op.drop_constraint(
            "fk_retos_personalizados_reto_nivel_id",
            "retos_personalizados",
            type_="foreignkey",
        )

    if "retos_niveles" in inspector.get_table_names():
        restricciones_unicas = {
            restriccion.get("name")
            for restriccion in sa.inspect(bind).get_unique_constraints("retos_niveles")
        }
        if "uq_retos_niveles_orden" in restricciones_unicas:
            op.drop_constraint(
                "uq_retos_niveles_orden",
                "retos_niveles",
                type_="unique",
            )

    columnas = {columna["name"] for columna in inspector.get_columns("retos_personalizados")}
    if "fecha_cierre" in columnas:
        op.drop_column("retos_personalizados", "fecha_cierre")
    if "fecha_limite" in columnas:
        op.drop_column("retos_personalizados", "fecha_limite")
    if "reto_nivel_id" in columnas:
        op.drop_column("retos_personalizados", "reto_nivel_id")
