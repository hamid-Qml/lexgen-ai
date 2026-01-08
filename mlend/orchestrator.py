# orchestrator.py
from dataclasses import dataclass
from typing import List, Dict, Any, Optional, Iterable, Tuple

from base_models import (
    ContractChatRequest,
    ContractChatResponse,
    GenerateContractRequest,
    GenerateContractResponse,
    ChatMessage,
    ContractQuestion,
)
from ml_service import MLService
from constants import CLAUDE_SONNET_4_5_INPUT_COST_PER_MILLION
from prompts import (
    CONTRACT_CHAT_SYSTEM_PROMPT,
    CONTRACT_SECTION_SYSTEM_PROMPT,
    CONTRACT_DISCLAIMER_TEXT,
)
from logger import get_logger
from progress_store import (
    init_progress,
    update_progress,
    complete_progress,
    fail_progress,
)
from precedent_repo import get_precedent_outline

logger = get_logger(__name__)
ml_service = MLService()


@dataclass(frozen=True)
class PrecedentSection:
    heading: str
    body: str


@dataclass(frozen=True)
class PrecedentOutline:
    title: Optional[str]
    front_matter: List[str]
    sections: List[PrecedentSection]
    placeholders: List[str]


@dataclass(frozen=True)
class UsageTotals:
    input_tokens: int
    output_tokens: int
    model: Optional[str]


_READY_SUMMARY_FLAG = "__ready_summary_sent"
_WELCOME_MESSAGE = "I'm here to help tailor this agreement to your specific needs."
_STANDARD_CLAUSE_KEYWORDS = (
    "boilerplate",
    "standard exclusion",
    "standard exclusions",
    "standard clause",
    "standard clauses",
    "standard provision",
    "standard provisions",
)


def _to_anthropic_messages(
    chat_messages: List[ChatMessage],
    leading_user_content: Optional[str] = None,
) -> List[Dict[str, str]]:
    """
    Convert our ChatMessage list into Anthropic's format.

    - Anthropic only accepts "user" and "assistant" roles in `messages`.
    - We optionally inject a leading user message that contains the
      synthesized context (contract type, answers, etc.).
    """
    messages: List[Dict[str, str]] = []

    if leading_user_content:
        messages.append({"role": "user", "content": leading_user_content})

    for message in chat_messages:
        role = message.role
        if role not in ("user", "assistant"):
            role = "user"
        messages.append({"role": role, "content": message.content})

    return messages


def _format_chat_history(
    chat_messages: List[ChatMessage],
    max_turns: int = 8,
) -> str:
    if not chat_messages:
        return ""

    trimmed = chat_messages[-max_turns:]
    lines: List[str] = []
    for msg in trimmed:
        role = msg.role
        if role not in ("user", "assistant"):
            role = "user"
        content = msg.content.strip()
        if content:
            lines.append(f"{role}: {content}")

    return "\n".join(lines)


def _ready_to_generate_message() -> str:
    return (
        "You're ready to generate the contract. Press the Generate button or say "
        "\"generate\"."
    )


def _ensure_section_heading(section_text: str, heading: str) -> str:
    cleaned = section_text.strip()
    clean_heading = heading.strip()
    if not clean_heading:
        return cleaned
    if not cleaned:
        return clean_heading
    if cleaned.lower().startswith(clean_heading.lower()):
        return cleaned
    return f"{clean_heading}\n\n{cleaned}"


def _merge_answers(
    form_answers: Dict[str, Any],
    chat_answers: Dict[str, Any],
) -> Dict[str, Any]:
    merged = {
        key: value
        for key, value in (chat_answers or {}).items()
        if not key.startswith("__")
    }
    merged.update(
        {
            key: value
            for key, value in (form_answers or {}).items()
            if not key.startswith("__")
        }
    )
    return merged


def _normalize_answer_value(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, list):
        parts = [str(v).strip() for v in value if str(v).strip()]
        return ", ".join(parts) if parts else None
    text = str(value).strip()
    return text or None


def _contains_standard_clause_language(text: Optional[str]) -> bool:
    if not text:
        return False
    lowered = text.lower()
    return any(keyword in lowered for keyword in _STANDARD_CLAUSE_KEYWORDS)


def _is_standard_clause_question(question: ContractQuestion) -> bool:
    parts = [question.key, question.label, question.description or ""]
    combined = " ".join(part for part in parts if part).strip()
    return _contains_standard_clause_language(combined)


def _should_prepend_welcome(chat_messages: List[ChatMessage]) -> bool:
    return not any(message.role == "assistant" for message in chat_messages)


def _prepend_welcome_if_missing(reply: str) -> str:
    stripped = reply.strip()
    if stripped.lower().startswith(_WELCOME_MESSAGE.lower()):
        return reply
    return f"{_WELCOME_MESSAGE}\n\n{stripped}"


