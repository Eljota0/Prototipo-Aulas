"""Comportamiento común de las transacciones HTTP."""

import unittest
from unittest.mock import Mock

from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError

from app.core.persistence import confirmar_transaccion


class ConfirmarTransaccionTests(unittest.TestCase):
    def test_confirma_sin_revertir_si_la_base_responde(self):
        db = Mock()
        confirmar_transaccion(db, "mensaje público")
        db.commit.assert_called_once_with()
        db.rollback.assert_not_called()

    def test_revierte_y_oculta_el_error_interno(self):
        db = Mock()
        db.commit.side_effect = SQLAlchemyError("detalle secreto de la base")
        with self.assertRaises(HTTPException) as contexto:
            confirmar_transaccion(db, "No se pudo guardar.")
        self.assertEqual(contexto.exception.status_code, 500)
        self.assertEqual(contexto.exception.detail, "No se pudo guardar.")
        self.assertNotIn("detalle secreto", str(contexto.exception.detail))
        db.rollback.assert_called_once_with()


if __name__ == "__main__":
    unittest.main()
