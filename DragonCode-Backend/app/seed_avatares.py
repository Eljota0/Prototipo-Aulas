"""Catálogo inicial. No se ejecuta al arrancar la API ni cambia avatares existentes.

Preparar con: python -m app.seed_avatares
Aplicar expresamente: python -m app.seed_avatares --aplicar
"""
import argparse

from sqlalchemy.orm import Session
from app.models.models import TiendaAvatar


CATALOGO = (
    ("Drako Base", "drakobase.png", 0),
    ("Drako Aprendiz", "drakoaprendiz.png", 5),
    ("Drako Capa", "drakocapa.png", 5),
    ("Drako Chancla", "drakochancla.png", 5),
    ("Drako Haaland", "drakohaaland.png", 5),
    ("Drako Mbappé", "drakombappe.png", 5),
)


def registrar_avatares_faltantes(db: Session) -> int:
    creados = 0
    for nombre, archivo, precio in CATALOGO:
        ruta = f"assets/images/tienda/avatares/{archivo}"
        existente = db.query(TiendaAvatar).filter(
            (TiendaAvatar.nombre_skin == nombre) | (TiendaAvatar.url_imagen == ruta)
        ).first()
        if existente is None:
            db.add(TiendaAvatar(nombre_skin=nombre, url_imagen=ruta, precio_estrellas=precio, activo=True))
            db.flush()
            creados += 1
    return creados


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--aplicar", action="store_true")
    args = parser.parse_args()
    if not args.aplicar:
        for nombre, _, precio in CATALOGO:
            print(f"{nombre}: {precio} estrellas")
        print("Vista previa sin conexión a la base. --aplicar inserta solo los faltantes en la base configurada.")
    else:
        from app.database import SessionLocal
        with SessionLocal() as db:
            cantidad = registrar_avatares_faltantes(db)
            db.commit()
            print(f"Avatares nuevos: {cantidad}. Los registros existentes se conservaron.")
