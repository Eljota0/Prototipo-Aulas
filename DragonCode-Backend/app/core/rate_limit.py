"""Protecciones locales contra intentos repetidos de autenticación."""

from __future__ import annotations

import hashlib
import os
import threading
import time
from collections import deque
from dataclasses import dataclass, field
from math import ceil
from typing import Callable, Deque


def _entero_configurable(nombre: str, predeterminado: int, minimo: int, maximo: int) -> int:
    try:
        valor = int(os.getenv(nombre, str(predeterminado)))
    except (TypeError, ValueError):
        return predeterminado
    return min(maximo, max(minimo, valor))


@dataclass
class _Intentos:
    fallos: Deque[float] = field(default_factory=deque)
    bloqueado_hasta: float = 0.0
    ultima_actividad: float = 0.0


class LoginRateLimiter:
    """Limita fallos por combinación cliente/correo sin guardar esos datos en claro."""

    def __init__(
        self,
        max_fallos: int | None = None,
        ventana_segundos: int | None = None,
        bloqueo_segundos: int | None = None,
        max_claves: int = 10_000,
        reloj: Callable[[], float] = time.monotonic,
    ) -> None:
        self.max_fallos = max_fallos or _entero_configurable(
            "AUTH_LOGIN_MAX_FAILURES", 5, 2, 50
        )
        self.ventana_segundos = ventana_segundos or _entero_configurable(
            "AUTH_LOGIN_WINDOW_SECONDS", 300, 10, 86_400
        )
        self.bloqueo_segundos = bloqueo_segundos or _entero_configurable(
            "AUTH_LOGIN_BLOCK_SECONDS", 300, 10, 86_400
        )
        self.max_claves = max(100, max_claves)
        self._reloj = reloj
        self._intentos: dict[str, _Intentos] = {}
        self._lock = threading.RLock()

    @staticmethod
    def crear_clave(cliente: str | None, email: str) -> str:
        origen = (cliente or "desconocido").strip().lower()
        correo = email.strip().lower()
        return hashlib.sha256(f"{origen}\0{correo}".encode("utf-8")).hexdigest()

    def segundos_restantes(self, clave: str) -> int:
        ahora = self._reloj()
        with self._lock:
            registro = self._intentos.get(clave)
            if registro is None:
                return 0
            registro.ultima_actividad = ahora
            self._descartar_fallos_antiguos(registro, ahora)
            if registro.bloqueado_hasta <= ahora:
                registro.bloqueado_hasta = 0.0
                if not registro.fallos:
                    self._intentos.pop(clave, None)
                return 0
            return max(1, ceil(registro.bloqueado_hasta - ahora))

    def registrar_fallo(self, clave: str) -> int:
        ahora = self._reloj()
        with self._lock:
            self._limpiar_si_es_necesario(ahora)
            registro = self._intentos.setdefault(clave, _Intentos())
            registro.ultima_actividad = ahora
            self._descartar_fallos_antiguos(registro, ahora)
            if registro.bloqueado_hasta > ahora:
                return max(1, ceil(registro.bloqueado_hasta - ahora))

            registro.fallos.append(ahora)
            if len(registro.fallos) >= self.max_fallos:
                registro.fallos.clear()
                registro.bloqueado_hasta = ahora + self.bloqueo_segundos
                return self.bloqueo_segundos
            return 0

    def limpiar(self, clave: str) -> None:
        with self._lock:
            self._intentos.pop(clave, None)

    def reiniciar(self) -> None:
        """Permite aislar pruebas y reinicios controlados del proceso."""
        with self._lock:
            self._intentos.clear()

    def _descartar_fallos_antiguos(self, registro: _Intentos, ahora: float) -> None:
        limite = ahora - self.ventana_segundos
        while registro.fallos and registro.fallos[0] <= limite:
            registro.fallos.popleft()

    def _limpiar_si_es_necesario(self, ahora: float) -> None:
        if len(self._intentos) < self.max_claves:
            return
        antiguedad = max(self.ventana_segundos, self.bloqueo_segundos)
        obsoletas = [
            clave
            for clave, registro in self._intentos.items()
            if registro.bloqueado_hasta <= ahora
            and ahora - registro.ultima_actividad > antiguedad
        ]
        for clave in obsoletas:
            self._intentos.pop(clave, None)
        if len(self._intentos) >= self.max_claves:
            mas_antigua = min(
                self._intentos,
                key=lambda clave: self._intentos[clave].ultima_actividad,
            )
            self._intentos.pop(mas_antigua, None)


login_attempt_limiter = LoginRateLimiter()
