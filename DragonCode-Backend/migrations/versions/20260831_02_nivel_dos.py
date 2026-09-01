"""Registra los datos oficiales de los niveles 1 y 2.

Revision ID: 20260831_02
Revises: 20260824_01
"""
import json
from typing import Optional

from alembic import op
import sqlalchemy as sa

revision: str = "20260831_02"
down_revision: Optional[str] = "20260824_01"
branch_labels = None
depends_on = None


PARAMETROS_BASE = {
    "tiempo_3_estrellas": 60,
    "tiempo_2_estrellas": 120,
    "intentos_max_sin_penalidad": 3,
    "anti_copia": False,
    "fases_seleccionadas": [1, 2, 3, 4],
}

NIVELES_OFICIALES = (
    {
        "orden": 1,
        "titulo": "El Laberinto del Ogro",
        "descripcion": (
            "Aprende pensamiento algorítmico resolviendo cuatro fases de "
            "secuenciación y movimiento."
        ),
        "tipo_reto": "laberinto",
        "recompensa": 5,
    },
    {
        "orden": 2,
        "titulo": "Taladro a Vapor",
        "descripcion": (
            "Resuelve cuatro fases programando eventos y condicionales para "
            "mantener estable un taladro mágico."
        ),
        "tipo_reto": "eventos",
        "recompensa": 5,
    },
)


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
        # Se conserva compatibilidad con instalaciones antiguas que sí hayan
        # creado un enum nativo. Supabase utiliza VARCHAR y no entra aquí.
        with op.get_context().autocommit_block():
            op.execute("ALTER TYPE tiporeto ADD VALUE IF NOT EXISTS 'eventos'")

    if bind.dialect.name == "postgresql":
        expresion_tipo = "CAST(:tipo_reto AS tiporeto)" if usa_enum_nativo else ":tipo_reto"
        consulta = sa.text(f"""
            INSERT INTO retos_niveles
                (orden, titulo, descripcion, tipo_reto,
                 parametros_evaluacion, recompensa_estrellas)
            SELECT
                :orden, :titulo, :descripcion, {expresion_tipo},
                CAST(:parametros AS JSON), :recompensa
            WHERE NOT EXISTS (
                SELECT 1 FROM retos_niveles WHERE orden = :orden
            )
        """)
        for nivel in NIVELES_OFICIALES:
            bind.execute(consulta, {
                **nivel,
                "parametros": json.dumps(PARAMETROS_BASE),
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
    for nivel in NIVELES_OFICIALES:
        existe = bind.execute(
            sa.select(tabla_niveles.c.orden).where(
                tabla_niveles.c.orden == nivel["orden"]
            )
        ).scalar()
        if existe is None:
            bind.execute(tabla_niveles.insert().values(
                orden=nivel["orden"],
                titulo=nivel["titulo"],
                descripcion=nivel["descripcion"],
                tipo_reto=nivel["tipo_reto"],
                parametros_evaluacion=PARAMETROS_BASE,
                recompensa_estrellas=nivel["recompensa"],
            ))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "retos_niveles" not in inspector.get_table_names():
        return

    # Se retira únicamente el Nivel 2. El Nivel 1 pudo existir antes de esta
    # migración y se preserva para que un downgrade nunca borre trabajo previo.
    bind.execute(sa.text("DELETE FROM retos_niveles WHERE orden = 2"))
