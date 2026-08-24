import uuid
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, DateTime, Enum, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.database import Base

class RolUsuario(str, enum.Enum):
    jugador = "jugador"
    anfitrion = "anfitrion"
    admin = "admin"

class EstadoAula(str, enum.Enum):
    activa = "activa"
    archivada = "archivada"

class TipoReto(str, enum.Enum):
    laberinto = "laberinto"
    pocion = "pocion"

class EstadoReto(str, enum.Enum):
    borrador = "borrador"
    publicado = "publicado"

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    nombre = Column(String, nullable=False)
    apellido = Column(String, nullable=False)
    rol = Column(Enum(RolUsuario), default=RolUsuario.jugador)
    estrellas_totales = Column(Integer, default=0)
    avatar_actual_id = Column(Integer, ForeignKey("tienda_avatares.id"), nullable=True)
    avatares_desbloqueados = Column(JSON, default=lambda: [])
    ultimo_acceso = Column(DateTime, default=datetime.utcnow)
    fecha_registro = Column(DateTime, default=datetime.utcnow)

    # Relaciones
    avatar_actual = relationship("TiendaAvatar")
    aulas_creadas = relationship("AulaVirtual", back_populates="anfitrion")
    aulas_inscritas = relationship("AulaJugador", back_populates="jugador")
    progreso_historia = relationship("ProgresoJugador", back_populates="jugador")
    progreso_personalizado = relationship("ProgresoAula", back_populates="jugador")
    notificaciones_recibidas = relationship("Notificacion", back_populates="usuario")

class TiendaAvatar(Base):
    __tablename__ = "tienda_avatares"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nombre_skin = Column(String, unique=True, nullable=False)
    url_imagen = Column(String, nullable=False)
    precio_estrellas = Column(Integer, default=0)
    activo = Column(Boolean, default=True)

class AulaVirtual(Base):
    __tablename__ = "aulas_virtuales"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    anfitrion_id = Column(String, ForeignKey("usuarios.id"), nullable=False)
    codigo_acceso = Column(String, unique=True, index=True, nullable=False)
    nombre_aula = Column(String, nullable=False)
    estado = Column(Enum(EstadoAula), default=EstadoAula.activa)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)

    # Relaciones
    anfitrion = relationship("Usuario", back_populates="aulas_creadas")
    inscripciones = relationship("AulaJugador", back_populates="aula")
    retos = relationship("RetoPersonalizado", back_populates="aula")

class AulaJugador(Base):
    __tablename__ = "aula_jugadores"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    aula_id = Column(String, ForeignKey("aulas_virtuales.id"), nullable=False)
    jugador_id = Column(String, ForeignKey("usuarios.id"), nullable=False)
    fecha_ingreso = Column(DateTime, default=datetime.utcnow)

    # Relaciones
    aula = relationship("AulaVirtual", back_populates="inscripciones")
    jugador = relationship("Usuario", back_populates="aulas_inscritas")

class RetoNivel(Base):
    __tablename__ = "retos_niveles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    orden = Column(Integer, unique=True, nullable=False)
    titulo = Column(String, nullable=False)
    descripcion = Column(Text, nullable=False)
    tipo_reto = Column(Enum(TipoReto), default=TipoReto.laberinto)
    parametros_evaluacion = Column(JSON, nullable=False)
    recompensa_estrellas = Column(Integer, default=5)

    # Relaciones
    progresos = relationship("ProgresoJugador", back_populates="reto")

class ProgresoJugador(Base):
    __tablename__ = "progreso_jugador"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    jugador_id = Column(String, ForeignKey("usuarios.id"), nullable=False)
    reto_nivel_id = Column(Integer, ForeignKey("retos_niveles.id"), nullable=False)
    completado = Column(Boolean, default=False)
    estrellas_obtenidas = Column(Integer, default=0)
    intentos = Column(Integer, default=0)
    tiempo_segundos = Column(Integer, default=0)
    codigo_solucion = Column(Text, nullable=True)
    fecha_completado = Column(DateTime, nullable=True)

    # Relaciones
    jugador = relationship("Usuario", back_populates="progreso_historia")
    reto = relationship("RetoNivel", back_populates="progresos")

class RetoPersonalizado(Base):
    __tablename__ = "retos_personalizados"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    aula_id = Column(String, ForeignKey("aulas_virtuales.id"), nullable=False)
    titulo = Column(String, nullable=False)
    estado = Column(Enum(EstadoReto), default=EstadoReto.borrador)
    tipo_reto = Column(Enum(TipoReto), default=TipoReto.laberinto)
    parametros_evaluacion = Column(JSON, nullable=False)
    recompensa_estrellas = Column(Integer, default=5)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)

    # Relaciones
    aula = relationship("AulaVirtual", back_populates="retos")
    progresos = relationship("ProgresoAula", back_populates="reto")

class ProgresoAula(Base):
    __tablename__ = "progreso_aula"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    jugador_id = Column(String, ForeignKey("usuarios.id"), nullable=False)
    reto_personalizado_id = Column(String, ForeignKey("retos_personalizados.id"), nullable=False)
    completado = Column(Boolean, default=False)
    estrellas_obtenidas = Column(Integer, default=0)
    calificacion_numerica = Column(Integer, default=0)
    intentos = Column(Integer, default=0)
    tiempo_segundos = Column(Integer, default=0)
    codigo_solucion = Column(Text, nullable=True)
    fecha_completado = Column(DateTime, nullable=True)

    # Relaciones
    jugador = relationship("Usuario", back_populates="progreso_personalizado")
    reto = relationship("RetoPersonalizado", back_populates="progresos")

class Notificacion(Base):
    __tablename__ = "notificaciones"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    usuario_id = Column(String, ForeignKey("usuarios.id"), nullable=False)
    titulo = Column(String, nullable=False)
    mensaje = Column(Text, nullable=False)
    leida = Column(Boolean, default=False)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)

    # Relaciones
    usuario = relationship("Usuario", back_populates="notificaciones_recibidas")
