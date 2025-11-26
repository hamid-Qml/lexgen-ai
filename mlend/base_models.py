# base_models.py
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class ContractQuestion(BaseModel):
    key: str
    label: str
    description: Optional[str] = None
    required: bool = True


class ContractContext(BaseModel):
    contract_type_id: str
    contract_type_name: str
    category: Optional[str] = None
    jurisdiction: Optional[str] = None
    template_questions: List[ContractQuestion]
    form_answers: Dict[str, Any]
    chat_answers: Dict[str, Any]
    clarifying_questions: List[str] = [] 

class ContractChatRequest(BaseModel):
    draft_id: str
    context: ContractContext
    messages: List[ChatMessage]


class ContractChatResponse(BaseModel):
    draft_id: str
    assistant_message: str
    # Optional: future structured extraction of answers from this turn
    updated_chat_answers: Dict[str, Any] = Field(default_factory=dict)


class GenerateContractRequest(BaseModel):
    draft_id: str
    context: ContractContext
    messages: List[ChatMessage]
    # You can add precedent snippets later
    precedent_snippets: Optional[List[str]] = None


class GenerateContractResponse(BaseModel):
    draft_id: str
    contract_text: str
    revision_notes: Optional[str] = None
