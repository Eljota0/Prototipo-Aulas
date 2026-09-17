"""Alinea el Nivel 2 con sus tres fases definitivas.

Revision ID: 20260915_08
Revises: 20260909_07
"""
from typing import Optional

from alembic import op
import sqlalchemy as sa


revision: str = "20260915_08"
down_revision: Optional[str] = "20260909_07"
branch_labels = None
depends_on = None


def _tabla_niveles():
    return sa.table(
        "retos_niveles",
        sa.column("orden", sa.Integer()),
        sa.column("descripcion", sa.Text()),
        sa.column("parametros_evaluacion", sa.JSON()),
    )


def _actualizar_fases(fases: list[int], descripcion: Optional[str] = None) -> None:
    bind = op.get_bind()
    if "retos_niveles" not in sa.inspect(bind).get_table_names():
        return

    niveles = _tabla_niveles()
    fila = bind.execute(
        sa.select(niveles.c.descripcion, niveles.c.parametros_evaluacion).where(
            niveles.c.orden == 2
        )
    ).mappings().first()
    if not fila:
        return

    parametros = dict(fila["parametros_evaluacion"] or {})
    parametros["fases_seleccionadas"] = fases
    valores = {"parametros_evaluacion": parametros}
    if descripcion is not None:
        valores["descripcion"] = descripcion

    bind.execute(
        niveles.update().where(niveles.c.orden == 2).values(**valores)
    )


def upgrade() -> None:
    _actualizar_fases(
        [1, 2, 3],
        "Resuelve tres fases programando eventos y condicionales para mantener "
        "estable un taladro mágico.",
    )


def downgrade() -> None:
    _actualizar_fases([1, 2, 3, 4])
