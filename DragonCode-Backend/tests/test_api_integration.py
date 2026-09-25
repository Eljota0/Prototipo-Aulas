"""Flujos HTTP con JWT y SQLite efímero: nunca importar app.main ni cambiar DATABASE_URL."""

import unittest
from datetime import timedelta
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.academic import ahora_utc
from app.core.security import create_user_access_token
from app.database import Base, get_db
from app.initial_data import seed_initial_data
from app.models.models import (
    AulaVirtual, EstadoAula, EstadoReto, Notificacion, ProgresoAula,
    ProgresoJugador, RetoNivel, RetoPersonalizado, Usuario, TiendaAvatar,
)
from app.routes import academico, aulas, notificaciones, progreso, usuarios
from app.seed_avatares import registrar_avatares_faltantes


class FlujoAcademicoIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool,
        )

        @event.listens_for(self.engine, "connect")
        def claves_foraneas(connection, _):
            connection.execute("PRAGMA foreign_keys=ON")

        self.addCleanup(self.engine.dispose)
        Base.metadata.create_all(self.engine)
        self.sessions = sessionmaker(bind=self.engine)
        self.ids, self.headers = {}, {}
        with self.sessions() as db:
            seed_initial_data(db)
            registrar_avatares_faltantes(db)
            self.avatares = {a.nombre_skin: a.id for a in db.query(TiendaAvatar).all()}
            self.niveles = {n.orden: n.id for n in db.query(RetoNivel).all()}
            for nombre in ("anfitrion", "jugador", "ajeno", "otro_anfitrion"):
                usuario = Usuario(nombre=nombre, apellido="Prueba", email=f"{nombre}@example.com",
                                  password_hash="hash-aislado-no-usado-para-login")
                db.add(usuario)
                db.flush()
                self.ids[nombre] = usuario.id
                self.headers[nombre] = {"Authorization": f"Bearer {create_user_access_token(usuario)}"}
            db.commit()

        app = FastAPI()
        for router, prefijo in ((aulas.router, "/api/aulas"), (academico.router, "/api/aulas"),
                                (progreso.router, "/api/progreso"), (notificaciones.router, "/api/notificaciones"),
                                (usuarios.router, "/api/usuarios")):
            app.include_router(router, prefix=prefijo)

        def base_aislada():
            with self.sessions() as db:
                yield db

        app.dependency_overrides[get_db] = base_aislada
        self.client = TestClient(app)
        self.addCleanup(self.client.close)
        self.aula = self.crear_aula("anfitrion", "Aula de integración")
        self.otra_aula = self.crear_aula("otro_anfitrion", "Otra aula")
        self.unirse("jugador", self.aula)
        self.reto = self.crear_reto(self.aula["id"])

    def crear_aula(self, usuario, nombre):
        respuesta = self.client.post("/api/aulas/", headers=self.headers[usuario], json={"nombre_aula": nombre})
        self.assertEqual(respuesta.status_code, 201, respuesta.text)
        return respuesta.json()

    def unirse(self, usuario, aula):
        respuesta = self.client.post("/api/aulas/unirse", headers=self.headers[usuario],
                                      json={"codigo_acceso": aula["codigo_acceso"]})
        self.assertEqual(respuesta.status_code, 200, respuesta.text)

    def crear_reto(self, aula_id, usuario="anfitrion", **cambios):
        respuesta = self.client.post(f"/api/aulas/{aula_id}/retos", headers=self.headers[usuario], json={
            "reto_nivel_id": self.niveles[1], "titulo": "Actividad vigente",
            "parametros": {"tiempo_3_estrellas": 60, "tiempo_2_estrellas": 120,
                           "intentos_max_sin_penalidad": 2, "anti_copia": True,
                           "fases_seleccionadas": [1, 2, 3, 4]},
            "fecha_limite": (ahora_utc() + timedelta(hours=1)).isoformat(), **cambios,
        })
        self.assertEqual(respuesta.status_code, 201, respuesta.text)
        return respuesta.json()

    def entregar(self, usuario="jugador", **cambios):
        return self.client.post("/api/progreso/guardar", headers=self.headers[usuario], json={
            "reto_nivel_id": self.niveles[1], "tiempo_segundos": 45, "intentos": 1,
            "codigo_solucion": "ogro.caminarAbajo()", "aula_id": self.aula["id"],
            "vidas_restantes": 3, "ayudas_usadas": False,
            "reto_personalizado_id": self.reto["id"], **cambios,
        })

    def estado_guardado(self):
        with self.sessions() as db:
            return {
                "progresos": db.query(ProgresoJugador).count(),
                "entregas": db.query(ProgresoAula).count(),
                "avisos": db.query(Notificacion).count(),
                "estrellas": {u.id: u.estrellas_totales for u in db.query(Usuario).all()},
            }

    def test_estrellas_aventura_logros_saldo_y_repeticiones(self):
        contexto = dict(aula_id=None, reto_personalizado_id=None,
                        tarjetas_usadas=True, vidas_perdidas=0)
        primero = self.entregar(ayudas_usadas=True, **contexto)
        self.assertEqual(primero.status_code, 200, primero.text)
        self.assertEqual(primero.json()['estrellas_obtenidas'], 1)
        contexto['tarjetas_usadas'] = False
        mejor = self.entregar(vidas_restantes=1, vidas_perdidas=2,
                              **{k: v for k, v in contexto.items() if k != 'vidas_perdidas'})
        self.assertEqual(mejor.json()['estrellas_obtenidas'], 3)
        repetido = self.entregar(**contexto)
        self.assertEqual(repetido.json()['estrellas_totales_usuario'], 3)
        for nivel in range(2, 6):
            # El primer intento desbloquea el siguiente; las tarjetas no penalizan.
            resultado = self.entregar(reto_nivel_id=self.niveles[nivel],
                                     **{**contexto, 'tarjetas_usadas': True})
            self.assertEqual(resultado.status_code, 200, resultado.text)
            self.assertEqual(resultado.json()['estrellas_obtenidas'], 3)
            curado = self.entregar(reto_nivel_id=self.niveles[nivel],
                                  ayudas_usadas=True, vidas_restantes=3, intentos=2,
                                  **{**contexto, 'vidas_perdidas': 1})
            self.assertEqual(curado.json()['estrellas_obtenidas'], 1)
            self.assertEqual(curado.json()['estrellas_totales_usuario'], nivel * 3)

    def test_aulas_conserva_rubrica_con_los_nuevos_campos(self):
        entrega = self.entregar(vidas_restantes=1, tarjetas_usadas=False, vidas_perdidas=2)
        self.assertEqual(entrega.status_code, 200, entrega.text)
        self.assertEqual(entrega.json()['estrellas_obtenidas'], 1)
        self.assertEqual(entrega.json()['estrellas_totales_usuario'], 0)

    def test_valida_telemetria_de_estrellas(self):
        for invalido in ({'tarjetas_usadas': 'false'}, {'vidas_perdidas': -1},
                         {'vidas_perdidas': True}, {'vidas_perdidas': 1.5}):
            with self.subTest(invalido=invalido):
                self.assertEqual(self.entregar(**invalido).status_code, 422)

    def test_entrega_reporte_y_bloqueo_por_vencimiento(self):
        raiz = f"/api/aulas/{self.aula['id']}"
        niveles = self.client.get(f"{raiz}/niveles", headers=self.headers["jugador"])
        self.assertEqual(niveles.status_code, 200)
        self.assertEqual([n["orden"] for n in niveles.json()], [1, 2, 3, 4, 5])
        self.assertFalse(self.client.get(f"{raiz}/retos", headers=self.headers["jugador"]).json()[0]["completado"])
        entrega = self.entregar()
        self.assertEqual(entrega.status_code, 200, entrega.text)
        reporte = self.client.get(f"{raiz}/seguimiento", headers=self.headers["anfitrion"])
        self.assertEqual(reporte.status_code, 200, reporte.text)
        actividad = reporte.json()["actividades"][0]
        self.assertEqual((actividad["completados"], actividad["pendientes"], actividad["promedio_calificacion"]), (1, 0, 10.0))
        self.assertEqual(actividad["jugadores"][0]["codigo_solucion"], "ogro.caminarAbajo()")
        self.assertTrue(self.client.get(f"{raiz}/retos", headers=self.headers["jugador"]).json()[0]["completado"])
        self.assertFalse(self.client.get("/api/aulas/mis-aulas", headers=self.headers["jugador"]).json()[0]["actividades_pendientes"])
        with self.sessions() as db:
            db.get(RetoPersonalizado, self.reto["id"]).fecha_limite = ahora_utc() - timedelta(minutes=1)
            db.commit()
        anterior = self.estado_guardado()
        self.assertEqual(self.entregar().status_code, 409)
        posterior = self.estado_guardado()
        self.assertEqual(posterior["progresos"], anterior["progresos"])
        self.assertEqual(posterior["entregas"], anterior["entregas"])
        self.assertEqual(posterior["estrellas"], anterior["estrellas"])
        # Detectar el vencimiento crea únicamente el reporte final del anfitrión:
        # el único alumno ya había entregado.
        self.assertEqual(posterior["avisos"], anterior["avisos"] + 1)
        with self.sessions() as db:
            self.assertIsNotNone(db.get(RetoPersonalizado, self.reto["id"]).fecha_cierre)

    def test_fecha_ecuador_se_devuelve_como_utc_explicito(self):
        reto = self.crear_reto(
            self.aula["id"],
            titulo="Actividad con zona horaria",
            fecha_limite="2030-09-09T20:51:00-05:00",
        )
        self.assertEqual(reto["fecha_limite"], "2030-09-10T01:51:00Z")

        listado = self.client.get(
            f"/api/aulas/{self.aula['id']}/retos",
            headers=self.headers["jugador"],
        )
        self.assertEqual(listado.status_code, 200, listado.text)
        guardada = next(item for item in listado.json() if item["id"] == reto["id"])
        self.assertEqual(guardada["fecha_limite"], "2030-09-10T01:51:00Z")

    def test_las_actividades_de_aula_siempre_se_crean_sin_ayudas(self):
        parametros = {
            "tiempo_3_estrellas": 60,
            "tiempo_2_estrellas": 120,
            "intentos_max_sin_penalidad": 2,
            "anti_copia": True,
            "ayudas_habilitadas": True,
            "fases_seleccionadas": [1, 2, 3, 4],
        }
        reto_sin_ayudas = self.crear_reto(
            self.aula["id"],
            titulo="Actividad sin ayudas",
            parametros=parametros,
        )
        self.assertFalse(reto_sin_ayudas["parametros_evaluacion"]["ayudas_habilitadas"])

        rechazada = self.entregar(
            reto_personalizado_id=reto_sin_ayudas["id"],
            ayudas_usadas=True,
        )
        self.assertEqual(rechazada.status_code, 409, rechazada.text)
        self.assertEqual(
            rechazada.json()["detail"],
            "Las ayudas no están disponibles en actividades de aula.",
        )

        aceptada = self.entregar(
            reto_personalizado_id=reto_sin_ayudas["id"],
            ayudas_usadas=False,
        )
        self.assertEqual(aceptada.status_code, 200, aceptada.text)

    def test_anfitrion_sin_progreso_puede_asignar_cualquiera_de_los_cinco_niveles(self):
        with self.sessions() as db:
            self.assertEqual(
                db.query(ProgresoJugador).filter(
                    ProgresoJugador.jugador_id == self.ids["anfitrion"]
                ).count(),
                0,
            )

        for orden in range(1, 6):
            fases = [1, 2, 3] if orden == 2 else [1, 2, 3, 4]
            actividad = self.crear_reto(
                self.aula["id"],
                reto_nivel_id=self.niveles[orden],
                titulo=f"Nivel {orden} sin bloqueo",
                parametros={
                    "tiempo_3_estrellas": 60,
                    "tiempo_2_estrellas": 120,
                    "intentos_max_sin_penalidad": 2,
                    "anti_copia": True,
                    "ayudas_habilitadas": True,
                    "fases_seleccionadas": fases,
                },
            )
            self.assertEqual(actividad["reto_nivel_id"], self.niveles[orden])
            self.assertEqual(
                actividad["parametros_evaluacion"]["fases_seleccionadas"],
                fases,
            )
            self.assertFalse(actividad["parametros_evaluacion"]["ayudas_habilitadas"])

        fase_inexistente = self.client.post(
            f"/api/aulas/{self.aula['id']}/retos",
            headers=self.headers["anfitrion"],
            json={
                "reto_nivel_id": self.niveles[2],
                "titulo": "Nivel 2 con fase inexistente",
                "parametros": {
                    "tiempo_3_estrellas": 60,
                    "tiempo_2_estrellas": 120,
                    "intentos_max_sin_penalidad": 2,
                    "anti_copia": True,
                    "fases_seleccionadas": [4],
                },
            },
        )
        self.assertEqual(fase_inexistente.status_code, 422, fase_inexistente.text)

    def test_configuracion_de_nivel_se_valida_y_persiste_como_snapshot(self):
        parametros = {
            "tiempo_3_estrellas": 60,
            "tiempo_2_estrellas": 120,
            "intentos_max_sin_penalidad": 2,
            "anti_copia": True,
            "fases_seleccionadas": [1, 2, 3, 4],
            "configuracion_nivel": {
                "version": 1,
                "nivel_id": 4,
                "tipo": "materiales_fabrica",
                "materiales_por_fase": {
                    "1": ["Diamante", "Diamante"],
                    "2": ["Explosivo"],
                    "3": ["Diamante"],
                    "4": ["Carbon", "Explosivo", "Diamante"],
                },
            },
        }
        actividad = self.crear_reto(
            self.aula["id"],
            reto_nivel_id=self.niveles[4],
            titulo="Control de calidad personalizado",
            parametros=parametros,
        )
        self.assertEqual(
            actividad["parametros_evaluacion"]["configuracion_nivel"],
            parametros["configuracion_nivel"],
        )

        parametros["configuracion_nivel"]["materiales_por_fase"]["1"] = []
        invalida = self.client.post(
            f"/api/aulas/{self.aula['id']}/retos",
            headers=self.headers["anfitrion"],
            json={
                "reto_nivel_id": self.niveles[4],
                "titulo": "Configuración inválida",
                "parametros": parametros,
            },
        )
        self.assertEqual(invalida.status_code, 422, invalida.text)

        parametros["configuracion_nivel"]["materiales_por_fase"]["1"] = ["Carbon"]
        incompatible = self.client.post(
            f"/api/aulas/{self.aula['id']}/retos",
            headers=self.headers["anfitrion"],
            json={
                "reto_nivel_id": self.niveles[4],
                "titulo": "Material no enseñado",
                "parametros": parametros,
            },
        )
        self.assertEqual(incompatible.status_code, 422, incompatible.text)

    def test_mapa_del_nivel_uno_se_guarda_y_rechaza_disenos_incompletos(self):
        def casilla(x, y, zona, terreno="vacio"):
            return {
                "x": x,
                "y": y,
                "zona": zona,
                "terreno": terreno,
                "objeto": "ninguno",
                "tieneFilo": False,
                "rotacionTerreno": 0,
                "estadoAnimacion": "normal",
            }

        matriz = [
            [casilla(0, 0, "superior"), casilla(1, 0, "superior")],
            [casilla(0, 1, "editable", "suelo-ogro"), casilla(1, 1, "editable", "suelo")],
            [casilla(0, 2, "editable", "suelo"), casilla(1, 2, "editable", "suelo")],
            [casilla(0, 3, "inferior"), casilla(1, 3, "inferior", "meta-ogro")],
        ]
        configuracion = {
            "version": 1,
            "nivel_id": 1,
            "tipo": "mapa_ogro",
            "max_vidas": 3,
            "campana": {
                "totalNiveles": 1,
                "niveles": [{
                    "idNivel": 1,
                    "filasEditables": 2,
                    "columnas": 2,
                    "matriz": matriz,
                }],
            },
        }
        actividad = self.crear_reto(
            self.aula["id"],
            reto_nivel_id=self.niveles[1],
            titulo="Mapa personalizado",
            parametros={
                "fases_seleccionadas": [1],
                "configuracion_nivel": configuracion,
            },
        )
        self.assertEqual(
            actividad["parametros_evaluacion"]["configuracion_nivel"],
            configuracion,
        )

        configuracion["campana"]["niveles"][0]["matriz"][1][0]["terreno"] = "suelo"
        incompleta = self.client.post(
            f"/api/aulas/{self.aula['id']}/retos",
            headers=self.headers["anfitrion"],
            json={
                "reto_nivel_id": self.niveles[1],
                "titulo": "Mapa sin inicio",
                "parametros": {
                    "fases_seleccionadas": [1],
                    "configuracion_nivel": configuracion,
                },
            },
        )
        self.assertEqual(incompleta.status_code, 422, incompleta.text)

    def test_rechaza_configuracion_que_pertenece_a_otro_nivel(self):
        respuesta = self.client.post(
            f"/api/aulas/{self.aula['id']}/retos",
            headers=self.headers["anfitrion"],
            json={
                "reto_nivel_id": self.niveles[3],
                "titulo": "Nivel inconsistente",
                "parametros": {
                    "fases_seleccionadas": [1],
                    "configuracion_nivel": {
                        "version": 1,
                        "nivel_id": 2,
                        "tipo": "sensores_taladro",
                        "umbral_temperatura": 100,
                        "presion_objetivo": 50,
                        "profundidad_objetivo": 500,
                    },
                },
            },
        )
        self.assertEqual(respuesta.status_code, 422, respuesta.text)

    def test_valida_aulas_actividades_y_parametros_antes_de_guardar(self):
        with self.sessions() as db:
            aulas_antes = db.query(AulaVirtual).count()
            retos_antes = db.query(RetoPersonalizado).count()

        for datos in (
            {"nombre_aula": "   "},
            {"nombre_aula": "Aula\nInyectada"},
            {"nombre_aula": "x" * 101},
            {"nombre_aula": "Válida", "campo_ajeno": True},
        ):
            respuesta = self.client.post(
                "/api/aulas/", headers=self.headers["anfitrion"], json=datos,
            )
            self.assertEqual(respuesta.status_code, 422, respuesta.text)

        base = {
            "reto_nivel_id": self.niveles[1],
            "titulo": "Actividad validada",
            "recompensa_estrellas": 5,
            "parametros": {
                "tiempo_3_estrellas": 60,
                "tiempo_2_estrellas": 120,
                "intentos_max_sin_penalidad": 2,
                "anti_copia": True,
                "fases_seleccionadas": [1, 2, 3, 4],
            },
        }
        invalidos = (
            {**base, "titulo": "  "},
            {**base, "recompensa_estrellas": -1},
            {**base, "parametros": {**base["parametros"], "tiempo_3_estrellas": 0}},
            {**base, "parametros": {**base["parametros"], "tiempo_2_estrellas": 60}},
            {**base, "parametros": {**base["parametros"], "fases_seleccionadas": [1, 1]}},
            {**base, "parametros": {**base["parametros"], "fases_seleccionadas": [5]}},
            {**base, "parametros": {**base["parametros"], "ayudas_habilitadas": "no"}},
            {**base, "parametros": {**base["parametros"], "campo_ajeno": 1}},
        )
        for datos in invalidos:
            respuesta = self.client.post(
                f"/api/aulas/{self.aula['id']}/retos",
                headers=self.headers["anfitrion"], json=datos,
            )
            self.assertEqual(respuesta.status_code, 422, respuesta.text)

        with self.sessions() as db:
            self.assertEqual(db.query(AulaVirtual).count(), aulas_antes)
            self.assertEqual(db.query(RetoPersonalizado).count(), retos_antes)

        archivada = self.crear_aula("anfitrion", "Aula archivada")
        respuesta = self.client.patch(
            f"/api/aulas/{archivada['id']}/archivar",
            headers=self.headers["anfitrion"],
        )
        self.assertEqual(respuesta.status_code, 200, respuesta.text)
        bloqueada = self.client.post(
            f"/api/aulas/{archivada['id']}/retos",
            headers=self.headers["anfitrion"], json=base,
        )
        self.assertEqual(bloqueada.status_code, 409, bloqueada.text)

    def test_unirse_normaliza_codigo_y_no_anuncia_actividades_cerradas(self):
        cierre = self.client.post(
            f"/api/aulas/{self.aula['id']}/retos/{self.reto['id']}/cerrar",
            headers=self.headers["anfitrion"],
        )
        self.assertEqual(cierre.status_code, 200, cierre.text)
        codigo = f"  {self.aula['codigo_acceso'].lower()}  "
        union = self.client.post(
            "/api/aulas/unirse", headers=self.headers["ajeno"],
            json={"codigo_acceso": codigo},
        )
        self.assertEqual(union.status_code, 200, union.text)
        avisos = self.client.get(
            "/api/notificaciones/", headers=self.headers["ajeno"],
        )
        self.assertEqual(avisos.status_code, 200, avisos.text)
        self.assertFalse(any(aviso["titulo"] == "Actividad disponible" for aviso in avisos.json()))

    def test_nivel_tres_se_publica_y_guarda_progreso_de_variables(self):
        with self.sessions() as db:
            for orden in (1, 2):
                db.add(ProgresoJugador(
                    jugador_id=self.ids["jugador"],
                    reto_nivel_id=self.niveles[orden],
                    completado=True,
                    estrellas_obtenidas=3,
                    intentos=1,
                    tiempo_segundos=30,
                    codigo_solucion="avance previo",
                    fecha_completado=ahora_utc(),
                ))
            db.commit()
        codigo = 'luz = true\nelemento = "Fuego"\ncantidad = 3\ndrako.iniciarCombate(luz, elemento, cantidad);'
        entrega = self.entregar(aula_id=None, reto_personalizado_id=None,
                                reto_nivel_id=self.niveles[3], codigo_solucion=codigo, tiempo_segundos=58)
        self.assertEqual(entrega.status_code, 200, entrega.text)
        self.assertEqual(entrega.json()["estrellas_obtenidas"], 3)
        with self.sessions() as db:
            guardado = db.query(ProgresoJugador).filter_by(jugador_id=self.ids["jugador"], reto_nivel_id=self.niveles[3]).one()
            self.assertEqual(guardado.codigo_solucion, codigo)
            self.assertEqual(db.get(RetoNivel, self.niveles[3]).tipo_reto.value, "variables")

    def test_usuario_ajeno_no_puede_enviar_entregas_ni_obtener_estrellas(self):
        self.unirse("ajeno", self.otra_aula)
        anterior = self.estado_guardado()
        for cambios in ({}, {"reto_personalizado_id": None}):
            respuesta = self.entregar("ajeno", **cambios)
            self.assertEqual(respuesta.status_code, 403, respuesta.text)
            self.assertEqual(self.estado_guardado(), anterior)

    def test_actividad_de_otra_aula_o_de_otro_nivel_no_se_guarda(self):
        otro_reto = self.crear_reto(self.otra_aula["id"], usuario="otro_anfitrion")
        anterior = self.estado_guardado()
        self.assertEqual(self.entregar(reto_personalizado_id=otro_reto["id"]).status_code, 404)
        self.assertEqual(self.entregar(reto_nivel_id=self.niveles[3]).status_code, 409)
        self.assertEqual(self.estado_guardado(), anterior)

    def test_un_aula_archivada_o_un_reto_borrador_no_admiten_entregas(self):
        for estado in ("borrador", "archivada"):
            with self.sessions() as db:
                db.get(AulaVirtual, self.aula["id"]).estado = EstadoAula.archivada if estado == "archivada" else EstadoAula.activa
                db.get(RetoPersonalizado, self.reto["id"]).estado = EstadoReto.borrador if estado == "borrador" else EstadoReto.publicado
                db.commit()
            anterior = self.estado_guardado()
            respuesta = self.entregar()
            self.assertEqual(respuesta.status_code, 409, respuesta.text)
            self.assertEqual(self.estado_guardado(), anterior)

    def test_solo_el_anfitrion_puede_ver_actividades_en_borrador(self):
        with self.sessions() as db:
            db.get(RetoPersonalizado, self.reto["id"]).estado = EstadoReto.borrador
            db.commit()

        ruta = f"/api/aulas/{self.aula['id']}/retos"
        respuesta_jugador = self.client.get(
            ruta, headers=self.headers["jugador"]
        )
        respuesta_anfitrion = self.client.get(
            ruta, headers=self.headers["anfitrion"]
        )

        self.assertEqual(respuesta_jugador.status_code, 200, respuesta_jugador.text)
        self.assertEqual(respuesta_jugador.json(), [])
        self.assertEqual(respuesta_anfitrion.status_code, 200, respuesta_anfitrion.text)
        self.assertEqual(
            [reto["id"] for reto in respuesta_anfitrion.json()],
            [self.reto["id"]],
        )

    def test_contexto_incompleto_o_ids_invalidos_no_producen_error_interno(self):
        anterior = self.estado_guardado()
        for cambios in ({"aula_id": None}, {"aula_id": "invalido"}, {"reto_personalizado_id": "invalido"},
                        {"aula_id": ""}, {"reto_nivel_id": 0}):
            respuesta = self.entregar(**cambios)
            self.assertEqual(respuesta.status_code, 422, respuesta.text)
        self.assertEqual(self.estado_guardado(), anterior)

    def test_compatibilidad_sin_id_solo_si_la_actividad_es_inequivoca(self):
        self.assertEqual(self.entregar(reto_personalizado_id=None).status_code, 200)
        self.crear_reto(self.aula["id"], titulo="Segunda actividad del mismo nivel")
        anterior = self.estado_guardado()
        self.assertEqual(self.entregar(reto_personalizado_id=None).status_code, 409)
        self.assertEqual(self.estado_guardado(), anterior)

    def test_repetir_entrega_no_duplica_estrellas_notificaciones_ni_calificaciones(self):
        self.assertEqual(self.entregar().status_code, 200)
        anterior = self.estado_guardado()
        self.assertEqual(self.entregar(tiempo_segundos=180, intentos=3, vidas_restantes=1,
                                      codigo_solucion="intento posterior").status_code, 200)
        self.assertEqual(self.estado_guardado(), anterior)
        with self.sessions() as db:
            guardado = db.query(ProgresoAula).one()
            self.assertEqual((guardado.calificacion_numerica, guardado.intentos, guardado.codigo_solucion),
                             (10, 1, "ogro.caminarAbajo()"))

    def test_estrellas_de_aula_dependen_de_vidas_y_no_del_tiempo(self):
        for vidas, esperadas in ((3, 3), (2, 2), (1, 1)):
            for segundos in (1, 900):
                with self.subTest(vidas=vidas, segundos=segundos):
                    respuesta = self.entregar(vidas_restantes=vidas, ayudas_usadas=False,
                                             tiempo_segundos=segundos)
                    self.assertEqual(respuesta.status_code, 200, respuesta.text)
                    self.assertEqual(respuesta.json()["estrellas_obtenidas"], esperadas)

    def test_vidas_ayudas_invalidas_o_ausentes_no_guardan(self):
        anterior = self.estado_guardado()
        casos = [{"vidas_restantes": valor} for valor in (0, -1, 4, 2.5, "3", True, None)]
        casos += [{"ayudas_usadas": valor} for valor in ("false", 1, None)]
        casos += [{"vidas_restantes": None, "ayudas_usadas": None}]
        for cambios in casos:
            with self.subTest(cambios=cambios):
                respuesta = self.entregar(**cambios)
                self.assertEqual(respuesta.status_code, 422, respuesta.text)
                self.assertEqual(self.estado_guardado(), anterior)

    def test_todos_los_niveles_exigen_vidas_y_ayudas(self):
        with self.sessions() as db:
            for orden in range(1, 6):
                db.add(ProgresoJugador(
                    jugador_id=self.ids["jugador"],
                    reto_nivel_id=self.niveles[orden],
                    completado=True,
                    estrellas_obtenidas=1,
                    intentos=1,
                    tiempo_segundos=30,
                    codigo_solucion="progreso compatible",
                    fecha_completado=ahora_utc(),
                ))
            db.commit()
        for nivel in (1, 2, 3, 4, 5):
            with self.subTest(nivel=nivel):
                respuesta = self.entregar(aula_id=None, reto_personalizado_id=None,
                                         reto_nivel_id=self.niveles[nivel],
                                         vidas_restantes=None, ayudas_usadas=None)
                self.assertEqual(respuesta.status_code, 422, respuesta.text)

    def test_aventura_bloquea_saltos_pero_aula_no_depende_del_mapa(self):
        salto = self.entregar(
            aula_id=None,
            reto_personalizado_id=None,
            reto_nivel_id=self.niveles[5],
        )
        self.assertEqual(salto.status_code, 409, salto.text)
        self.assertEqual(
            salto.json()["detail"],
            "Completa el Nivel 4 antes de continuar la aventura.",
        )

        actividad = self.crear_reto(
            self.aula["id"],
            reto_nivel_id=self.niveles[5],
            titulo="Nivel 5 asignado sin progreso de Aventura",
        )
        entrega_aula = self.entregar(
            reto_nivel_id=self.niveles[5],
            reto_personalizado_id=actividad["id"],
        )
        self.assertEqual(entrega_aula.status_code, 200, entrega_aula.text)
        with self.sessions() as db:
            self.assertEqual(
                db.query(ProgresoJugador).filter_by(
                    jugador_id=self.ids["jugador"],
                    reto_nivel_id=self.niveles[5],
                ).count(),
                0,
            )

    def test_mejora_recompensa_solo_suma_diferencia(self):
        contexto = {"aula_id": None, "reto_personalizado_id": None}
        primero = self.entregar(vidas_restantes=1, **contexto)
        mejor = self.entregar(vidas_restantes=3, **contexto)
        repetido = self.entregar(vidas_restantes=3, **contexto)
        self.assertEqual([r.status_code for r in (primero, mejor, repetido)], [200, 200, 200])
        self.assertEqual([r.json()["estrellas_totales_usuario"] for r in (primero, mejor, repetido)], [1, 3, 3])

    def test_aula_no_concede_saldo_ni_desbloquea_aventura(self):
        primera = self.entregar()
        repetida = self.entregar()
        self.assertTrue(primera.json()["es_primera_vez"])
        self.assertFalse(repetida.json()["es_primera_vez"])
        self.assertEqual(primera.json()["estrellas_obtenidas"], 3)
        self.assertEqual(primera.json()["estrellas_totales_usuario"], 0)
        self.assertEqual(self.client.get("/api/progreso/mis-niveles", headers=self.headers["jugador"]).json(), [])
        self.assertEqual(self.estado_guardado()["entregas"], 1)
        aventura = self.entregar(aula_id=None, reto_personalizado_id=None)
        self.assertTrue(aventura.json()["es_primera_vez"])
        self.assertEqual(aventura.json()["estrellas_totales_usuario"], 3)
        self.assertEqual(self.entregar().json()["estrellas_totales_usuario"], 3)

    def test_progreso_expone_id_interno_y_orden_publico_del_nivel(self):
        contexto = {"aula_id": None, "reto_personalizado_id": None}
        self.assertEqual(self.entregar(**contexto).status_code, 200)

        progreso = self.client.get(
            "/api/progreso/mis-niveles",
            headers=self.headers["jugador"],
        ).json()[0]

        self.assertEqual(progreso["reto_nivel_id"], self.niveles[1])
        self.assertEqual(progreso["nivel_orden"], 1)

    def test_compra_equipa_y_persiste_sin_reponer_el_saldo_al_repetir(self):
        contexto = {"aula_id": None, "reto_personalizado_id": None}
        for nivel in (1, 2):
            self.assertEqual(self.entregar(reto_nivel_id=self.niveles[nivel], **contexto).status_code, 200)
        avatar_id = self.avatares["Draco Aprendiz"]
        compra = self.client.post(f"/api/usuarios/avatares/{avatar_id}/comprar", headers=self.headers["jugador"])
        self.assertEqual(compra.status_code, 200, compra.text)
        self.assertEqual(compra.json()["estrellas_restantes"], 3)
        perfil = self.client.get("/api/usuarios/me", headers=self.headers["jugador"]).json()
        self.assertIsNone(perfil["avatar_actual_id"])
        self.assertIn(avatar_id, perfil["avatares_desbloqueados"])
        equipo = self.client.patch("/api/usuarios/avatares/equipar", headers=self.headers["jugador"], json={"avatar_id": avatar_id})
        self.assertEqual(equipo.status_code, 200, equipo.text)
        perfil = self.client.get("/api/usuarios/me", headers=self.headers["jugador"]).json()
        self.assertEqual((perfil["avatar_actual_id"], perfil["estrellas_totales"]), (avatar_id, 3))
        self.assertEqual(self.entregar(**contexto).json()["estrellas_totales_usuario"], 3)
        self.assertEqual(self.client.post(f"/api/usuarios/avatares/{avatar_id}/comprar", headers=self.headers["jugador"]).status_code, 400)
        with self.sessions() as db:
            self.assertEqual(db.get(Usuario, self.ids["jugador"]).estrellas_totales, 3)
            self.assertEqual(db.get(Usuario, self.ids["ajeno"]).avatares_desbloqueados, [])

    def test_fallo_al_guardar_progreso_revierte_entrega_saldo_y_notificacion(self):
        def fallar_commit(_session):
            raise SQLAlchemyError("fallo simulado")

        anterior = self.estado_guardado()
        event.listen(self.sessions.class_, "before_commit", fallar_commit)
        try:
            respuesta = self.entregar()
        finally:
            event.remove(self.sessions.class_, "before_commit", fallar_commit)

        self.assertEqual(respuesta.status_code, 500, respuesta.text)
        self.assertEqual(
            respuesta.json()["detail"],
            "No se pudo guardar el resultado. Tu saldo y progreso no fueron modificados.",
        )
        self.assertEqual(self.estado_guardado(), anterior)

    def test_fallo_al_comprar_avatar_no_desbloquea_ni_descuenta_estrellas(self):
        avatar_id = self.avatares["Draco Aprendiz"]
        with self.sessions() as db:
            jugador = db.get(Usuario, self.ids["jugador"])
            jugador.estrellas_totales = 5
            db.commit()

        def fallar_commit(_session):
            raise SQLAlchemyError("fallo simulado")

        event.listen(self.sessions.class_, "before_commit", fallar_commit)
        try:
            respuesta = self.client.post(
                f"/api/usuarios/avatares/{avatar_id}/comprar",
                headers=self.headers["jugador"],
            )
        finally:
            event.remove(self.sessions.class_, "before_commit", fallar_commit)

        self.assertEqual(respuesta.status_code, 500, respuesta.text)
        self.assertEqual(
            respuesta.json()["detail"],
            "No se pudo completar la compra. Tus estrellas no fueron descontadas.",
        )
        with self.sessions() as db:
            jugador = db.get(Usuario, self.ids["jugador"])
            self.assertEqual(jugador.estrellas_totales, 5)
            self.assertNotIn(avatar_id, jugador.avatares_desbloqueados or [])

    def test_fallo_al_equipar_avatar_conserva_el_avatar_anterior(self):
        avatar_id = self.avatares["Draco Base"]

        def fallar_commit(_session):
            raise SQLAlchemyError("fallo simulado")

        event.listen(self.sessions.class_, "before_commit", fallar_commit)
        try:
            respuesta = self.client.patch(
                "/api/usuarios/avatares/equipar",
                headers=self.headers["jugador"],
                json={"avatar_id": avatar_id},
            )
        finally:
            event.remove(self.sessions.class_, "before_commit", fallar_commit)

        self.assertEqual(respuesta.status_code, 500, respuesta.text)
        self.assertEqual(
            respuesta.json()["detail"],
            "No se pudo equipar el avatar. Vuelve a intentarlo.",
        )
        with self.sessions() as db:
            self.assertIsNone(db.get(Usuario, self.ids["jugador"]).avatar_actual_id)

    def test_saldo_insuficiente_no_compra_ni_equipa_un_avatar_de_pago(self):
        avatar_id = self.avatares["Draco Capa"]
        self.assertEqual(self.client.post(f"/api/usuarios/avatares/{avatar_id}/comprar", headers=self.headers["jugador"]).status_code, 400)
        self.assertEqual(self.client.patch("/api/usuarios/avatares/equipar", headers=self.headers["jugador"], json={"avatar_id": avatar_id}).status_code, 403)
        with self.sessions() as db:
            jugador = db.get(Usuario, self.ids["jugador"])
            self.assertEqual(jugador.estrellas_totales, 0)
            self.assertEqual(jugador.avatares_desbloqueados, [])
            self.assertIsNone(jugador.avatar_actual_id)

    def test_avatar_base_gratis_se_puede_equipar_sin_compra(self):
        avatar_id = self.avatares["Draco Base"]
        catalogo = self.client.get("/api/usuarios/avatares", headers=self.headers["jugador"]).json()
        self.assertTrue(next(a for a in catalogo if a["id"] == avatar_id)["desbloqueado"])
        respuesta = self.client.patch("/api/usuarios/avatares/equipar", headers=self.headers["jugador"], json={"avatar_id": avatar_id})
        self.assertEqual(respuesta.status_code, 200, respuesta.text)
        self.assertEqual(self.client.get("/api/usuarios/me", headers=self.headers["jugador"]).json()["estrellas_totales"], 0)

    def test_avatares_inactivos_o_inexistentes_no_se_compran_ni_equipan(self):
        avatar_id = self.avatares["Draco Base"]
        with self.sessions() as db:
            db.get(TiendaAvatar, avatar_id).activo = False
            db.commit()
        for identificador in (avatar_id, 99999):
            self.assertEqual(self.client.post(f"/api/usuarios/avatares/{identificador}/comprar", headers=self.headers["jugador"]).status_code, 404)
            self.assertEqual(self.client.patch("/api/usuarios/avatares/equipar", headers=self.headers["jugador"], json={"avatar_id": identificador}).status_code, 404)

    def test_ids_numericos_no_se_convierten_desde_tipos_ambiguos(self):
        for valor in (True, 1.5, "1", 0, -1):
            with self.subTest(reto_nivel_id=valor):
                respuesta = self.entregar(reto_nivel_id=valor)
                self.assertEqual(respuesta.status_code, 422, respuesta.text)

        for datos in (
            {"avatar_id": True},
            {"avatar_id": 1.5},
            {"avatar_id": "1"},
            {"avatar_id": 0},
            {"avatar_id": -1},
            {"avatar_id": self.avatares["Draco Base"], "usuario_id": self.ids["ajeno"]},
        ):
            with self.subTest(avatar=datos):
                respuesta = self.client.patch(
                    "/api/usuarios/avatares/equipar",
                    headers=self.headers["jugador"],
                    json=datos,
                )
                self.assertEqual(respuesta.status_code, 422, respuesta.text)

        with self.sessions() as db:
            jugador = db.get(Usuario, self.ids["jugador"])
            self.assertIsNone(jugador.avatar_actual_id)
            self.assertEqual(db.query(ProgresoAula).count(), 0)

    def test_catalogo_inicial_no_duplica_ni_sobrescribe_avatares(self):
        with self.sessions() as db:
            avatar = db.get(TiendaAvatar, self.avatares["Draco Aprendiz"])
            avatar.precio_estrellas = 7
            self.assertEqual(registrar_avatares_faltantes(db), 0)
            self.assertEqual(db.query(TiendaAvatar).count(), 13)
            self.assertEqual(avatar.precio_estrellas, 7)

    def test_nota_academica_por_intentos_es_independiente_de_estrellas(self):
        for intentos, nota in ((1, 10), (2, 8), (3, 8), (4, 6)):
            with self.subTest(intentos=intentos):
                reto = self.crear_reto(self.aula["id"])
                respuesta = self.entregar(reto_personalizado_id=reto["id"], intentos=intentos,
                                         vidas_restantes=3, ayudas_usadas=False)
                self.assertEqual(respuesta.status_code, 200, respuesta.text)
                self.assertEqual(respuesta.json()["estrellas_obtenidas"], 3)
                with self.sessions() as db:
                    progreso = db.query(ProgresoAula).filter_by(reto_personalizado_id=reto["id"]).one()
                    self.assertEqual(progreso.calificacion_numerica, nota)

    def test_inscritos_y_calificaciones_se_ordenan_por_apellido(self):
        with self.sessions() as db:
            db.get(Usuario, self.ids["jugador"]).apellido = "Zamora"
            db.get(Usuario, self.ids["ajeno"]).apellido = "Alvarez"
            db.commit()
        self.unirse("ajeno", self.aula)

        raiz = f"/api/aulas/{self.aula['id']}"
        inscritos = self.client.get(
            f"{raiz}/jugadores", headers=self.headers["anfitrion"]
        )
        self.assertEqual(inscritos.status_code, 200, inscritos.text)
        self.assertEqual(
            [jugador["apellido"] for jugador in inscritos.json()],
            ["Alvarez", "Zamora"],
        )

        seguimiento = self.client.get(
            f"{raiz}/seguimiento", headers=self.headers["anfitrion"]
        )
        self.assertEqual(seguimiento.status_code, 200, seguimiento.text)
        self.assertEqual(
            [jugador["apellido"] for jugador in seguimiento.json()["actividades"][0]["jugadores"]],
            ["Alvarez", "Zamora"],
        )

    def test_jugador_y_ajeno_no_gestionan_aulas_ni_ven_reportes_de_otro(self):
        for usuario in ("jugador", "ajeno", "otro_anfitrion"):
            headers = self.headers[usuario]
            raiz = f"/api/aulas/{self.aula['id']}"
            for ruta in ("jugadores", "seguimiento"):
                self.assertEqual(self.client.get(f"{raiz}/{ruta}", headers=headers).status_code, 404)
            self.assertEqual(self.client.delete(raiz, headers=headers).status_code, 404)
            self.assertEqual(self.client.patch(f"{raiz}/retos/{self.reto['id']}/programacion", headers=headers,
                                              json={"fecha_limite": None}).status_code, 404)
            self.assertEqual(self.client.post(f"{raiz}/retos/{self.reto['id']}/cerrar", headers=headers).status_code, 404)
        for ruta in ("niveles", "retos"):
            self.assertEqual(self.client.get(f"/api/aulas/{self.aula['id']}/{ruta}", headers=self.headers["ajeno"]).status_code, 403)

    def test_cierre_informa_solo_a_pendientes_y_rechaza_entregas(self):
        self.unirse("ajeno", self.aula)
        self.assertEqual(self.entregar().status_code, 200)
        ruta = f"/api/aulas/{self.aula['id']}/retos/{self.reto['id']}/cerrar"
        self.assertEqual(self.client.post(ruta, headers=self.headers["anfitrion"]).status_code, 200)
        with self.sessions() as db:
            avisos = db.query(Notificacion).filter_by(titulo="Actividad cerrada").all()
            self.assertEqual([aviso.usuario_id for aviso in avisos], [self.ids["ajeno"]])
        anterior = self.estado_guardado()
        self.assertEqual(self.client.post(ruta, headers=self.headers["anfitrion"]).status_code, 200)
        self.assertEqual(self.entregar("ajeno").status_code, 409)
        self.assertEqual(self.estado_guardado(), anterior)

    def test_vencimiento_cierra_y_genera_reporte_final_una_sola_vez(self):
        self.unirse("ajeno", self.aula)
        self.assertEqual(self.entregar().status_code, 200)
        limite = ahora_utc() - timedelta(minutes=1)
        with self.sessions() as db:
            db.get(RetoPersonalizado, self.reto["id"]).fecha_limite = limite
            db.commit()

        avisos_anfitrion = self.client.get(
            "/api/notificaciones/", headers=self.headers["anfitrion"]
        ).json()
        reportes = [aviso for aviso in avisos_anfitrion if aviso["titulo"] == "Reporte final disponible"]
        self.assertEqual(len(reportes), 1)
        self.assertIn("1/2 entregas", reportes[0]["mensaje"])
        self.assertIn("1 pendiente(s)", reportes[0]["mensaje"])
        self.assertIn("promedio 10.0/10", reportes[0]["mensaje"])

        avisos_pendiente = self.client.get(
            "/api/notificaciones/", headers=self.headers["ajeno"]
        ).json()
        self.assertEqual(
            len([aviso for aviso in avisos_pendiente if aviso["titulo"] == "Actividad vencida"]), 1
        )
        avisos_completado = self.client.get(
            "/api/notificaciones/", headers=self.headers["jugador"]
        ).json()
        self.assertFalse(any(aviso["titulo"] == "Actividad vencida" for aviso in avisos_completado))

        reporte = self.client.get(
            f"/api/aulas/{self.aula['id']}/seguimiento", headers=self.headers["anfitrion"]
        ).json()["actividades"][0]
        self.assertEqual(reporte["estado"], "cerrada")
        self.assertEqual((reporte["completados"], reporte["pendientes"], reporte["promedio_calificacion"]),
                         (1, 1, 10.0))
        self.assertFalse(self.client.get(
            "/api/aulas/mis-aulas", headers=self.headers["ajeno"]
        ).json()[0]["actividades_pendientes"])

        with self.sessions() as db:
            reto = db.get(RetoPersonalizado, self.reto["id"])
            self.assertEqual(reto.fecha_cierre, limite)
            avisos_antes = db.query(Notificacion).count()
        # Consultas y un cierre manual posterior no duplican avisos ni el reporte.
        self.client.get("/api/notificaciones/", headers=self.headers["anfitrion"])
        self.client.get(f"/api/aulas/{self.aula['id']}/retos", headers=self.headers["ajeno"])
        self.client.post(
            f"/api/aulas/{self.aula['id']}/retos/{self.reto['id']}/cerrar",
            headers=self.headers["anfitrion"],
        )
        with self.sessions() as db:
            self.assertEqual(db.query(Notificacion).count(), avisos_antes)

    def test_una_actividad_vencida_no_aparece_como_pendiente(self):
        with self.sessions() as db:
            db.get(RetoPersonalizado, self.reto["id"]).fecha_limite = ahora_utc() - timedelta(seconds=1)
            db.commit()
        aulas = self.client.get("/api/aulas/mis-aulas", headers=self.headers["jugador"])
        self.assertEqual(aulas.status_code, 200, aulas.text)
        self.assertFalse(aulas.json()[0]["actividades_pendientes"])

    def test_notificaciones_son_privadas_y_solo_su_dueno_puede_marcar_leidas(self):
        avisos = self.client.get("/api/notificaciones/", headers=self.headers["jugador"]).json()
        self.assertTrue(avisos)
        ruta = f"/api/notificaciones/{avisos[0]['id']}/leer"
        self.assertEqual(self.client.patch(ruta, headers=self.headers["ajeno"]).status_code, 404)
        self.assertEqual(self.client.get("/api/notificaciones/", headers=self.headers["ajeno"]).json(), [])
        self.assertTrue(self.client.patch(ruta, headers=self.headers["jugador"]).json()["leida"])

    def test_sin_sesion_no_se_puede_entregar(self):
        anterior = self.estado_guardado()
        respuesta = self.client.post("/api/progreso/guardar", json={
            "reto_nivel_id": self.niveles[1], "tiempo_segundos": 45, "intentos": 1,
            "codigo_solucion": "ogro.caminarAbajo()",
        })
        self.assertEqual(respuesta.status_code, 401)
        self.assertEqual(self.estado_guardado(), anterior)

    def test_anfitrion_conserva_acceso_para_probar_su_propia_actividad(self):
        respuesta = self.entregar("anfitrion")
        self.assertEqual(respuesta.status_code, 200, respuesta.text)
        with self.sessions() as db:
            guardado = db.query(ProgresoAula).one()
            self.assertEqual(guardado.jugador_id, self.ids["anfitrion"])


if __name__ == "__main__":
    unittest.main()
