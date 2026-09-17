import unittest

from app.core.scoring import calcular_calificacion, calcular_estrellas


class CalcularEstrellasTests(unittest.TestCase):
    def test_rubrica_por_vidas_y_ayudas(self):
        for vidas, ayudas, esperadas in ((3, False, 3), (3, True, 2), (2, False, 2),
                                        (2, True, 1), (1, False, 1), (1, True, 1)):
            with self.subTest(vidas=vidas, ayudas=ayudas):
                self.assertEqual(calcular_estrellas(vidas, ayudas), esperadas)

class CalcularCalificacionTests(unittest.TestCase):
    def test_aplica_la_rubrica_documentada(self):
        casos = {1: 10, 2: 8, 3: 8, 4: 6, 10: 6}
        for intentos, esperada in casos.items():
            with self.subTest(intentos=intentos):
                self.assertEqual(calcular_calificacion(intentos), esperada)


if __name__ == "__main__":
    unittest.main()
