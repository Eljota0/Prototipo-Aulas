"""Configuración de producción y rutas de salud sin conectarse a Supabase."""

import unittest
from unittest.mock import Mock, patch

from fastapi import HTTPException
from sqlalchemy.exc import OperationalError

from app.core.runtime import crear_esquema_al_arrancar, validar_configuracion_produccion
from app.routes.health import live, ready


class ConfiguracionProduccionTests(unittest.TestCase):
    def test_desarrollo_conserva_los_valores_locales(self):
        with patch.dict("os.environ", {"APP_ENV": "development"}, clear=True):
            validar_configuracion_produccion()

    def test_produccion_rechaza_secretos_base_y_cors_locales(self):
        entorno = {
            "APP_ENV": "production",
            "SECRET_KEY": "dragoncode_super_secret_key_2026",
            "DATABASE_URL": "sqlite:///./dragoncode.db",
            "CORS_ORIGINS": "http://localhost:4300,*",
            "ALGORITHM": "none",
        }
        with patch.dict("os.environ", entorno, clear=True):
            with self.assertRaises(RuntimeError) as contexto:
                validar_configuracion_produccion()
        mensaje = str(contexto.exception)
        for nombre in ("SECRET_KEY", "DATABASE_URL", "CORS_ORIGINS", "ALGORITHM"):
            self.assertIn(nombre, mensaje)
        self.assertNotIn(entorno["SECRET_KEY"], mensaje)

    def test_produccion_acepta_configuracion_segura(self):
        entorno = {
            "APP_ENV": "production",
            "SECRET_KEY": "una-clave-aleatoria-de-produccion-con-mas-de-32-caracteres",
            "DATABASE_URL": "postgresql://usuario:clave@db.example.com/dragoncode",
            "CORS_ORIGINS": "https://dragoncode.example.com",
            "ALGORITHM": "HS256",
        }
        with patch.dict("os.environ", entorno, clear=True):
            validar_configuracion_produccion()
            self.assertFalse(crear_esquema_al_arrancar())

    def test_produccion_rechaza_creacion_automatica_de_tablas(self):
        entorno = {
            "APP_ENV": "production",
            "SECRET_KEY": "una-clave-aleatoria-de-produccion-con-mas-de-32-caracteres",
            "DATABASE_URL": "postgresql://usuario:clave@db.example.com/dragoncode",
            "CORS_ORIGINS": "https://dragoncode.example.com",
            "ALGORITHM": "HS256",
            "AUTO_CREATE_SCHEMA": "true",
        }
        with patch.dict("os.environ", entorno, clear=True):
            with self.assertRaisesRegex(RuntimeError, "AUTO_CREATE_SCHEMA"):
                validar_configuracion_produccion()


class SaludServicioTests(unittest.TestCase):
    def test_live_no_necesita_base_de_datos(self):
        self.assertEqual(live(), {"status": "ok"})

    def test_ready_confirma_la_conexion(self):
        db = Mock()
        self.assertEqual(ready(db), {"status": "ok", "database": "available"})
        db.execute.assert_called_once()

    def test_ready_oculta_el_error_interno(self):
        db = Mock()
        db.execute.side_effect = OperationalError("SELECT 1", {}, Exception("secreto"))
        with self.assertRaises(HTTPException) as contexto:
            ready(db)
        self.assertEqual(contexto.exception.status_code, 503)
        self.assertNotIn("secreto", contexto.exception.detail)


if __name__ == "__main__":
    unittest.main()
