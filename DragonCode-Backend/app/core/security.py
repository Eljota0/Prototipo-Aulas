import os
import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
from passlib.context import CryptContext
from app.core.runtime import CLAVE_DESARROLLO

# Configuración de seguridad. En despliegue, SECRET_KEY debe definirse en el entorno.
SECRET_KEY = os.getenv("SECRET_KEY", CLAVE_DESARROLLO)
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 24)))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    """Verifica si la contraseña plana coincide con el hash."""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except (ValueError, TypeError):
        return False

def get_password_hash(password):
    """Genera un hash seguro para la contraseña usando bcrypt."""
    return pwd_context.hash(password)


def credential_revision(user_id: str, password_hash: str) -> str:
    """Vincula la sesión al hash actual sin exponer ese hash en el JWT."""
    message = f"dragoncode.session.v1\0{user_id}\0{password_hash}".encode("utf-8")
    return hmac.new(SECRET_KEY.encode("utf-8"), message, hashlib.sha256).hexdigest()


def create_user_access_token(user):
    return create_access_token(
        {
            "sub": user.email,
            "id": user.id,
            "rol": user.rol.value,
            "credential_revision": credential_revision(user.id, user.password_hash),
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Genera un Token JWT con los datos proporcionados."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
