"""Cambio de contraseña y sesiones: HTTP real sobre SQLite aislado, nunca Supabase."""

import unittest
from datetime import timedelta
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
import jwt
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Query, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.academic import ahora_utc
from app.core.security import (
    ALGORITHM, SECRET_KEY, create_access_token, get_password_hash, verify_password,
)
from app.database import Base, get_db
from app.models.models import Usuario
from app.routes import auth, usuarios


class CambiarPasswordTests(unittest.TestCase):
    anterior = "PruebaAnterior1!"
    nueva = "PruebaNueva2026!"
    email = "jugador@example.com"

    @classmethod
    def setUpClass(cls):
        cls.hash_inicial = get_password_hash(cls.anterior)

    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool,
        )
        self.addCleanup(self.engine.dispose)
        Base.metadata.create_all(self.engine)
        self.sessions = sessionmaker(bind=self.engine)
        with self.sessions() as db:
            jugador = Usuario(nombre="José", apellido="Peña", email=self.email,
                              password_hash=self.hash_inicial, estrellas_totales=7)
            otro = Usuario(nombre="Otra", apellido="Cuenta", email="otra@example.com",
                           password_hash=self.hash_inicial)
            db.add_all([jugador, otro])
            db.commit()
            self.usuario_id, self.otro_id = jugador.id, otro.id

        # app.main NO se importa, pues inicializa la base configurada al arrancar.
        app = FastAPI()
        app.include_router(auth.router, prefix="/api/auth")
        app.include_router(usuarios.router, prefix="/api/usuarios")

        def database():
            with self.sessions() as db:
                yield db

        app.dependency_overrides[get_db] = database
        self.client = TestClient(app)
        self.addCleanup(self.client.close)
        login = self.login(self.anterior)
        self.assertEqual(login.status_code, 200, login.text)
        self.token = login.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def login(self, password, email=None):
        return self.client.post("/api/auth/login", json={"email": email or self.email, "password": password})

    def cambiar(self, actual=None, nueva=None, **campos):
        return self.client.patch("/api/auth/password", headers=self.headers, json={
            "password_actual": self.anterior if actual is None else actual,
            "password_nueva": self.nueva if nueva is None else nueva,
            **campos,
        })

    def hash_actual(self):
        with self.sessions() as db:
            return db.get(Usuario, self.usuario_id).password_hash

    def test_guarda_hash_cierra_sesiones_y_permite_login_solo_con_la_nueva(self):
        sesion_swagger = self.client.post("/api/auth/token", data={
            "username": self.email, "password": self.anterior,
        })
        self.assertEqual(sesion_swagger.status_code, 200)
        tokens = [self.token, sesion_swagger.json()["access_token"]]
        otro_token = self.login(self.anterior, "otra@example.com").json()["access_token"]
        respuesta = self.cambiar()
        self.assertEqual(respuesta.status_code, 204, respuesta.text)
        self.assertEqual(respuesta.content, b"")
        self.assertNotEqual(self.hash_actual(), self.hash_inicial)
        self.assertNotIn(self.nueva, self.hash_actual())
        self.assertTrue(verify_password(self.nueva, self.hash_actual()))
        for token in tokens:
            headers = {"Authorization": f"Bearer {token}"}
            self.assertEqual(self.client.get("/api/usuarios/me", headers=headers).status_code, 401)
            self.assertEqual(self.client.patch("/api/usuarios/me", headers=headers, json={"nombre": "Intruso"}).status_code, 401)
        self.assertEqual(self.login(self.anterior).status_code, 401)
        login = self.login(self.nueva)
        self.assertEqual(login.status_code, 200)
        perfil = self.client.get("/api/usuarios/me", headers={"Authorization": f"Bearer {login.json()['access_token']}"})
        self.assertEqual(perfil.status_code, 200)
        self.assertEqual((perfil.json()["nombre"], perfil.json()["estrellas_totales"]), ("José", 7))
        self.assertNotIn("password_hash", perfil.json())
        self.assertEqual(self.client.get("/api/usuarios/me", headers={"Authorization": f"Bearer {otro_token}"}).status_code, 200)
        with self.sessions() as db:
            self.assertEqual(db.get(Usuario, self.otro_id).password_hash, self.hash_inicial)

    def test_password_actual_incorrecta_no_guarda_ni_invalida_la_sesion(self):
        respuesta = self.cambiar(actual="NoEsLaClave1!")
        self.assertEqual(respuesta.status_code, 400)
        self.assertNotIn("NoEsLaClave1!", respuesta.text)
        self.assertEqual(self.hash_actual(), self.hash_inicial)
        self.assertEqual(self.client.get("/api/usuarios/me", headers=self.headers).status_code, 200)
        self.assertEqual(self.cambiar().status_code, 204)

    def test_no_permite_reutilizar_la_clave_actual(self):
        self.assertEqual(self.cambiar(nueva=self.anterior).status_code, 409)
        self.assertEqual(self.hash_actual(), self.hash_inicial)

    def test_validacion_no_devuelve_secretos_ni_escribe_datos(self):
        base = {"password_actual": self.anterior, "password_nueva": self.nueva}
        invalidos = [None, "", 123, True, [], {}, "Ab1!", "abcdef1!", "Abcdef!!", "Abcdef12",
                     "Ab1!" + "a" * 69, "Á" * 35 + "A1!", "Nueva1!\n", "Nueva1!\0"]
        for valor in invalidos:
            with self.subTest(tipo=type(valor).__name__):
                respuesta = self.client.patch("/api/auth/password", headers=self.headers,
                                              json={**base, "password_nueva": valor})
                self.assertEqual(respuesta.status_code, 422, respuesta.text)
                self.assertNotIn(self.anterior, respuesta.text)
                self.assertNotIn('"input"', respuesta.text)
        for datos in ({}, {"password_nueva": self.nueva}, {**base, "password_actual": None},
                      {**base, "password_actual": 12}, {**base, "password_actual": "x" * 1025},
                      {**base, "id": self.otro_id}, {**base, "email": "otra@example.com"}):
            respuesta = self.client.patch("/api/auth/password", headers=self.headers, json=datos)
            self.assertEqual(respuesta.status_code, 422, respuesta.text)
            self.assertNotIn(self.nueva, respuesta.text)
            self.assertNotIn(self.anterior, respuesta.text)
        malformed = self.client.patch("/api/auth/password", headers={**self.headers, "Content-Type": "application/json"},
                                      content='{"password_actual":"SECRETO_INCOMPLETO')
        self.assertEqual(malformed.status_code, 422)
        self.assertNotIn("SECRETO_INCOMPLETO", malformed.text)
        self.assertEqual(self.hash_actual(), self.hash_inicial)

    def test_acepta_72_bytes_y_unicode_sin_recortar_espacios(self):
        nueva = " " + "Á" * 33 + "A1!" + "  "  # 72 bytes UTF-8, espacios significativos.
        self.assertEqual(len(nueva.encode("utf-8")), 72)
        self.assertEqual(self.cambiar(nueva=nueva).status_code, 204)
        self.assertEqual(self.login(nueva).status_code, 200)
        self.assertEqual(self.login(nueva.strip()).status_code, 401)

    def test_exige_token_actual_con_identidad_y_expiracion(self):
        payload = jwt.decode(self.token, SECRET_KEY, algorithms=[ALGORITHM])
        sin_exp = {k: v for k, v in payload.items() if k != "exp"}
        variantes = [None, "invalido", create_access_token({"sub": self.email}),
                     create_access_token(payload, expires_delta=timedelta(seconds=-1)),
                     create_access_token({**payload, "id": self.otro_id}),
                     create_access_token({**payload, "credential_revision": "incorrecta"}),
                     create_access_token({**payload, "credential_revision": "á" * 64}),
                     create_access_token({**payload, "credential_revision": "a" * 64}),
                     jwt.encode(sin_exp, SECRET_KEY, algorithm=ALGORITHM)]
        for token in variantes:
            headers = {"Authorization": f"Bearer {token}"} if token else {}
            respuesta = self.client.patch("/api/auth/password", headers=headers, json={
                "password_actual": self.anterior, "password_nueva": self.nueva,
            })
            self.assertEqual(respuesta.status_code, 401, respuesta.text)
        self.assertEqual(self.hash_actual(), self.hash_inicial)
        self.assertNotIn(self.hash_inicial, str(payload))

    def test_revierte_si_falla_commit_y_permite_reintentar(self):
        with patch.object(self.sessions.class_, "commit", side_effect=SQLAlchemyError("detalle interno")):
            respuesta = self.cambiar()
        self.assertEqual(respuesta.status_code, 500)
        self.assertNotIn("detalle interno", respuesta.text)
        self.assertEqual(self.hash_actual(), self.hash_inicial)
        self.assertEqual(self.client.get("/api/usuarios/me", headers=self.headers).status_code, 200)
        self.assertEqual(self.cambiar().status_code, 204)

    def test_no_pisa_un_cambio_concurrente(self):
        with patch.object(Query, "update", return_value=0):
            respuesta = self.cambiar()
        self.assertEqual(respuesta.status_code, 409)
        self.assertEqual(self.hash_actual(), self.hash_inicial)

    def test_registro_y_login_conservan_su_contrato_y_ocultan_entradas_invalidas(self):
        respuesta = self.client.post("/api/auth/register", json={
            "email": "nuevo@example.com", "password": self.anterior,
            "nombre": "Nuevo", "apellido": "Jugador",
        })
        self.assertEqual(respuesta.status_code, 201, respuesta.text)
        self.assertNotIn("password", respuesta.text)
        token = self.login(self.anterior, "nuevo@example.com").json()["access_token"]
        self.assertEqual(self.client.get("/api/usuarios/me", headers={"Authorization": f"Bearer {token}"}).status_code, 200)
        self.assertEqual(self.login("incorrecta").status_code, 401)
        for ruta in ("/api/auth/register", "/api/auth/login"):
            invalida = self.client.post(ruta, json={"email": "invalido", "password": self.anterior})
            self.assertEqual(invalida.status_code, 422)
            self.assertNotIn(self.anterior, invalida.text)

    def test_login_actualiza_ultimo_acceso_y_no_emite_token_si_falla_la_escritura(self):
        acceso_anterior = ahora_utc() - timedelta(days=2)
        with self.sessions() as db:
            usuario = db.get(Usuario, self.usuario_id)
            usuario.ultimo_acceso = acceso_anterior
            db.commit()

        respuesta = self.login(self.anterior)
        self.assertEqual(respuesta.status_code, 200, respuesta.text)
        with self.sessions() as db:
            self.assertGreater(db.get(Usuario, self.usuario_id).ultimo_acceso, acceso_anterior)

        with patch.object(self.sessions.class_, "commit", side_effect=SQLAlchemyError("detalle interno")):
            fallida = self.login(self.anterior)
        self.assertEqual(fallida.status_code, 503)
        self.assertNotIn("access_token", fallida.text)
        self.assertNotIn("detalle interno", fallida.text)

    def test_registro_valida_datos_y_normaliza_el_correo(self):
        base = {
            "email": "seguro@example.com", "password": self.anterior,
            "nombre": "Jugador", "apellido": "Seguro",
        }
        invalidos = (
            {**base, "password": "simple"},
            {**base, "password": "Ab1!"},
            {**base, "password": "Á" * 35 + "A1!"},
            {**base, "nombre": "   "},
            {**base, "apellido": "Apellido\nInyectado"},
            {**base, "nombre": "x" * 101},
            {**base, "campo_ajeno": "no permitido"},
        )
        with self.sessions() as db:
            total_anterior = db.query(Usuario).count()
        for datos in invalidos:
            with self.subTest(datos=list(datos)):
                respuesta = self.client.post("/api/auth/register", json=datos)
                self.assertEqual(respuesta.status_code, 422, respuesta.text)
                self.assertNotIn(str(datos["password"]), respuesta.text)
        with self.sessions() as db:
            self.assertEqual(db.query(Usuario).count(), total_anterior)

        creada = self.client.post("/api/auth/register", json={
            **base,
            "email": "  Cuenta.Nueva@Example.COM  ",
            "nombre": "  Ana  ",
            "apellido": "  Pérez  ",
        })
        self.assertEqual(creada.status_code, 201, creada.text)
        self.assertEqual(creada.json()["email"], "cuenta.nueva@example.com")
        self.assertEqual((creada.json()["nombre"], creada.json()["apellido"]), ("Ana", "Pérez"))
        self.assertEqual(
            self.login(self.anterior, "CUENTA.NUEVA@EXAMPLE.COM").status_code,
            200,
        )
        duplicada = self.client.post("/api/auth/register", json={
            **base, "email": "Cuenta.Nueva@Example.com",
        })
        self.assertEqual(duplicada.status_code, 400, duplicada.text)


if __name__ == "__main__":
    unittest.main()
