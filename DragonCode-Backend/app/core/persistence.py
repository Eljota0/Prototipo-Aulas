"""Utilidades pequeñas para confirmar transacciones de forma segura."""

from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session


def confirmar_transaccion(db: Session, detalle: str) -> None:
    """Confirma la unidad de trabajo o la revierte sin exponer detalles internos."""
    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail=detalle) from None
