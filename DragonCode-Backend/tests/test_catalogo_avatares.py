import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from app.models.models import TiendaAvatar
from app.seed_avatares import CATALOGO, registrar_avatares_faltantes


class CatalogoAvataresTests(unittest.TestCase):
    def test_migracion_conserva_ids_y_no_duplica_catalogo(self):
        engine = create_engine('sqlite://')
        self.addCleanup(engine.dispose)
        TiendaAvatar.__table__.create(engine)
        ruta = Path(__file__).parents[1] / 'migrations/versions/20260924_09_catalogo_avatares.py'
        spec = importlib.util.spec_from_file_location('catalogo_migration', ruta)
        migration = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(migration)
        with engine.begin() as db:
            db.execute(TiendaAvatar.__table__.insert().values(
                id=81, nombre_skin='Drako Chancla',
                url_imagen='assets/images/tienda/avatares/drakochancla.png',
                precio_estrellas=5, activo=True))
            with patch.object(migration.op, 'get_bind', return_value=db):
                migration.upgrade()
                migration.upgrade()
            rows = db.execute(select(TiendaAvatar.__table__)).mappings().all()
            self.assertEqual(len(rows), 13)
            chancla = next(row for row in rows if row['id'] == 81)
            self.assertEqual(chancla['nombre_skin'], 'Draco Chancla')
            self.assertEqual(chancla['precio_estrellas'], 3)
            for row in rows:
                self.assertEqual(row['precio_estrellas'], 0 if row['nombre_skin'] == 'Draco Base' else 3)
                asset = Path(__file__).parents[2] / 'DragonCode-Front/src' / row['url_imagen']
                self.assertTrue(asset.is_file(), str(asset))
        with Session(engine) as db:
            self.assertEqual(registrar_avatares_faltantes(db), 0)
        self.assertEqual(migration.CATALOGO, CATALOGO)
