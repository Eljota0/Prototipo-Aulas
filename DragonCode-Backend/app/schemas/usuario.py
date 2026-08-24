from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# --- Schema para el perfil del usuario autenticado ---

class PerfilResponse(BaseModel):
    id: str
    email: str
    nombre: str
    apellido: str
    rol: str
    estrellas_totales: int
    avatar_actual_id: Optional[int] = None
    avatares_desbloqueados: Optional[List[int]] = []
    ultimo_acceso: datetime
    fecha_registro: datetime

    class Config:
        from_attributes = True

# --- Schema para el avatar ---

class AvatarResponse(BaseModel):
    id: int
    nombre_skin: str
    url_imagen: str
    precio_estrellas: int
    activo: bool
    desbloqueado: bool = False

    class Config:
        from_attributes = True

class EquiparAvatarRequest(BaseModel):
    avatar_id: int
