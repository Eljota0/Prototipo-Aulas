"""Catálogo inicial. No se ejecuta al arrancar la API ni cambia avatares existentes.

Preparar con: python -m app.seed_avatares
Aplicar expresamente: python -m app.seed_avatares --aplicar
"""
import argparse

from sqlalchemy.orm import Session
from app.models.models import TiendaAvatar


CATALOGO = (
    ("Draco Base", "drakobase.png", 0),
    ("Draco Aprendiz", "drakoaprendiz.png", 3),
    ("Draco Capa", "drakocapa.png", 3),
    ("Draco Chancla", "drakochancla.png", 3),
    ("Draco Haaland", "drakohaaland.png", 3),
    ("Draco Mbappé", "drakombappe.png", 3),
    ("Draco Graduado", "nuevas_skins/drakograduado.png", 3),
    ("Draco Karate", "nuevas_skins/drakokarate.png", 3),
    ("Draco Payaso", "nuevas_skins/drakopayaso.png", 3),
    ("Draco Sacerdote", "nuevas_skins/drakosacerdote.png", 3),
    ("Draco Samurái", "nuevas_skins/drakosamurai.png", 3),
    ("Draco Superhéroe", "nuevas_skins/drakosuperheroe.png", 3),
    ("Draco Vaquero", "nuevas_skins/drakovaquero.png", 3),
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
