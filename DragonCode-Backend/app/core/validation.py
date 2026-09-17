import re
from unicodedata import category


def normalizar_texto_visible(valor: str, nombre_campo: str) -> str:
    """Limpia bordes y rechaza texto vacío o caracteres de control."""
    if not isinstance(valor, str):
        raise ValueError(f"{nombre_campo} debe ser texto.")
    normalizado = valor.strip()
    if not normalizado:
        raise ValueError(f"{nombre_campo} no puede estar vacío.")
    if any(category(caracter) == "Cc" for caracter in normalizado):
        raise ValueError(f"{nombre_campo} no puede contener caracteres de control.")
    return normalizado


def validar_password_segura(password: str) -> str:
    """Aplica la política visible de DragonCode sin truncar bcrypt."""
    if not isinstance(password, str):
        raise ValueError("La contraseña debe ser texto.")
    if len(password) < 6:
        raise ValueError("La contraseña debe tener al menos 6 caracteres.")
    if len(password.encode("utf-8")) > 72 or re.search(r"[\x00-\x1f\x7f-\x9f]", password):
        raise ValueError("La contraseña excede el límite o contiene caracteres de control.")
    if not all(re.search(patron, password) for patron in (r"[A-Z]", r"[0-9]", r"[^a-zA-Z0-9]")):
        raise ValueError("La contraseña no cumple los requisitos indicados.")
    return password
