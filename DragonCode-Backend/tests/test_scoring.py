import unittest

from app.core.scoring import calcular_calificacion, calcular_estrellas


class CalcularEstrellasTests(unittest.TestCase):
    parametros = {
        "tiempo_3_estrellas": 60,
        "tiempo_2_estrellas": 120,
        "intentos_max_sin_penalidad": 2,
    }

    def test_otorga_tres_estrellas_en_el_primer_umbral(self):
        self.assertEqual(calcular_estrellas(60, 1, self.parametros), 3)

    def test_otorga_dos_estrellas_en_el_segundo_umbral(self):
        self.assertEqual(calcular_estrellas(120, 1, self.parametros), 2)

    def test_otorga_una_estrella_fuera_del_segundo_umbral(self):
        self.assertEqual(calcular_estrellas(121, 1, self.parametros), 1)

    def test_penaliza_un_intento_excesivo_sin_bajar_de_una_estrella(self):
        self.assertEqual(calcular_estrellas(60, 3, self.parametros), 2)
        self.assertEqual(calcular_estrellas(121, 3, self.parametros), 1)


class CalcularCalificacionTests(unittest.TestCase):
    def test_aplica_la_rubrica_documentada(self):
        casos = {1: 10, 2: 8, 3: 6, 10: 6}
        for intentos, esperada in casos.items():
            with self.subTest(intentos=intentos):
                self.assertEqual(calcular_calificacion(intentos), esperada)


if __name__ == "__main__":
    unittest.main()
