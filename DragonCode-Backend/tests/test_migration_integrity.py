"""Ejecuta la migración de unicidad sobre una base temporal en revisión 06."""

from __future__ import annotations

import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from sqlalchemy import JSON, Column, Integer, MetaData, String, Table, Text, create_engine, inspect, select


BACKEND_DIR = Path(__file__).resolve().parents[1]
REVISION_ANTERIOR = "20260902_06"


class MigracionIntegridadTests(unittest.TestCase):
    def setUp(self):
        self.temporal = tempfile.TemporaryDirectory(prefix="dragoncode-migration-")
        self.addCleanup(self.temporal.cleanup)
        self.ruta_db = Path(self.temporal.name) / "integridad.sqlite3"
        self.url = f"sqlite:///{self.ruta_db.as_posix()}"
        self.engine = create_engine(self.url)
        self.addCleanup(self.engine.dispose)
        self._crear_esquema_revision_06()
        self._alembic("stamp", REVISION_ANTERIOR, comprobar=True)

    def _crear_esquema_revision_06(self) -> None:
        metadata = MetaData()
        Table(
            "aula_jugadores", metadata,
            Column("id", String, primary_key=True),
            Column("aula_id", String, nullable=False),
            Column("jugador_id", String, nullable=False),
        )
        Table(
            "progreso_jugador", metadata,
            Column("id", String, primary_key=True),
            Column("jugador_id", String, nullable=False),
            Column("reto_nivel_id", Integer, nullable=False),
        )
        Table(
            "progreso_aula", metadata,
            Column("id", String, primary_key=True),
            Column("jugador_id", String, nullable=False),
            Column("reto_personalizado_id", String, nullable=False),
        )
        metadata.create_all(self.engine)

    def _alembic(self, *argumentos: str, comprobar: bool = False):
        entorno = os.environ.copy()
        entorno.update({"DATABASE_URL": self.url, "PYTHONUTF8": "1"})
        return subprocess.run(
            [sys.executable, "-m", "alembic", *argumentos],
            cwd=BACKEND_DIR,
            env=entorno,
            text=True,
            encoding="utf-8",
            capture_output=True,
            check=comprobar,
        )

    def test_upgrade_agrega_las_tres_restricciones_y_es_repetible(self):
        resultado = self._alembic("upgrade", "head")
        self.assertEqual(resultado.returncode, 0, resultado.stderr)

        inspector = inspect(self.engine)
        esperadas = {
            "aula_jugadores": ("aula_id", "jugador_id"),
            "progreso_jugador": ("jugador_id", "reto_nivel_id"),
            "progreso_aula": ("jugador_id", "reto_personalizado_id"),
        }
        for tabla, columnas in esperadas.items():
            with self.subTest(tabla=tabla):
                restricciones = {
                    tuple(restriccion["column_names"])
                    for restriccion in inspector.get_unique_constraints(tabla)
                }
                self.assertIn(columnas, restricciones)

        repeticion = self._alembic("upgrade", "head")
        self.assertEqual(repeticion.returncode, 0, repeticion.stderr)

    def test_upgrade_se_detiene_sin_borrar_duplicados(self):
        with self.engine.begin() as conexion:
            conexion.exec_driver_sql(
                "INSERT INTO aula_jugadores (id, aula_id, jugador_id) VALUES "
                "('1', 'aula', 'jugador'), ('2', 'aula', 'jugador')"
            )

        resultado = self._alembic("upgrade", "head")
        self.assertNotEqual(resultado.returncode, 0)
        self.assertIn("contiene registros duplicados", resultado.stderr)

        with self.engine.connect() as conexion:
            total = conexion.exec_driver_sql(
                "SELECT COUNT(*) FROM aula_jugadores WHERE aula_id='aula' AND jugador_id='jugador'"
            ).scalar_one()
            revision = conexion.exec_driver_sql("SELECT version_num FROM alembic_version").scalar_one()
        self.assertEqual(total, 2)
        self.assertEqual(revision, REVISION_ANTERIOR)


