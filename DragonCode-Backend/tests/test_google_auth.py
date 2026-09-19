import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import os

from app.main import app
from app.database import Base, get_db
from app.models.models import Usuario

class GoogleAuthTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.sessions = sessionmaker(bind=self.engine)

        def override_get_db():
            with self.sessions() as session:
                yield session

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()
        self.engine.dispose()

    @patch.dict(os.environ, {"GOOGLE_CLIENT_ID": ""})
    def test_google_auth_rechaza_si_no_esta_configurado(self):
        response = self.client.post("/api/auth/google", json={"credential": "un_token"})
        self.assertEqual(response.status_code, 503)
        self.assertIn("no está configurado", response.json()["detail"])

    @patch.dict(os.environ, {"GOOGLE_CLIENT_ID": "mi_cliente"})
    @patch("requests.get")
    def test_google_auth_rechaza_token_invalido(self, mock_get):
        mock_response = MagicMock()
        mock_response.ok = False
        mock_get.return_value = mock_response

        response = self.client.post("/api/auth/google", json={"credential": "un_token"})
        self.assertEqual(response.status_code, 401)
        self.assertIn("no es válido", response.json()["detail"])

    @patch.dict(os.environ, {"GOOGLE_CLIENT_ID": "mi_cliente"})
    @patch("requests.get")
    def test_google_auth_crea_usuario_nuevo(self, mock_get):
        mock_info = MagicMock()
        mock_info.ok = True
        mock_info.json.return_value = {"aud": "mi_cliente"}
        
        mock_user = MagicMock()
        mock_user.ok = True
        mock_user.json.return_value = {
            "email": "nuevo@example.com",
            "email_verified": True,
            "given_name": "Juan",
            "family_name": "Perez"
        }
        mock_get.side_effect = [mock_info, mock_user]

        response = self.client.post("/api/auth/google", json={"credential": "un_token"})
        self.assertEqual(response.status_code, 200)
        self.assertIn("access_token", response.json())
        
        with self.sessions() as db:
            user = db.query(Usuario).filter(Usuario.email == "nuevo@example.com").first()
            self.assertIsNotNone(user)
            self.assertEqual(user.nombre, "Juan")
            self.assertEqual(user.apellido, "Perez")

    @patch.dict(os.environ, {"GOOGLE_CLIENT_ID": "mi_cliente"})
    @patch("requests.get")
    def test_google_auth_vincula_usuario_existente(self, mock_get):
        with self.sessions() as db:
            db.add(Usuario(email="existente@example.com", password_hash="hash", nombre="Viejo", apellido="Usuario"))
            db.commit()

        mock_info = MagicMock()
        mock_info.ok = True
        mock_info.json.return_value = {"aud": "mi_cliente"}
        
        mock_user = MagicMock()
        mock_user.ok = True
        mock_user.json.return_value = {
            "email": "existente@example.com",
            "email_verified": True,
        }
        mock_get.side_effect = [mock_info, mock_user]

        response = self.client.post("/api/auth/google", json={"credential": "un_token"})
        self.assertEqual(response.status_code, 200)
        
        with self.sessions() as db:
            cuenta = db.query(Usuario).filter(Usuario.email == "existente@example.com").count()
            self.assertEqual(cuenta, 1) # No duplicó la cuenta

if __name__ == "__main__":
    unittest.main()
