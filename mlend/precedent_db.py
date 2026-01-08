# precedent_db.py
import os
from typing import Optional, Dict, Any, List

import psycopg
from psycopg.rows import dict_row


def _get_db_url() -> str:
    return (
        os.getenv("MLEND_DATABASE_URL")
        or os.getenv("DATABASE_URL")
        or ""
    )


def _connect():
    db_url = _get_db_url()
    if not db_url:
        raise ValueError(
            "Database URL not set. Provide MLEND_DATABASE_URL or DATABASE_URL."
        )
    return psycopg.connect(db_url, row_factory=dict_row)


def _fetch_one(query: str, params: tuple) -> Optional[Dict[str, Any]]:
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            row = cur.fetchone()
            return dict(row) if row else None


def _fetch_sections(query: str, params: tuple) -> List[Dict[str, Any]]:
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            rows = cur.fetchall()
            return [dict(row) for row in rows]


def _table_exists(table_name: str) -> bool:
    sql = "SELECT to_regclass(%s) AS name"
    row = _fetch_one(sql, (f"public.{table_name}",))
    return bool(row and row.get("name"))


def _normalize_sections(raw_sections: Any) -> List[Dict[str, Any]]:
    if not raw_sections or not isinstance(raw_sections, list):
        return []
    normalized: List[Dict[str, Any]] = []
    for section in raw_sections:
        if not isinstance(section, dict):
            continue
        heading = str(section.get("heading") or "").strip()
        body = str(
            section.get("body")
            if section.get("body") is not None
            else section.get("text") or ""
        ).strip()
        if heading or body:
            normalized.append({"heading": heading, "body": body})
    return normalized


def _query_doc_by_contract_type_id(contract_type_id: str) -> Optional[Dict[str, Any]]:
    sql = """
        SELECT
            title,
            front_matter,
            placeholders,
            sections
        FROM precedent_documents
        WHERE "contractTypeId" = %s
        ORDER BY created_at DESC
        LIMIT 1
    """
    return _fetch_one(sql, (contract_type_id,))


def _query_doc_by_contract_type_name(contract_type_name: str) -> Optional[Dict[str, Any]]:
    sql = """
        SELECT
            p.title,
            p.front_matter,
            p.placeholders,
            p.sections
        FROM precedent_documents p
        JOIN contract_types ct ON p."contractTypeId" = ct.id
        WHERE ct.name = %s
        ORDER BY p.created_at DESC
        LIMIT 1
    """
    return _fetch_one(sql, (contract_type_name,))


def _query_sections_by_contract_type_id(contract_type_id: str) -> List[Dict[str, Any]]:
    if not _table_exists("precedent_sections"):
        return []
    sql = """
        SELECT
            section_key,
            heading,
            text,
            start_paragraph_idx,
            end_paragraph_idx
        FROM precedent_sections
        WHERE "contractTypeId" = %s
        ORDER BY
            start_paragraph_idx NULLS LAST,
            end_paragraph_idx NULLS LAST,
            section_key
    """
    return _fetch_sections(sql, (contract_type_id,))


def _query_sections_by_contract_type_name(contract_type_name: str) -> List[Dict[str, Any]]:
    if not _table_exists("precedent_sections"):
        return []
    sql = """
        SELECT
            s.section_key,
            s.heading,
            s.text,
            s.start_paragraph_idx,
            s.end_paragraph_idx
        FROM precedent_sections s
        JOIN contract_types ct ON s."contractTypeId" = ct.id
        WHERE ct.name = %s
        ORDER BY
            s.start_paragraph_idx NULLS LAST,
            s.end_paragraph_idx NULLS LAST,
            s.section_key
    """
    return _fetch_sections(sql, (contract_type_name,))


def _build_outline(
    doc: Optional[Dict[str, Any]],
    sections: List[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    if not sections:
        return None
    return {
        "title": (doc or {}).get("title"),
        "front_matter": list((doc or {}).get("front_matter") or []),
        "placeholders": list((doc or {}).get("placeholders") or []),
        "sections": sections,
    }


def get_precedent_outline_from_db(
    contract_type_id: Optional[str],
    contract_type_name: Optional[str],
) -> Optional[Dict[str, Any]]:
    """
    Fetch a precedent outline from the database.

    Priority:
    1) contract_type_id
    2) contract_type_name
    """
    if contract_type_id:
        doc = _query_doc_by_contract_type_id(contract_type_id)
        doc_sections = _normalize_sections((doc or {}).get("sections"))
        outline = _build_outline(doc, doc_sections)
        if outline:
            return outline

        table_sections = _normalize_sections(
            _query_sections_by_contract_type_id(contract_type_id)
        )
        outline = _build_outline(doc, table_sections)
        if outline:
            return outline

    if contract_type_name:
        doc = _query_doc_by_contract_type_name(contract_type_name)
        doc_sections = _normalize_sections((doc or {}).get("sections"))
        outline = _build_outline(doc, doc_sections)
        if outline:
            return outline

        table_sections = _normalize_sections(
            _query_sections_by_contract_type_name(contract_type_name)
        )
        outline = _build_outline(doc, table_sections)
        if outline:
            return outline

    return None