class MigracionNivelesFinalesTests(unittest.TestCase):
    """Valida el salto que deberá realizar la base remota desde la revisión 04."""

    def setUp(self):
        self.temporal = tempfile.TemporaryDirectory(prefix="dragoncode-levels-migration-")
        self.addCleanup(self.temporal.cleanup)
        self.ruta_db = Path(self.temporal.name) / "niveles.sqlite3"
        self.url = f"sqlite:///{self.ruta_db.as_posix()}"
        self.engine = create_engine(self.url)
        self.addCleanup(self.engine.dispose)

        metadata = MetaData()
        self.niveles = Table(
            "retos_niveles", metadata,
            Column("id", Integer, primary_key=True, autoincrement=True),
            Column("orden", Integer, nullable=False, unique=True),
            Column("titulo", String, nullable=False),
            Column("descripcion", Text, nullable=False),
            Column("tipo_reto", String, nullable=False),
            Column("parametros_evaluacion", JSON, nullable=False),
            Column("recompensa_estrellas", Integer, nullable=False),
        )
        Table(
            "aula_jugadores", metadata,
            Column("id", String, primary_key=True),
            Column("aula_id", String, nullable=False),
            Column("jugador_id", String, nullable=False),
        )
        Table(
            "progreso_jugador", metadata,
            Column("id", String, primary_key=True),
            Column("jugador_id", String, nullable=False),
            Column("reto_nivel_id", Integer, nullable=False),
        )
        Table(
            "progreso_aula", metadata,
            Column("id", String, primary_key=True),
            Column("jugador_id", String, nullable=False),
            Column("reto_personalizado_id", String, nullable=False),
        )
        metadata.create_all(self.engine)
        with self.engine.begin() as conexion:
            conexion.execute(self.niveles.insert(), [
                {
                    "orden": orden,
                    "titulo": f"Nivel {orden}",
                    "descripcion": "Existente",
                    "tipo_reto": "laberinto",
                    "parametros_evaluacion": {"fases_seleccionadas": [1, 2, 3, 4]},
                    "recompensa_estrellas": 5,
                }
                for orden in (1, 2, 3)
            ])
        self._alembic("stamp", "20260901_04", comprobar=True)

    def _alembic(self, *argumentos: str, comprobar: bool = False):
        entorno = os.environ.copy()
        entorno.update({"DATABASE_URL": self.url, "PYTHONUTF8": "1"})
        return subprocess.run(
            [sys.executable, "-m", "alembic", *argumentos],
            cwd=BACKEND_DIR,
            env=entorno,
            text=True,
            encoding="utf-8",
            capture_output=True,
            check=comprobar,
        )

    def test_upgrade_desde_revision_cuatro_registra_niveles_cuatro_y_cinco(self):
        resultado = self._alembic("upgrade", "head")
        self.assertEqual(resultado.returncode, 0, resultado.stderr)

        with self.engine.connect() as conexion:
            filas = conexion.execute(
                select(self.niveles).order_by(self.niveles.c.orden)
            ).mappings().all()
            revision = conexion.exec_driver_sql(
                "SELECT version_num FROM alembic_version"
            ).scalar_one()

        self.assertEqual([fila["orden"] for fila in filas], [1, 2, 3, 4, 5])
        self.assertEqual((filas[3]["titulo"], filas[3]["tipo_reto"]),
                         ("Control de Calidad", "control_flujo"))
        self.assertEqual((filas[4]["titulo"], filas[4]["tipo_reto"]),
                         ("Producción en Masa", "bucles"))
        self.assertEqual(filas[3]["parametros_evaluacion"]["fases_seleccionadas"], [1, 2, 3, 4])
        self.assertEqual(filas[4]["parametros_evaluacion"]["fases_seleccionadas"], [1, 2, 3, 4])
        self.assertEqual(filas[1]["parametros_evaluacion"]["fases_seleccionadas"], [1, 2, 3])
        self.assertIn("tres fases", filas[1]["descripcion"])
        self.assertEqual(revision, "20260915_08")

        repeticion = self._alembic("upgrade", "head")
        self.assertEqual(repeticion.returncode, 0, repeticion.stderr)
        with self.engine.connect() as conexion:
            self.assertEqual(len(conexion.execute(select(self.niveles.c.id)).all()), 5)

    def test_upgrade_conserva_un_nivel_cuatro_preexistente(self):
        with self.engine.begin() as conexion:
            conexion.execute(self.niveles.insert().values(
                orden=4,
                titulo="Nivel 4 editado por el equipo",
                descripcion="No sobrescribir",
                tipo_reto="control_flujo",
                parametros_evaluacion={"fases_seleccionadas": [1]},
                recompensa_estrellas=9,
            ))

        resultado = self._alembic("upgrade", "head")
        self.assertEqual(resultado.returncode, 0, resultado.stderr)
        with self.engine.connect() as conexion:
            nivel_cuatro = conexion.execute(
                select(self.niveles).where(self.niveles.c.orden == 4)
            ).mappings().one()
        self.assertEqual(nivel_cuatro["titulo"], "Nivel 4 editado por el equipo")
        self.assertEqual(nivel_cuatro["recompensa_estrellas"], 9)


if __name__ == "__main__":
    unittest.main()
