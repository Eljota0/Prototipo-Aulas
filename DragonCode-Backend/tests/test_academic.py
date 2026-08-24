import unittest
from datetime import datetime, timedelta, timezone

from app.core.academic import (
    calcular_resumen_calificaciones,
    estado_academico,
    normalizar_fecha_utc,
    plazo_vencido,
)


class FechasAcademicasTests(unittest.TestCase):
    def test_normaliza_una_fecha_de_ecuador_a_utc(self):
        ecuador = timezone(timedelta(hours=-5))
        fecha_local = datetime(2026, 8, 24, 10, 0, tzinfo=ecuador)
        self.assertEqual(normalizar_fecha_utc(fecha_local), datetime(2026, 8, 24, 15, 0))

    def test_detecta_un_plazo_vencido(self):
        ahora = datetime(2026, 8, 24, 15, 0)
        self.assertTrue(plazo_vencido(datetime(2026, 8, 24, 14, 59), ahora))
        self.assertFalse(plazo_vencido(datetime(2026, 8, 24, 15, 1), ahora))

    def test_prioriza_cierre_manual_sobre_vencimiento(self):
        ahora = datetime(2026, 8, 24, 15, 0)
        self.assertEqual(
            estado_academico(
                "publicado",
                datetime(2026, 8, 24, 14, 0),
                datetime(2026, 8, 24, 13, 0),
                ahora,
            ),
            "cerrada",
        )

    def test_marca_una_actividad_vencida_sin_cierre_manual(self):
        self.assertEqual(
            estado_academico(
                "publicado",
                datetime(2026, 8, 24, 14, 0),
                None,
                datetime(2026, 8, 24, 15, 0),
            ),
            "vencida",
        )


class ResumenAcademicoTests(unittest.TestCase):
    def test_calcula_completados_pendientes_y_promedio(self):
        self.assertEqual(
            calcular_resumen_calificaciones([10, 8, 6], 5),
            {
                "total_jugadores": 5,
                "completados": 3,
                "pendientes": 2,
                "promedio_calificacion": 8.0,
            },
        )

    def test_retorna_promedio_cero_si_no_hay_entregas(self):
        self.assertEqual(
            calcular_resumen_calificaciones([], 2)["promedio_calificacion"],
            0.0,
        )


if __name__ == "__main__":
    unittest.main()
