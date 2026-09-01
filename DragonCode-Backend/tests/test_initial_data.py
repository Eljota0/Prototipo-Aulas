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

    def test_registra_los_dos_niveles_sin_duplicarlos(self):
        self.assertTrue(seed_initial_data(self.session))
        self.assertFalse(seed_initial_data(self.session))

        niveles = self.session.query(RetoNivel).order_by(RetoNivel.orden).all()
        self.assertEqual([nivel.orden for nivel in niveles], [1, 2])
        self.assertEqual(niveles[1].titulo, "Taladro a Vapor")
        self.assertEqual(niveles[1].tipo_reto, TipoReto.eventos)


if __name__ == "__main__":
    unittest.main()
