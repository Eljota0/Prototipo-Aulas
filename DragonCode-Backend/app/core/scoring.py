def calcular_estrellas(tiempo_segundos: int, intentos: int, parametros: dict) -> int:
    """Calcula entre una y tres estrellas según tiempo e intentos."""
    tiempo_tres = parametros.get("tiempo_3_estrellas", 60)
    tiempo_dos = parametros.get("tiempo_2_estrellas", 120)
    max_intentos = parametros.get("intentos_max_sin_penalidad", 3)

    if tiempo_segundos <= tiempo_tres:
        estrellas = 3
    elif tiempo_segundos <= tiempo_dos:
        estrellas = 2
    else:
        estrellas = 1

    if intentos > max_intentos:
        estrellas = max(1, estrellas - 1)

    return estrellas


def calcular_calificacion(intentos: int) -> int:
    """Aplica la rúbrica documental: 10, 8 o 6 según los intentos."""
    if intentos <= 1:
        return 10
    if intentos == 2:
        return 8
    return 6
