# precedent_repo.py
from typing import Callable, Dict, Any, Optional

PrecedentLookup = Callable[[Optional[str], Optional[str]], Optional[Dict[str, Any]]]

_LOOKUP: Optional[PrecedentLookup] = None


def configure_precedent_lookup(fn: PrecedentLookup) -> None:
    """
    Configure a DB-backed precedent lookup.
    """
    global _LOOKUP
    _LOOKUP = fn


def get_precedent_outline(
    contract_type_id: Optional[str],
    contract_type_name: Optional[str],
    *,
    db_outline: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    """
    Return a precedent outline from a DB-backed lookup.

    If no lookup is configured, this falls back to the provided `db_outline`,
    which should already be sourced from the database by an upstream service.
    """
    if _LOOKUP is not None:
        return _LOOKUP(contract_type_id, contract_type_name)
    return db_outline
