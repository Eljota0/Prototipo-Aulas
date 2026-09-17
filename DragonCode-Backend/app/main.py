import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base, SessionLocal
from app.core.academic_closure import cerrar_retos_vencidos
from app.core.runtime import (
    crear_esquema_al_arrancar,
    es_produccion,
    sembrar_datos_al_arrancar,
    validar_configuracion_produccion,
)
from app.initial_data import seed_initial_data
from app.routes import academico, auth, aulas, health, notificaciones, usuarios, progreso


logger = logging.getLogger(__name__)


def _intervalo_revision_vencimientos() -> int:
    try:
        return max(10, int(os.getenv("ACADEMIC_DEADLINE_CHECK_SECONDS", "60")))
    except ValueError:
        return 60


async def _vigilar_vencimientos(detener: asyncio.Event) -> None:
    """Materializa vencimientos mientras la API está activa."""
    while not detener.is_set():
        try:
            with SessionLocal() as db:
                if cerrar_retos_vencidos(db):
                    db.commit()
        except Exception:
            # Un fallo temporal de base no debe apagar toda la API.
            logger.exception("No se pudieron procesar los vencimientos académicos.")

        try:
            await asyncio.wait_for(
                detener.wait(), timeout=_intervalo_revision_vencimientos()
            )
        except asyncio.TimeoutError:
            pass


@asynccontextmanager
async def lifespan(_: FastAPI):
    validar_configuracion_produccion()
    if crear_esquema_al_arrancar():
        Base.metadata.create_all(bind=engine)
    if sembrar_datos_al_arrancar():
        with SessionLocal() as db:
            seed_initial_data(db)

    detener = asyncio.Event()
    tarea_vencimientos = asyncio.create_task(_vigilar_vencimientos(detener))
    try:
        yield
    finally:
        detener.set()
        await tarea_vencimientos

app = FastAPI(
    title="DragonCode API",
    description="API for the DragonCode educational platform",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None if es_produccion() else "/docs",
    redoc_url=None if es_produccion() else "/redoc",
    openapi_url=None if es_produccion() else "/openapi.json",
)

origenes_permitidos = [
    origen.strip()
    for origen in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:4300,https://dragoncode-front.vercel.app",
    ).split(",")
    if origen.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origenes_permitidos,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)


@app.middleware("http")
async def agregar_cabeceras_seguras(request, call_next):
    """Evita interpretar respuestas de la API como contenido navegable."""
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    if request.url.path.startswith("/api/"):
        response.headers.setdefault("Cache-Control", "no-store")
    return response

# Routers
app.include_router(auth.router,      prefix="/api/auth",     tags=["Autenticación"])
app.include_router(usuarios.router,  prefix="/api/usuarios", tags=["Usuarios & Tienda"])
app.include_router(aulas.router,     prefix="/api/aulas",    tags=["Aulas Virtuales"])
app.include_router(academico.router, prefix="/api/aulas",    tags=["Seguimiento Académico"])
app.include_router(progreso.router,  prefix="/api/progreso", tags=["Progreso del Juego"])
app.include_router(notificaciones.router, prefix="/api/notificaciones", tags=["Notificaciones"])
app.include_router(health.router, prefix="/health", tags=["Estado del servicio"])

@app.get("/", tags=["Root"])
def read_root():
    return {"message": "Welcome to DragonCode API 🐉", "version": "1.0.0"}
