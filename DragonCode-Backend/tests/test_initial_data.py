import unittest

try:
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
except ModuleNotFoundError as exc:
    raise unittest.SkipTest(
        "Instala las dependencias de requirements.txt para probar la inicialización."
    ) from exc

from app.database import Base
from app.initial_data import seed_initial_data
from app.models.models import RetoNivel, TipoReto


class InitialDataTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=self.engine)
        self.session = sessionmaker(bind=self.engine)()

    def tearDown(self):
        self.session.close()
        self.engine.dispose()

    def test_registra_los_cinco_niveles_sin_duplicarlos(self):
        self.assertTrue(seed_initial_data(self.session))
        self.assertFalse(seed_initial_data(self.session))

        niveles = self.session.query(RetoNivel).order_by(RetoNivel.orden).all()
        self.assertEqual([nivel.orden for nivel in niveles], [1, 2, 3, 4, 5])
        self.assertEqual(niveles[1].titulo, "Taladro a Vapor")
        self.assertEqual(niveles[1].tipo_reto, TipoReto.eventos)
        self.assertEqual(niveles[2].titulo, "La Cueva de las Variables")
        self.assertEqual(niveles[2].tipo_reto, TipoReto.variables)
        self.assertEqual(
            niveles[2].parametros_evaluacion["fases_seleccionadas"],
            [1, 2, 3, 4],
        )
        self.assertEqual(niveles[3].titulo, "Control de Calidad")
        self.assertEqual(niveles[3].tipo_reto, TipoReto.control_flujo)
        self.assertEqual(niveles[3].parametros_evaluacion["tiempo_3_estrellas"], 75)
        self.assertEqual(niveles[4].titulo, "Producción en Masa")
        self.assertEqual(niveles[4].tipo_reto, TipoReto.bucles)
        self.assertEqual(niveles[4].parametros_evaluacion["tiempo_3_estrellas"], 100)


if __name__ == "__main__":
    unittest.main()
