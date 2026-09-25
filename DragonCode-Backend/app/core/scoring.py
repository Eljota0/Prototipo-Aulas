def calcular_estrellas(vidas_restantes: int, ayudas_usadas: bool) -> int:
    """RF-07: una estrella por vida; usar ayudas resta una, mínimo una al ganar."""
    return max(1, vidas_restantes - int(ayudas_usadas))
def calcular_calificacion(intentos: int) -> int:
    """Aplica la rúbrica documental: 10, 8 o 6 según los intentos."""
    if intentos <= 1:
        return 10
    if intentos <= 3:
        return 8
    return 6


def calcular_estrellas_aventura(nivel: int, ayudas_usadas: bool,
                               tarjetas_usadas: bool, vidas_perdidas: int,
                               intentos: int) -> int:
    """Tres logros independientes. Curarse no borra una vida perdida."""
    if nivel == 1:
        logro_extra = not tarjetas_usadas
    elif nivel == 2:
        logro_extra = intentos == 1
    else:
        logro_extra = vidas_perdidas == 0
    return 1 + int(not ayudas_usadas) + int(logro_extra)
