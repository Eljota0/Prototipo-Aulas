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
