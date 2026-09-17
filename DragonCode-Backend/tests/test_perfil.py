"""Pruebas HTTP con autenticación real y una base SQLite aislada por prueba."""

import unittest
from datetime import timedelta
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token, create_user_access_token
from app.database import Base, get_db
from app.models.models import RolUsuario, Usuario
from app.routes.usuarios import router


class ActualizarPerfilTests(unittest.TestCase):
    def setUp(self):
        # No importar app.main: su arranque crea tablas en la base configurada.
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        self.addCleanup(self.engine.dispose)
        Base.metadata.create_all(self.engine)
        self.sessions = sessionmaker(bind=self.engine)
        with self.sessions() as db:
            jugador = Usuario(
                nombre="José", apellido="Quinatoa", email="jugador@dragoncode.test",
                password_hash="hash-de-prueba", estrellas_totales=7,
                avatares_desbloqueados=[],
            )
            otro = Usuario(
                nombre="Ana", apellido="Pérez", email="otra@dragoncode.test",
                password_hash="otro-hash",
            )
            db.add_all([jugador, otro])
            db.commit()
            self.jugador_id = jugador.id
            self.otro_id = otro.id
            self.token = create_user_access_token(jugador)

        app = FastAPI()
        app.include_router(router, prefix="/api/usuarios")

        def base_de_prueba():
            with self.sessions() as db:
                yield db

        app.dependency_overrides[get_db] = base_de_prueba
        self.client = TestClient(app)
        self.addCleanup(self.client.close)
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def guardar(self, datos):
        return self.client.patch("/api/usuarios/me", json=datos, headers=self.headers)

    def test_guarda_nombre_y_lo_recupera_en_otra_peticion_sin_alterar_la_cuenta(self):
        anterior = self.client.get("/api/usuarios/me", headers=self.headers).json()
        respuesta = self.guardar({"nombre": "  José Andrés  "})
        self.assertEqual(respuesta.status_code, 200, respuesta.text)
        esperado = {**anterior, "nombre": "José Andrés"}
        self.assertEqual(respuesta.json(), esperado)
        self.assertNotIn("password_hash", respuesta.json())
        # GET crea otra sesión de BD: no es el estado en memoria del PATCH.
        lectura = self.client.get("/api/usuarios/me", headers=self.headers)
        self.assertEqual(lectura.json(), esperado)
        with self.sessions() as db:
            self.assertEqual(db.get(Usuario, self.jugador_id).password_hash, "hash-de-prueba")
            self.assertEqual(db.get(Usuario, self.otro_id).nombre, "Ana")

    def test_actualiza_apellido_sin_enviar_nombre(self):
        respuesta = self.guardar({"apellido": "  de la Peña O’Connor  "})
        self.assertEqual(respuesta.status_code, 200, respuesta.text)
        with self.sessions() as db:
            jugador = db.get(Usuario, self.jugador_id)
            self.assertEqual(jugador.nombre, "José")
            self.assertEqual(jugador.apellido, "de la Peña O’Connor")

    def test_actualiza_ambos_nombres_y_acepta_cien_caracteres(self):
        respuesta = self.guardar({"nombre": "Á" * 100, "apellido": "Peña-Gómez"})
        self.assertEqual(respuesta.status_code, 200, respuesta.text)
        with self.sessions() as db:
            jugador = db.get(Usuario, self.jugador_id)
            self.assertEqual(jugador.nombre, "Á" * 100)
            self.assertEqual(jugador.apellido, "Peña-Gómez")

    def test_rechaza_valores_vacios_nulos_demasiado_largos_y_no_textuales(self):
        for campo in ("nombre", "apellido"):
            for valor in (None, "", " \t ", "a" * 101, 12, True, [], {}, "Ana\nMaría", "Ana\x00"):
                with self.subTest(campo=campo, valor=valor):
                    respuesta = self.guardar({campo: valor})
                    self.assertEqual(respuesta.status_code, 422, respuesta.text)
        self.assertEqual(self.guardar({}).status_code, 422)
        with self.sessions() as db:
            jugador = db.get(Usuario, self.jugador_id)
            self.assertEqual((jugador.nombre, jugador.apellido), ("José", "Quinatoa"))

    def test_rechaza_campos_ajenos_sin_aplicar_parcialmente_la_solicitud(self):
        otros_campos = {
            "id": self.otro_id,
            "email": "otro@dragoncode.test",
            "password": "clave",
            "password_hash": "hash",
            "rol": "admin",
            "estrellas_totales": 999,
            "avatar_actual_id": 9,
            "avatares_desbloqueados": [1, 2],
        }
        for campo, valor in otros_campos.items():
            with self.subTest(campo=campo):
                respuesta = self.guardar({"nombre": "Intento", campo: valor})
                self.assertEqual(respuesta.status_code, 422, respuesta.text)
        with self.sessions() as db:
            jugador = db.get(Usuario, self.jugador_id)
            self.assertEqual(jugador.nombre, "José")
            self.assertEqual(jugador.rol, RolUsuario.jugador)
            self.assertEqual(jugador.estrellas_totales, 7)
            self.assertEqual(db.get(Usuario, self.otro_id).nombre, "Ana")

    def test_exige_sesion_valida_y_vigente(self):
        expirado = create_access_token(
            {"sub": "jugador@dragoncode.test"}, expires_delta=timedelta(minutes=-1)
        )
        inexistente = create_access_token({"sub": "no-existe@dragoncode.test"})
        for token in (None, "token-invalido", expirado, inexistente):
            with self.subTest(token_tipo="ausente" if token is None else "invalido"):
                headers = {"Authorization": f"Bearer {token}"} if token else {}
                respuesta = self.client.patch(
                    "/api/usuarios/me", json={"nombre": "Intruso"}, headers=headers
                )
                self.assertEqual(respuesta.status_code, 401, respuesta.text)
        with self.sessions() as db:
            self.assertEqual(db.get(Usuario, self.jugador_id).nombre, "José")

    def test_revierte_la_transaccion_si_falla_la_escritura_y_permite_reintentar(self):
        with patch.object(self.sessions.class_, "commit", side_effect=SQLAlchemyError("fallo interno")):
            respuesta = self.guardar({"nombre": "Intento", "apellido": "Fallido"})
        self.assertEqual(respuesta.status_code, 500)
        self.assertNotIn("fallo interno", respuesta.text)
        with self.sessions() as db:
            jugador = db.get(Usuario, self.jugador_id)
            self.assertEqual((jugador.nombre, jugador.apellido), ("José", "Quinatoa"))
        self.assertEqual(self.guardar({"nombre": "Guardado"}).status_code, 200)


if __name__ == "__main__":
    unittest.main()
