"""Amplía la tienda y baja el precio sin cambiar IDs ni compras existentes."""
from alembic import op
import sqlalchemy as sa

revision = "20260924_09"
down_revision = "20260915_08"
branch_labels = None
depends_on = None

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

def upgrade():
    tabla = sa.table('tienda_avatares', sa.column('id', sa.Integer),
                     sa.column('nombre_skin', sa.String), sa.column('url_imagen', sa.String),
                     sa.column('precio_estrellas', sa.Integer), sa.column('activo', sa.Boolean))
    db = op.get_bind()
    for nombre, archivo, precio in CATALOGO:
        ruta = f'assets/images/tienda/avatares/{archivo}'
        existente = db.execute(sa.select(tabla.c.id).where(sa.or_(
            tabla.c.url_imagen == ruta, tabla.c.nombre_skin == nombre,
            tabla.c.nombre_skin == nombre.replace('Draco ', 'Drako ', 1)
        ))).scalar()
        if existente is None:
            db.execute(tabla.insert().values(nombre_skin=nombre, url_imagen=ruta,
                                            precio_estrellas=precio, activo=True))
        else:
            db.execute(tabla.update().where(tabla.c.id == existente).values(
                nombre_skin=nombre, precio_estrellas=precio))


def downgrade():
    # No borrar avatares: pueden estar comprados o equipados por usuarios.
    # La reversión de precios requiere una decisión explícita sobre el catálogo.
    pass
