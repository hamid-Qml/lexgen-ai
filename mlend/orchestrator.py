# orchestrator.py
from typing import List, Dict, Any
from base_models import (
    ContractChatRequest,
    ContractChatResponse,
    GenerateContractRequest,
    GenerateContractResponse,
    ChatMessage,
)
from ml_service import MLService
from prompts import (
    CONTRACT_CHAT_SYSTEM_PROMPT,
    CONTRACT_GENERATION_SYSTEM_PROMPT,
)
from logger import get_logger

logger = get_logger(__name__)
ml_service = MLService()


def _to_anthropic_messages(
    chat_messages: List[ChatMessage],
    leading_user_content: str | None = None,
) -> List[Dict[str, str]]:
    """
    Convert our ChatMessage list into Anthropic's format.

    - Anthropic only accepts "user" and "assistant" roles in `messages`.
    - We optionally inject a leading user message that contains the
      synthesized context (contract type, answers, etc.).
    """
    messages: List[Dict[str, str]] = []

    # First synthetic user message with context, if provided
    if leading_user_content:
        messages.append({"role": "user", "content": leading_user_content})

    # Then the historical conversation
    for m in chat_messages:
        role = m.role
        if role not in ("user", "assistant"):
            # Treat anything else (e.g. "system") as a user-style message
            role = "user"
        messages.append({"role": role, "content": m.content})

    return messages


def answer_contract_chat(req: ContractChatRequest) -> ContractChatResponse:
    """
    Given contract context + chat history, produce the next assistant message.

    Implementation detail:
    - CONTRACT_CHAT_SYSTEM_PROMPT goes into Anthropic's top-level `system`.
    - All dynamic context (contract type, answers, clarifying questions, etc.)
      is sent as a *leading user message* so that `messages` is never empty.
    """
    clarifying = req.context.clarifying_questions or []
    form_answers = req.context.form_answers or {}
    chat_answers = req.context.chat_answers or {}
    combined_answers = {**chat_answers, **form_answers}

    answered_lines = []
    missing_required = []

    for question in req.context.template_questions:
        key = question.key
        value = combined_answers.get(key)
        if value is None or (isinstance(value, str) and not value.strip()):
            if question.required:
                missing_required.append(f"- {question.label} ({key})")
            continue

        if isinstance(value, list):
            normalized_value = ", ".join(str(v).strip() for v in value if str(v).strip())
        else:
            normalized_value = str(value).strip()

        if normalized_value:
            answered_lines.append(f"- {question.label}: {normalized_value}")
        elif question.required:
            missing_required.append(f"- {question.label} ({key})")

    answered_section = (
        "\n".join(answered_lines) if answered_lines else "- None yet"
    )
    missing_section = (
        "\n".join(missing_required)
        if missing_required
        else "- None – feel free to double-check key clauses."
    )

    context_blob = f"""
You are assisting with this contract:

- Contract type: {req.context.contract_type_name}
- Category: {req.context.category or "unknown"}
- Jurisdiction: {req.context.jurisdiction or "unknown"}

Clarifying questions you should aim to cover (adapt wording/order as needed):
{clarifying}

Template questions (keys only):
{[q.key for q in req.context.template_questions]}

Details already collected (do NOT ask these again):
{answered_section}

Outstanding required details that still need confirmation:
{missing_section}

Remember:
- Ask ONE clear, specific question at a time.
- Prioritise clarifying questions that have not been covered yet.
- Do NOT draft the full contract text here.
- Keep messages short, conversational, and in plain text (no markdown).
- When the user says they are done or do not want to provide more info, confirm their intent and explain which details remain missing and how the contract will handle them (e.g. placeholders or assumptions).
"""

    leading_user_message = (
        context_blob.strip()
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

    updated_chat_answers: Dict[str, Any] = dict(req.context.chat_answers)

    return ContractChatResponse(
        draft_id=req.draft_id,
        assistant_message=reply,
        updated_chat_answers=updated_chat_answers,
    )

def generate_contract(req: GenerateContractRequest) -> GenerateContractResponse:
    """
    Generate the full contract text using context, answers, and chat history.
    """

    # chat_answers (inferred) + form_answers (explicit, overrides)
    combined_answers: Dict[str, Any] = {
        **req.context.chat_answers,
        **req.context.form_answers,
    }

    # Build template question metadata first (avoids weird f-string/set issues)
    template_meta = [
        {"key": q.key, "label": q.label}
        for q in req.context.template_questions
    ]

    context_blob = f"""
Contract type: {req.context.contract_type_name}
Category: {req.context.category or "unknown"}
Jurisdiction: {req.context.jurisdiction or "unknown"}

Template questions:
{template_meta}

Structured answers (form + chat, with form taking precedence):
{combined_answers}

Precedent snippets (if any):
{req.precedent_snippets or []}
"""

    # Leading user message that explicitly instructs the model to draft the contract
    leading_user_message = (
        "Here is the structured context and answers for drafting the contract:\n"
        f"{context_blob.strip()}\n\n"
        "Now draft the full contract in plain text (no markdown), following the system instructions."
    )

    # 🔴 IMPORTANT: for generation, send a *single* user message so the last turn is user
    anthropic_messages = [
        {"role": "user", "content": leading_user_message}
    ]

    logger.info(
        "generate_contract: combined_answers keys=%s",
        list(combined_answers.keys()),
    )
    logger.info(
        "generate_contract: template count=%d",
        len(req.context.template_questions),
    )

    contract_text = ml_service.call_llm_text(
        messages=anthropic_messages,
        system=CONTRACT_GENERATION_SYSTEM_PROMPT,
        max_tokens=5000,
        temperature=0.4,
    )

    print("CONTRACT TEXT: ", contract_text)

    return GenerateContractResponse(
        draft_id=req.draft_id,
        contract_text=contract_text,
        revision_notes=None,
    )
