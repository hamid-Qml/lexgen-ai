import re
import zipfile
import xml.etree.ElementTree as ET
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List

WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
NS = {"w": WORD_NS}

PLACEHOLDER_RE = re.compile(r"{{\s*([^}]+?)\s*}}")
TOP_LEVEL_NUMBERED_RE = re.compile(r"^(\d+)\.\s+(.+)$")


def _normalize_text(text: str) -> str:
    replacements = {
        "\u2013": "-",
        "\u2014": "-",
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
    }
    for src, dest in replacements.items():
        text = text.replace(src, dest)
    return text


def _letters(text: str) -> List[str]:
    return [ch for ch in text if ch.isalpha()]


def _caps_ratio(text: str) -> float:
    letters = _letters(text)
    if not letters:
        return 0.0
    upper = sum(1 for ch in letters if ch.isupper())
    return upper / len(letters)


def _is_all_caps_heading(text: str) -> bool:
    letters = _letters(text)
    if not letters:
        return False
    if len(text) > 120:
        return False
    return all(ch.isupper() for ch in letters)


def _is_top_level_numbered_heading(text: str) -> bool:
    match = TOP_LEVEL_NUMBERED_RE.match(text)
    if not match:
        return False
    tail = match.group(2)
    return _caps_ratio(tail) >= 0.6


def _is_section_heading(text: str) -> bool:
    return _is_top_level_numbered_heading(text) or _is_all_caps_heading(text)


def extract_docx_paragraphs(path: Path) -> List[str]:
    with zipfile.ZipFile(path) as zf:
        xml = zf.read("word/document.xml")
    root = ET.fromstring(xml)
    paragraphs: List[str] = []
    for p in root.findall(".//w:p", NS):
        pieces = [t.text for t in p.findall(".//w:t", NS) if t.text]
        if not pieces:
            continue
        text = _normalize_text("".join(pieces)).strip()
        if text:
            paragraphs.append(text)
    return paragraphs


def _extract_placeholders(lines: List[str]) -> List[str]:
    found = []
    for line in lines:
        for match in PLACEHOLDER_RE.findall(line):
            key = match.strip()
            if key:
                found.append(key)
    return sorted(set(found))


def build_precedent_outline(path: Path) -> Dict[str, Any]:
    paragraphs = extract_docx_paragraphs(path)
    title = None
    front_matter: List[str] = []
    sections: List[Dict[str, str]] = []

    index = 0
    if paragraphs and _is_all_caps_heading(paragraphs[0]):
        title = paragraphs[0]
        index = 1

    current = None
    front_matter_done = False

    for text in paragraphs[index:]:
        if _is_section_heading(text):
            front_matter_done = True
            if current:
                sections.append(
                    {
                        "heading": current["heading"],
                        "body": "\n".join(current["body"]).strip(),
                    }
                )
            current = {"heading": text, "body": []}
        else:
            if not front_matter_done:
                front_matter.append(text)
            elif current is not None:
                current["body"].append(text)

    if current:
        sections.append(
            {
                "heading": current["heading"],
                "body": "\n".join(current["body"]).strip(),
            }
        )

    placeholder_lines = []
    if title:
        placeholder_lines.append(title)
    placeholder_lines.extend(front_matter)
    for section in sections:
        placeholder_lines.append(section.get("heading", ""))
        placeholder_lines.append(section.get("body", ""))

    return {
        "title": title,
        "front_matter": front_matter,
        "sections": sections,
        "placeholders": _extract_placeholders(placeholder_lines),
    }


@lru_cache(maxsize=32)
def load_precedent_outline(path_str: str) -> Dict[str, Any]:
    path = Path(path_str)
    if not path.exists():
        raise FileNotFoundError(f"Precedent not found: {path}")
    return build_precedent_outline(path)
