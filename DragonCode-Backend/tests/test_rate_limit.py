"""Protección de autenticación; usa SQLite aislado y un reloj controlado."""

import unittest
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.rate_limit import LoginRateLimiter
from app.core.security import get_password_hash
from app.database import Base, get_db
from app.models.models import Usuario
from app.routes import auth


class LoginRateLimitTests(unittest.TestCase):
    email = "jugador@example.com"
    password = "PasswordValida1!"

    def setUp(self):
        self.ahora = 1_000.0
        self.limiter = LoginRateLimiter(
            max_fallos=3,
            ventana_segundos=60,
            bloqueo_segundos=120,
            reloj=lambda: self.ahora,
        )
        self.parche = patch.object(auth, "login_attempt_limiter", self.limiter)
        self.parche.start()
        self.addCleanup(self.parche.stop)

        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool,
        )
        self.addCleanup(self.engine.dispose)
        Base.metadata.create_all(self.engine)
        self.sessions = sessionmaker(bind=self.engine)
        with self.sessions() as db:
            db.add(Usuario(
                nombre="Jugador",
                apellido="Prueba",
                email=self.email,
                password_hash=get_password_hash(self.password),
            ))
            db.commit()

        app = FastAPI()
        app.include_router(auth.router, prefix="/api/auth")

        def database():
            with self.sessions() as db:
                yield db

        app.dependency_overrides[get_db] = database
        self.client = TestClient(app)
        self.addCleanup(self.client.close)

    def login(self, password: str, email: str | None = None):
        return self.client.post("/api/auth/login", json={
            "email": email or self.email,
            "password": password,
        })

    def test_bloquea_temporalmente_sin_exponer_si_el_correo_existe(self):
        self.assertEqual(self.login("Incorrecta1!").status_code, 401)
        self.assertEqual(self.login("Incorrecta2!").status_code, 401)
        bloqueada = self.login("Incorrecta3!")
        self.assertEqual(bloqueada.status_code, 429)
        self.assertEqual(bloqueada.headers["Retry-After"], "120")
        self.assertNotIn(self.email, bloqueada.text)

        aun_bloqueada = self.login(self.password)
        self.assertEqual(aun_bloqueada.status_code, 429)
        self.assertEqual(aun_bloqueada.headers["Retry-After"], "120")

        self.ahora += 121
        self.assertEqual(self.login(self.password).status_code, 200)

    def test_un_login_correcto_limpia_los_fallos_previos(self):
        self.assertEqual(self.login("Incorrecta1!").status_code, 401)
        self.assertEqual(self.login(self.password).status_code, 200)
        self.assertEqual(self.login("Incorrecta2!").status_code, 401)
        self.assertEqual(self.login("Incorrecta3!").status_code, 401)

    def test_una_combinacion_distinta_no_hereda_el_bloqueo(self):
        for intento in range(3):
            respuesta = self.login(f"Incorrecta{intento}!", "inexistente@example.com")
        self.assertEqual(respuesta.status_code, 429)
        self.assertEqual(self.login(self.password).status_code, 200)

    def test_el_endpoint_de_swagger_tambien_esta_protegido(self):
        for intento in range(3):
            respuesta = self.client.post("/api/auth/token", data={
                "username": self.email,
                "password": f"Incorrecta{intento}!",
            })
        self.assertEqual(respuesta.status_code, 429)
        self.assertIn("Retry-After", respuesta.headers)


if __name__ == "__main__":
    unittest.main()
