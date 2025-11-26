# ml_service.py
import logging
from typing import List, Dict, Any, Type, TypeVar, Optional

import anthropic
import instructor
from pydantic import BaseModel

from constants import ANTHROPIC_API_KEY, DEFAULT_ANTHROPIC_MODEL

logger = logging.getLogger(__name__)
T = TypeVar("T", bound=BaseModel)


class MLService:
    """
    Thin wrapper around Anthropic + Instructor.

    - Plain text outputs: use `call_llm_text` (raw Anthropic client).
    - Structured outputs: use `call_llm_structured` (Instructor-wrapped client).
    """

    def __init__(self, model_name: str = DEFAULT_ANTHROPIC_MODEL):
        if not ANTHROPIC_API_KEY:
            raise ValueError("ANTHROPIC_API_KEY is not set.")

        # Raw Anthropic client for normal text responses
        self.raw_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

        # Instructor-wrapped client ONLY for structured responses
        self.instructor_client = instructor.from_anthropic(self.raw_client)

        self.model = model_name

    def _build_messages(self, messages: List[Dict[str, str]]) -> List[Dict[str, Any]]:
        """
        Pass-through helper.

        We expect callers to pass Anthropic-style messages:
          [{"role": "user"|"assistant", "content": "..."}]

        NOTE: system messages must NOT be passed here; they belong
        in the top-level `system` parameter of the API call.
        """
        return messages

    def call_llm_text(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        max_tokens: int = 2000,
        temperature: float = 0.4,
        system: Optional[str] = None,
    ) -> str:
        """
        Plain text generation using the raw Anthropic client.
        """
        m = self._build_messages(messages)

        logger.debug(
            "call_llm_text: %s",
            {
                "model": model or self.model,
                "num_messages": len(m),
                "has_system": bool(system),
            },
        )

        resp = self.raw_client.messages.create(
            model=model or self.model,
            max_tokens=max_tokens,
            temperature=temperature,
            messages=m,
            **({"system": system} if system else {}),
        )

        print("response: ",resp)

        # Anthropic: resp.content is a list of content blocks; we keep text blocks
        text_chunks = [
            b.text for b in resp.content if getattr(b, "type", None) == "text"
        ]
        text = "".join(text_chunks).strip()
        logger.debug("call_llm_text: got %d chars", len(text))
        return text

    def call_llm_structured(
        self,
        *,
        response_model: Type[T],
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        max_tokens: int = 4000,
        temperature: float = 0.4,
        system: Optional[str] = None,
    ) -> T:
        """
        Structured output via Instructor (Pydantic response_model).
        """
        m = self._build_messages(messages)

        logger.debug(
            "call_llm_structured: %s",
            {
                "model": model or self.model,
                "num_messages": len(m),
                "response_model": response_model.__name__,
                "has_system": bool(system),
            },
        )

        result: T = self.instructor_client.messages.create(
            model=model or self.model,
            max_tokens=max_tokens,
            temperature=temperature,
            messages=m,
            **({"system": system} if system else {}),
            response_model=response_model,
        )
        return result
