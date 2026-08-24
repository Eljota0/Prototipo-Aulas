import os
import unittest
from datetime import timedelta


TEST_DATABASE_URL = os.getenv("DRAGONCODE_TEST_DATABASE_URL")
if not TEST_DATABASE_URL:
    raise unittest.SkipTest("Define DRAGONCODE_TEST_DATABASE_URL para ejecutar la integración.")

os.environ["DATABASE_URL"] = TEST_DATABASE_URL

from fastapi import Depends
from fastapi.testclient import TestClient

from app.core.academic import ahora_utc
from app.core.deps import get_current_user
from app.database import SessionLocal, get_db
from app.main import app
from app.models.models import (
    AulaJugador,
    AulaVirtual,
    EstadoReto,
    ProgresoAula,
    RetoNivel,
    RetoPersonalizado,
    Usuario,
)


class FlujoAcademicoIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with SessionLocal() as db:
            nivel = db.query(RetoNivel).filter(RetoNivel.id == 1).first()
            if not nivel:
                raise AssertionError("La inicialización no creó el Nivel 1.")

            cls.anfitrion = Usuario(
                email="anfitrion.integration@dragoncode.test",
                password_hash="test",
                nombre="Ada",
                apellido="Lovelace",
            )
            cls.jugador = Usuario(
                email="jugador.integration@dragoncode.test",
                password_hash="test",
                nombre="Alan",
                apellido="Turing",
            )
            db.add_all([cls.anfitrion, cls.jugador])
            db.flush()

            cls.aula = AulaVirtual(
                anfitrion_id=cls.anfitrion.id,
                codigo_acceso="TST001",
                nombre_aula="Aula de integración",
            )
            db.add(cls.aula)
            db.flush()
            db.add(AulaJugador(aula_id=cls.aula.id, jugador_id=cls.jugador.id))

            parametros = {
                "tiempo_3_estrellas": 60,
                "tiempo_2_estrellas": 120,
                "intentos_max_sin_penalidad": 2,
                "anti_copia": True,
                "fases_seleccionadas": [1, 2, 3, 4],
            }
            cls.reto = RetoPersonalizado(
                aula_id=cls.aula.id,
                reto_nivel_id=1,
                titulo="Actividad vigente",
                estado=EstadoReto.publicado,
                tipo_reto=nivel.tipo_reto,
                parametros_evaluacion=parametros,
                fecha_limite=ahora_utc() + timedelta(hours=1),
            )
            cls.reto_vencido = RetoPersonalizado(
                aula_id=cls.aula.id,
                reto_nivel_id=1,
                titulo="Actividad vencida",
                estado=EstadoReto.publicado,
                tipo_reto=nivel.tipo_reto,
                parametros_evaluacion=parametros,
                fecha_limite=ahora_utc() - timedelta(minutes=1),
            )
            db.add_all([cls.reto, cls.reto_vencido])
            db.commit()

            cls.anfitrion_id = cls.anfitrion.id
            cls.jugador_id = cls.jugador.id
            cls.aula_id = cls.aula.id
            cls.reto_id = cls.reto.id
            cls.reto_vencido_id = cls.reto_vencido.id

        cls.usuario_actual_id = cls.jugador_id

        def override_current_user(db=Depends(get_db)):
            return db.query(Usuario).filter(Usuario.id == cls.usuario_actual_id).first()

        app.dependency_overrides[get_current_user] = override_current_user
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()
        app.dependency_overrides.clear()

    def test_entrega_reporte_y_bloqueo_por_vencimiento(self):
        entrega = self.client.post(
            "/api/progreso/guardar",
            json={
                "reto_nivel_id": 1,
                "tiempo_segundos": 45,
                "intentos": 1,
                "codigo_solucion": "ogro.caminarAbajo()",
                "aula_id": self.aula_id,
                "reto_personalizado_id": self.reto_id,
            },
        )
        self.assertEqual(entrega.status_code, 200, entrega.text)

        with SessionLocal() as db:
            progreso = db.query(ProgresoAula).filter(
                ProgresoAula.reto_personalizado_id == self.reto_id,
                ProgresoAula.jugador_id == self.jugador_id,
            ).first()
            self.assertIsNotNone(progreso)
            self.assertEqual(progreso.calificacion_numerica, 10)

        type(self).usuario_actual_id = self.anfitrion_id
        reporte = self.client.get(f"/api/aulas/{self.aula_id}/seguimiento")
        self.assertEqual(reporte.status_code, 200, reporte.text)
        actividad = next(
            item for item in reporte.json()["actividades"] if item["reto_id"] == self.reto_id
        )
        self.assertEqual(actividad["completados"], 1)
        self.assertEqual(actividad["pendientes"], 0)
        self.assertEqual(actividad["promedio_calificacion"], 10.0)

        type(self).usuario_actual_id = self.jugador_id
        vencida = self.client.post(
            "/api/progreso/guardar",
            json={
                "reto_nivel_id": 1,
                "tiempo_segundos": 45,
                "intentos": 1,
                "codigo_solucion": "ogro.caminarAbajo()",
                "aula_id": self.aula_id,
                "reto_personalizado_id": self.reto_vencido_id,
            },
        )
        self.assertEqual(vencida.status_code, 409, vencida.text)


if __name__ == "__main__":
    unittest.main()
