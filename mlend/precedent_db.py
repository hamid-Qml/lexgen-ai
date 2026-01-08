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


def _query_doc_by_contract_type_id(contract_type_id: str) -> Optional[Dict[str, Any]]:
    sql = """
        SELECT
            title,
            front_matter,
            placeholders
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
            p.placeholders
        FROM precedent_documents p
        JOIN contract_types ct ON p."contractTypeId" = ct.id
        WHERE ct.name = %s
        ORDER BY p.created_at DESC
        LIMIT 1
    """
    return _fetch_one(sql, (contract_type_name,))


def _query_sections_by_contract_type_id(contract_type_id: str) -> List[Dict[str, Any]]:
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


def _merge_sections(
    sections: List[Dict[str, Any]],
    target_max: int = 7,
) -> List[Dict[str, Any]]:
    if not sections:
        return []
    if len(sections) <= target_max:
        return [
            {
                "heading": (section.get("heading") or "").strip(),
                "body": (section.get("text") or "").strip(),
            }
            for section in sections
        ]

    chunk_size = (len(sections) + target_max - 1) // target_max
    merged: List[Dict[str, Any]] = []
    for i in range(0, len(sections), chunk_size):
        chunk = sections[i:i + chunk_size]
        headings = [s.get("heading") for s in chunk if s.get("heading")]
        combined_heading = " / ".join(headings) if headings else "Combined section"
        combined_text = "\n\n".join(
            (s.get("text") or "").strip() for s in chunk if (s.get("text") or "").strip()
        )
        merged.append(
            {
                "heading": combined_heading,
                "body": combined_text,
            }
        )
    return merged


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
        sections = _query_sections_by_contract_type_id(contract_type_id)
        merged_sections = _merge_sections(sections)
        if doc and merged_sections:
            return {
                "title": doc.get("title"),
                "front_matter": doc.get("front_matter"),
                "placeholders": doc.get("placeholders"),
                "sections": merged_sections,
            }
        if merged_sections:
            return {
                "title": None,
                "front_matter": [],
                "placeholders": [],
                "sections": merged_sections,
            }

    if contract_type_name:
        doc = _query_doc_by_contract_type_name(contract_type_name)
        sections = _query_sections_by_contract_type_name(contract_type_name)
        merged_sections = _merge_sections(sections)
        if doc and merged_sections:
            return {
                "title": doc.get("title"),
                "front_matter": doc.get("front_matter"),
                "placeholders": doc.get("placeholders"),
                "sections": merged_sections,
            }
        if merged_sections:
            return {
                "title": None,
                "front_matter": [],
                "placeholders": [],
                "sections": merged_sections,
            }

    return None
