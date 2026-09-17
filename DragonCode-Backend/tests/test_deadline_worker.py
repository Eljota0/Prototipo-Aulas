import asyncio
import os
import unittest
from unittest.mock import patch

from app.main import _intervalo_revision_vencimientos, _vigilar_vencimientos


class _SesionFalsa:
    def __init__(self):
        self.commits = 0

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def commit(self):
        self.commits += 1


class VigilanteVencimientosTests(unittest.IsolatedAsyncioTestCase):
    def test_intervalo_seguro_acepta_configuracion_y_corrige_valores(self):
        with patch.dict(os.environ, {"ACADEMIC_DEADLINE_CHECK_SECONDS": "15"}):
            self.assertEqual(_intervalo_revision_vencimientos(), 15)
        with patch.dict(os.environ, {"ACADEMIC_DEADLINE_CHECK_SECONDS": "1"}):
            self.assertEqual(_intervalo_revision_vencimientos(), 10)
        with patch.dict(os.environ, {"ACADEMIC_DEADLINE_CHECK_SECONDS": "invalido"}):
            self.assertEqual(_intervalo_revision_vencimientos(), 60)

    async def test_confirma_una_revision_con_vencimientos(self):
        detener = asyncio.Event()
        sesion = _SesionFalsa()

        def procesar(db):
            self.assertIs(db, sesion)
            detener.set()
            return 2

        with patch("app.main.SessionLocal", return_value=sesion), patch(
            "app.main.cerrar_retos_vencidos", side_effect=procesar
        ):
            await _vigilar_vencimientos(detener)

        self.assertEqual(sesion.commits, 1)

    async def test_un_fallo_temporal_no_escapa_del_vigilante(self):
        detener = asyncio.Event()
        sesion = _SesionFalsa()

        def fallar(_):
            detener.set()
            raise RuntimeError("base temporalmente inaccesible")

        with patch("app.main.SessionLocal", return_value=sesion), patch(
            "app.main.cerrar_retos_vencidos", side_effect=fallar
        ), patch("app.main.logger.exception") as registrar:
            await _vigilar_vencimientos(detener)

        self.assertEqual(sesion.commits, 0)
        registrar.assert_called_once()


if __name__ == "__main__":
    unittest.main()
