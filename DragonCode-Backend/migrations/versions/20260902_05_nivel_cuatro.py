"""Registra el Nivel 4 dedicado al control de flujo condicional.

Revision ID: 20260902_05
Revises: 20260901_04
"""
import json
from typing import Optional

from alembic import op
import sqlalchemy as sa

revision: str = "20260902_05"
down_revision: Optional[str] = "20260901_04"
branch_labels = None
depends_on = None


PARAMETROS_NIVEL_CUATRO = {
    "tiempo_3_estrellas": 75,
    "tiempo_2_estrellas": 150,
    "intentos_max_sin_penalidad": 3,
    "anti_copia": False,
    "fases_seleccionadas": [1, 2, 3, 4],
}

NIVEL_CUATRO = {
    "orden": 4,
    "titulo": "Control de Calidad",
    "descripcion": (
        "Resuelve cuatro fases clasificando materiales con decisiones si, "
        "sino si y sino dentro de una fábrica minera."
    ),
    "tipo_reto": "control_flujo",
    "recompensa": 5,
}


def _usa_enum_nativo(inspector: sa.Inspector) -> bool:
    tipo = next(
        columna["type"]
        for columna in inspector.get_columns("retos_niveles")
        if columna["name"] == "tipo_reto"
    )
    return isinstance(tipo, sa.Enum) and getattr(tipo, "native_enum", False)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "retos_niveles" not in inspector.get_table_names():
        return

    usa_enum_nativo = bind.dialect.name == "postgresql" and _usa_enum_nativo(inspector)
    if usa_enum_nativo:
        with op.get_context().autocommit_block():
            op.execute("ALTER TYPE tiporeto ADD VALUE IF NOT EXISTS 'control_flujo'")

    if bind.dialect.name == "postgresql":
        expresion_tipo = "CAST(:tipo_reto AS tiporeto)" if usa_enum_nativo else ":tipo_reto"
        bind.execute(sa.text(f"""
            INSERT INTO retos_niveles
                (orden, titulo, descripcion, tipo_reto,
                 parametros_evaluacion, recompensa_estrellas)
            SELECT
                :orden, :titulo, :descripcion, {expresion_tipo},
                CAST(:parametros AS JSON), :recompensa
            WHERE NOT EXISTS (
                SELECT 1 FROM retos_niveles WHERE orden = :orden
            )
        """), {
            **NIVEL_CUATRO,
            "parametros": json.dumps(PARAMETROS_NIVEL_CUATRO),
        })
        return

    tabla_niveles = sa.table(
        "retos_niveles",
        sa.column("orden", sa.Integer()),
        sa.column("titulo", sa.String()),
        sa.column("descripcion", sa.Text()),
        sa.column("tipo_reto", sa.String()),
        sa.column("parametros_evaluacion", sa.JSON()),
        sa.column("recompensa_estrellas", sa.Integer()),
    )
    existe = bind.execute(
        sa.select(tabla_niveles.c.orden).where(
            tabla_niveles.c.orden == NIVEL_CUATRO["orden"]
        )
    ).scalar()
    if existe is None:
        bind.execute(tabla_niveles.insert().values(
            orden=NIVEL_CUATRO["orden"],
            titulo=NIVEL_CUATRO["titulo"],
            descripcion=NIVEL_CUATRO["descripcion"],
            tipo_reto=NIVEL_CUATRO["tipo_reto"],
            parametros_evaluacion=PARAMETROS_NIVEL_CUATRO,
            recompensa_estrellas=NIVEL_CUATRO["recompensa"],
        ))


def downgrade() -> None:
    bind = op.get_bind()
    if "retos_niveles" not in sa.inspect(bind).get_table_names():
        return

    bind.execute(sa.text("DELETE FROM retos_niveles WHERE orden = 4"))
