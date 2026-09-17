import os
from urllib.parse import urlparse


CLAVE_DESARROLLO = "dragoncode_super_secret_key_2026"
ALGORITMOS_JWT_PERMITIDOS = {"HS256", "HS384", "HS512"}


def es_produccion() -> bool:
    return os.getenv("APP_ENV", "development").strip().lower() == "production"


def leer_bandera_entorno(nombre: str, predeterminado: bool) -> bool:
    """Lee una bandera sin aceptar valores ambiguos como verdaderos."""
    valor = os.getenv(nombre)
    if valor is None:
        return predeterminado
    return valor.strip().lower() in {"1", "true", "yes", "on"}


def crear_esquema_al_arrancar() -> bool:
    """Permite comodidad local, pero exige migraciones en producción."""
    return leer_bandera_entorno("AUTO_CREATE_SCHEMA", not es_produccion())


def sembrar_datos_al_arrancar() -> bool:
    """Carga catálogos por comodidad local, nunca implícitamente en producción."""
    return leer_bandera_entorno("SEED_INITIAL_DATA", not es_produccion())


def validar_configuracion_produccion() -> None:
    """Impide desplegar con valores locales o criptografía insegura."""
    if not es_produccion():
        return

    errores: list[str] = []
    clave = os.getenv("SECRET_KEY", "")
    algoritmo = os.getenv("ALGORITHM", "HS256").strip().upper()
    database_url = os.getenv("DATABASE_URL", "")
    origenes = [
        origen.strip()
        for origen in os.getenv("CORS_ORIGINS", "").split(",")
        if origen.strip()
    ]

    if len(clave) < 32 or clave in {CLAVE_DESARROLLO, "TU_CLAVE_SECRETA_AQUI"}:
        errores.append("SECRET_KEY debe ser única y tener al menos 32 caracteres")
    if algoritmo not in ALGORITMOS_JWT_PERMITIDOS:
        errores.append("ALGORITHM debe ser HS256, HS384 o HS512")
    if crear_esquema_al_arrancar():
        errores.append("AUTO_CREATE_SCHEMA debe estar desactivado; usa las migraciones")
    if sembrar_datos_al_arrancar():
        errores.append("SEED_INITIAL_DATA debe estar desactivado en producción")
    if not database_url or database_url.startswith("sqlite"):
        errores.append("DATABASE_URL debe apuntar a PostgreSQL")
    if not origenes:
        errores.append("CORS_ORIGINS debe incluir el dominio HTTPS del frontend")
    elif any(
        origen == "*"
        or urlparse(origen).scheme != "https"
        or urlparse(origen).hostname in {"localhost", "127.0.0.1"}
        for origen in origenes
    ):
        errores.append("CORS_ORIGINS solo puede contener orígenes HTTPS de producción")

    if errores:
        raise RuntimeError("Configuración de producción inválida: " + "; ".join(errores) + ".")
