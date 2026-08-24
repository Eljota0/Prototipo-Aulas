from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from app.models.models import RolUsuario

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    nombre: str
    apellido: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    nombre: str
    apellido: str
    rol: RolUsuario
    estrellas_totales: int = 0
    avatar_actual_id: Optional[int] = None
    avatares_desbloqueados: Optional[List[int]] = []
    ultimo_acceso: datetime
    fecha_registro: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