def _apply_standard_defaults(
    questions: List[ContractQuestion],
    combined_answers: Dict[str, Any],
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    defaults: Dict[str, Any] = {}
    for question in questions:
        if not _is_standard_clause_question(question):
            continue
        if _normalize_answer_value(combined_answers.get(question.key)):
            continue
        defaults[question.key] = "Yes"

    if not defaults:
        return combined_answers, {}

    updated = dict(combined_answers)
    updated.update(defaults)
    return updated, defaults


def _build_ready_summary(answered_lines: List[str], max_items: int = 8) -> Optional[str]:
    items: List[str] = []
    fallback_items: List[str] = []
    for line in answered_lines:
        cleaned = line.lstrip("- ").strip()
        if not cleaned:
            continue
        fallback_items.append(cleaned)
        if _contains_standard_clause_language(cleaned):
            continue
        items.append(cleaned)

    if not items:
        items = fallback_items
    if not items:
        return None

    visible = items[:max_items]
    summary = f"Summary: {'. '.join(visible)}."
    remaining = len(items) - len(visible)
    if remaining > 0:
        summary = summary.rstrip(".") + f". And {remaining} more detail(s) captured."
    return summary


def _compute_answer_state(
    questions: List[ContractQuestion],
    combined_answers: Dict[str, Any],
) -> Tuple[List[str], List[str]]:
    answered_lines: List[str] = []
    missing_required: List[str] = []

    for question in questions:
        key = question.key
        normalized = _normalize_answer_value(combined_answers.get(key))
        if normalized:
            answered_lines.append(f"- {question.label}: {normalized}")
        elif question.required:
            missing_required.append(f"- {question.label} ({key})")

    return answered_lines, missing_required


def _render_lines(items: Iterable[str], empty: str) -> str:
    collected = [item for item in items if item]
    return "\n".join(collected) if collected else empty


def _build_template_meta(
    questions: List[ContractQuestion],
) -> List[Dict[str, str]]:
    return [{"key": q.key, "label": q.label} for q in questions]


def _build_chat_context_blob(
    *,
    contract_type_name: str,
    category: Optional[str],
    jurisdiction: Optional[str],
    clarifying_questions: List[str],
    template_questions: List[ContractQuestion],
    answered_lines: List[str],
    missing_required: List[str],
) -> str:
    clarifying_block = _render_lines(clarifying_questions, "- None")
    answered_block = _render_lines(answered_lines, "- None yet")
    missing_block = _render_lines(
        missing_required,
        "- None – feel free to double-check key clauses.",
    )

    lines = [
        "You are assisting with this contract:",
        "",
        f"- Contract type: {contract_type_name}",
        f"- Category: {category or 'unknown'}",
        f"- Jurisdiction: {jurisdiction or 'unknown'}",
        "",
        "Clarifying questions you should aim to cover (adapt wording/order as needed):",
        clarifying_block,
        "",
        "Template questions (keys only):",
        str([q.key for q in template_questions]),
        "",
        "Details already collected (do NOT ask these again):",
        answered_block,
        "",
        "Outstanding required details that still need confirmation:",
        missing_block,
        "",
        "Remember:",
        "- Ask ONE clear, specific question at a time.",
        "- Prioritise clarifying questions that have not been covered yet.",
        "- Do NOT draft the full contract text here.",
        "- Keep messages short, conversational, and in plain text (no markdown).",
        "- When the user says they are done or do not want to provide more info, confirm their intent and explain which details remain missing and how the contract will handle them (e.g. placeholders or assumptions).",
    ]

    return "\n".join(lines).strip()


def _format_contract_label(contract_type_id: Optional[str], contract_type_name: Optional[str]) -> str:
    if contract_type_name and contract_type_name.strip():
        return contract_type_name.strip()
    if contract_type_id and contract_type_id.strip():
        return contract_type_id.strip()
    return "unknown contract type"


def _parse_precedent_outline(raw_outline: Dict[str, Any]) -> PrecedentOutline:
    title = raw_outline.get("title")
    front_matter = list(raw_outline.get("front_matter") or [])
    placeholders = list(raw_outline.get("placeholders") or [])
    sections_raw = raw_outline.get("sections") or []

    sections: List[PrecedentSection] = []
    for section in sections_raw:
        heading = str(section.get("heading") or "").strip()
        body = str(section.get("body") or "").strip()
        if heading or body:
            sections.append(PrecedentSection(heading=heading, body=body))

    return PrecedentOutline(
        title=title,
        front_matter=front_matter,
        sections=sections,
        placeholders=placeholders,
    )


def _require_precedent_outline(
    contract_type_id: Optional[str],
    contract_type_name: Optional[str],
    db_outline: Optional[Dict[str, Any]],
) -> PrecedentOutline:
    outline = get_precedent_outline(
        contract_type_id,
        contract_type_name,
        db_outline=db_outline,
    )
    if not outline:
        label = _format_contract_label(contract_type_id, contract_type_name)
        raise ValueError(f"No precedent outline found for {label}.")

    parsed = _parse_precedent_outline(outline)
    if not parsed.sections:
        label = _format_contract_label(contract_type_id, contract_type_name)
        raise ValueError(f"No precedent sections found for {label}.")

    return parsed


def _build_section_context_blob(
    *,
    contract_type_name: str,
    category: Optional[str],
    jurisdiction: Optional[str],
    template_meta: List[Dict[str, str]],
    combined_answers: Dict[str, Any],
    chat_history: str,
    precedent_title: Optional[str],
    precedent_front_matter: List[str],
    precedent_placeholders: List[str],
) -> str:
    front_matter_block = _render_lines(
        (f"- {line}" for line in precedent_front_matter),
        "- None",
    )

    lines = [
        f"Contract type: {contract_type_name}",
        f"Category: {category or 'unknown'}",
        f"Jurisdiction: {jurisdiction or 'unknown'}",
        "",
        "Template questions:",
        str(template_meta),
        "",
        "Structured answers (form + chat, with form taking precedence):",
        str(combined_answers),
        "",
        "Recent chat history (most recent turns):",
        chat_history or "- None",
        "",
        "Precedent title:",
        precedent_title or "None",
        "",
        "Precedent front matter (include after title, in order):",
        front_matter_block,
        "",
        "Precedent placeholders found:",
        str(precedent_placeholders or []),
    ]

    return "\n".join(lines).strip()


def _build_section_prompt(
    section_context: str,
    section: PrecedentSection,
) -> str:
    heading = section.heading or "Untitled section"
    body = section.body or "None"

    lines = [
        "Here is the structured context and the specific section to draft:",
        section_context.strip(),
        "",
        "Section to draft:",
        f"- Heading: {heading}",
        f"- Precedent body: {body}",
        "",
        "Draft only this section in plain text, following the system instructions.",
    ]

    return "\n".join(lines).strip()


def _progress_label(heading: str, index: int, total: int) -> str:
    return f"Drafting Section {index} ({index} of {total})"


def _draft_sections(
    *,
    draft_id: str,
    sections: List[PrecedentSection],
    section_context: str,
) -> Tuple[List[str], UsageTotals]:
    generated_sections: List[str] = []
    total_input_tokens = 0
    total_output_tokens = 0
    usage_model: Optional[str] = None

    total_sections = len(sections)
    for idx, section in enumerate(sections, start=1):
        update_progress(
            draft_id,
            idx - 1,
            total_sections,
            _progress_label(section.heading, idx, total_sections),
        )

        prompt = _build_section_prompt(section_context, section)
        section_text, usage = ml_service.call_llm_text_with_usage(
            messages=[{"role": "user", "content": prompt}],
            system=CONTRACT_SECTION_SYSTEM_PROMPT,
            max_tokens=1500,
            temperature=0.4,
        )

        total_input_tokens += usage.get("input_tokens") or 0
        total_output_tokens += usage.get("output_tokens") or 0
        usage_model = usage.get("model") or usage_model

        section_text = _ensure_section_heading(section_text, section.heading)
        if section_text:
            generated_sections.append(section_text)

        update_progress(
            draft_id,
            idx,
            total_sections,
            _progress_label(section.heading, idx, total_sections),
        )

    return generated_sections, UsageTotals(
        input_tokens=total_input_tokens,
        output_tokens=total_output_tokens,
        model=usage_model,
    )


def _stitch_contract(
    *,
    contract_title: str,
    front_matter: List[str],
    sections: List[str],
) -> str:
    parts: List[str] = []
    title = contract_title.strip()
    if title:
        parts.append(title)
    if front_matter:
        parts.extend(front_matter)
    parts.extend(sections)

    body = "\n\n".join(part for part in parts if part).strip()
    return f"{body}\n\n{CONTRACT_DISCLAIMER_TEXT}"


def _log_generation_cost(usage: UsageTotals, section_count: int) -> None:
    cost_usd = (
        usage.input_tokens / 1_000_000
    ) * CLAUDE_SONNET_4_5_INPUT_COST_PER_MILLION
    logger.info(
        "generate_contract: model=%s sections=%d input_tokens=%s output_tokens=%s cost_usd=%.6f",
        usage.model or ml_service.model,
        section_count,
        usage.input_tokens,
        usage.output_tokens,
        cost_usd,
    )


def answer_contract_chat(req: ContractChatRequest) -> ContractChatResponse:
    """
    Given contract context + chat history, produce the next assistant message.

    Implementation detail:
    - CONTRACT_CHAT_SYSTEM_PROMPT goes into Anthropic's top-level `system`.
    - All dynamic context (contract type, answers, clarifying questions, etc.)
      is sent as a *leading user message* so that `messages` is never empty.
    """
    clarifying = [
        item
        for item in (req.context.clarifying_questions or [])
        if not _contains_standard_clause_language(item)
    ]
    form_answers = req.context.form_answers or {}
    chat_answers = req.context.chat_answers or {}
    combined_answers = _merge_answers(form_answers, chat_answers)
    combined_answers, default_answers = _apply_standard_defaults(
        req.context.template_questions,
        combined_answers,
    )

    answered_lines, missing_required = _compute_answer_state(
        req.context.template_questions,
        combined_answers,
    )

    updated_chat_answers: Dict[str, Any] = dict(req.context.chat_answers)
    updated_chat_answers.update(default_answers)

    if not missing_required:
        summary_sent = bool(req.context.chat_answers.get(_READY_SUMMARY_FLAG))
        summary = None
        if not summary_sent:
            summary = _build_ready_summary(answered_lines)
            if summary:
                updated_chat_answers[_READY_SUMMARY_FLAG] = True
        assistant_message = (
            f"{summary}\n\n{_ready_to_generate_message()}"
            if summary
            else _ready_to_generate_message()
        )
        return ContractChatResponse(
            draft_id=req.draft_id,
            assistant_message=assistant_message,
            updated_chat_answers=updated_chat_answers,
        )

    context_blob = _build_chat_context_blob(
        contract_type_name=req.context.contract_type_name,
        category=req.context.category,
        jurisdiction=req.context.jurisdiction,
        clarifying_questions=clarifying,
        template_questions=req.context.template_questions,
        answered_lines=answered_lines,
        missing_required=missing_required,
    )

    leading_user_message = (
        context_blob
        + "\n\nNow, based on the missing or unclear details, ask me the next most important clarifying question."
    )

    anthropic_messages = _to_anthropic_messages(
        chat_messages=req.messages,
        leading_user_content=leading_user_message,
    )

    reply = ml_service.call_llm_text(
        messages=anthropic_messages,
        system=CONTRACT_CHAT_SYSTEM_PROMPT,
        max_tokens=800,
        temperature=0.5,
    )
    if _should_prepend_welcome(req.messages):
        reply = _prepend_welcome_if_missing(reply)

    return ContractChatResponse(
        draft_id=req.draft_id,
        assistant_message=reply,
        updated_chat_answers=updated_chat_answers,
    )


def generate_contract(req: GenerateContractRequest) -> GenerateContractResponse:
    """
    Generate the full contract text using context, answers, and chat history.
    """
    try:
        combined_answers = _merge_answers(
            req.context.form_answers,
            req.context.chat_answers,
        )
        combined_answers, _ = _apply_standard_defaults(
            req.context.template_questions,
            combined_answers,
        )
        template_meta = _build_template_meta(req.context.template_questions)
        chat_history = _format_chat_history(req.messages, max_turns=12)

        precedent_outline = _require_precedent_outline(
            req.context.contract_type_id,
            req.context.contract_type_name,
            req.precedent_outline,
        )

        logger.info(
            "generate_contract: start contract_type=%s sections=%d",
            req.context.contract_type_name,
            len(precedent_outline.sections),
        )

        section_context = _build_section_context_blob(
            contract_type_name=req.context.contract_type_name,
            category=req.context.category,
            jurisdiction=req.context.jurisdiction,
            template_meta=template_meta,
            combined_answers=combined_answers,
            chat_history=chat_history,
            precedent_title=precedent_outline.title,
            precedent_front_matter=precedent_outline.front_matter,
            precedent_placeholders=precedent_outline.placeholders,
        )

        init_progress(req.draft_id, len(precedent_outline.sections), "Starting generation")
        generated_sections, usage = _draft_sections(
            draft_id=req.draft_id,
            sections=precedent_outline.sections,
            section_context=section_context,
        )

        contract_title = (
            precedent_outline.title
            or req.context.contract_type_name
            or "Contract"
        ).strip().upper()
        contract_text = _stitch_contract(
            contract_title=contract_title,
            front_matter=precedent_outline.front_matter,
            sections=generated_sections,
        )

        _log_generation_cost(usage, len(generated_sections))
        complete_progress(req.draft_id, "Contract ready")

        return GenerateContractResponse(
            draft_id=req.draft_id,
            contract_text=contract_text,
            revision_notes=None,
        )
    except Exception as exc:
        fail_progress(req.draft_id, str(exc))
        raise
