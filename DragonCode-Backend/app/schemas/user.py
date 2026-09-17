from pydantic import BaseModel, ConfigDict, EmailStr, Field, SecretStr, field_serializer, field_validator
from typing import Optional, List
from datetime import datetime
from app.models.models import RolUsuario
from app.core.academic import fecha_utc_para_respuesta
from app.core.validation import normalizar_texto_visible, validar_password_segura

class UserCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)

    email: EmailStr
    password: str = Field(min_length=6, max_length=72, strict=True)
    nombre: str = Field(min_length=1, max_length=100, strict=True)
    apellido: str = Field(min_length=1, max_length=100, strict=True)

    @field_validator("email", mode="before")
    @classmethod
    def normalizar_email(cls, valor):
        if not isinstance(valor, str):
            raise ValueError("El correo electrónico debe ser texto.")
        return valor.strip().lower()

    @field_validator("nombre", "apellido", mode="before")
    @classmethod
    def validar_nombre(cls, valor, info):
        return normalizar_texto_visible(valor, info.field_name.capitalize())

    @field_validator("password")
    @classmethod
    def validar_password(cls, password):
        return validar_password_segura(password)

class UserLogin(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)

    email: EmailStr
    password: str = Field(min_length=1, max_length=1024, strict=True)

    @field_validator("email", mode="before")
    @classmethod
    def normalizar_email(cls, valor):
        if not isinstance(valor, str):
            raise ValueError("El correo electrónico debe ser texto.")
        return valor.strip().lower()


class CambiarPasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)

    password_actual: SecretStr = Field(min_length=1, max_length=1024)
    password_nueva: SecretStr = Field(min_length=6, max_length=72)

    @field_validator("password_nueva")
    @classmethod
    def validar_nueva_password(cls, secret):
        password = secret.get_secret_value()
        validar_password_segura(password)
        return secret

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    nombre: str
    apellido: str
    rol: RolUsuario
    estrellas_totales: int = 0
    avatar_actual_id: Optional[int] = None
    avatares_desbloqueados: Optional[List[int]] = Field(default_factory=list)
    ultimo_acceso: datetime
    fecha_registro: datetime

    @field_serializer("ultimo_acceso", "fecha_registro", when_used="json")
    def serializar_fechas(self, fecha):
        return fecha_utc_para_respuesta(fecha)

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
