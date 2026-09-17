import unittest

from sqlalchemy import create_engine, inspect

from app.database import Base


class RestriccionesIntegridadTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://")
        self.addCleanup(self.engine.dispose)
        Base.metadata.create_all(self.engine)

    def test_relaciones_criticas_declaran_su_unicidad(self):
        inspector = inspect(self.engine)
        esperadas = {
            "aula_jugadores": {"aula_id", "jugador_id"},
            "progreso_jugador": {"jugador_id", "reto_nivel_id"},
            "progreso_aula": {"jugador_id", "reto_personalizado_id"},
        }
        for tabla, columnas in esperadas.items():
            with self.subTest(tabla=tabla):
                restricciones = [
                    set(restriccion["column_names"])
                    for restriccion in inspector.get_unique_constraints(tabla)
                ]
                self.assertIn(columnas, restricciones)


if __name__ == "__main__":
    unittest.main()
