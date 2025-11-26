# Lexy mlend — AI Layer for Contract Generation

This service is the AI backend for the Lexy contract generation platform.

It is a small FastAPI app that talks to Anthropic models (via the Instructor library for structured outputs) and exposes endpoints for:

- Contract Q&A chat (helping fill in details)
- Full contract generation based on the contract type, form answers, and chat history

The NestJS backend will call this service and store all inputs/outputs against each `ContractDraft`.

---

## 1. Tech Stack

- Python
- FastAPI
- Anthropic API (e.g. Claude 3.5 Sonnet or Claude 3 Haiku)
- Instructor (for structured JSON outputs using Pydantic)
- Pydantic v2
- httpx
- python-dotenv
- Simple rotating file logger

---

## 2. Project Structure

- `main.py`  
  FastAPI app bootstrap, includes the router and CORS config.

- `api.py`  
  Defines HTTP endpoints:
  - `GET /api/health` – health check
  - `POST /api/contract/chat` – returns the assistant’s next message for the Q&A flow.
  - `POST /api/contract/generate` – generates the full contract text.

- `orchestrator.py`  
  High-level orchestration logic:
  - `answer_contract_chat` – uses prompts + Anthropic to respond to user messages.
  - `generate_contract` – uses context (contract type, answers, history) to produce contract text.

- `ml_service.py`  
  Wraps Anthropic + Instructor:
  - `call_llm_text` for plain-text responses.
  - `call_llm_structured` for Pydantic-validated JSON responses.

- `base_models.py`  
  Pydantic models for request/response payloads exchanged with NestJS:
  - `ChatMessage`
  - `ContractQuestion`
  - `ContractContext` (contract type + template questions + answers)
  - `ContractChatRequest` / `ContractChatResponse`
  - `GenerateContractRequest` / `GenerateContractResponse`

- `prompts.py`  
  System prompts:
  - `CONTRACT_CHAT_SYSTEM_PROMPT` – governs Q&A behavior.
  - `CONTRACT_GENERATION_SYSTEM_PROMPT` – governs full contract drafting behavior.

- `logger.py`  
  Shared logger with rotating file handler and optional colorized console logs.

- `constants.py`  
  Basic configuration such as:
  - `ANTHROPIC_API_KEY`
  - `DEFAULT_ANTHROPIC_MODEL`

---

## 3. Contract Context Shape

The NestJS backend calls this service with a `ContractContext` that separates:

- **Template questions** (from the contract catalog)  
  `template_questions: List[ContractQuestion]`

- **Form answers** (explicit inputs from the UI form)  
  `form_answers: Dict[str, Any]`

- **Chat answers** (information inferred or clarified via the chat)  
  `chat_answers: Dict[str, Any]`

This lets us reason about:
- What the canonical questions are,
- What the user has explicitly filled in the UI,
- What has been inferred via conversation.

When generating the contract, the orchestrator can merge these into a single combined context.

---

## 4. API Contracts

### 4.1 `POST /api/contract/chat`

Used when the user sends a new message in the Q&A/chat panel.

**Request (JSON)**

- `draft_id: string`  
- `context: ContractContext`  
- `messages: ChatMessage[]` (full conversation history for this draft)

**Response (JSON)**

- `draft_id: string`  
- `assistant_message: string` – the new assistant message to append to the chat.  
- `updated_chat_answers: { [key: string]: any }` – optional; future use for structured extraction of answers from this turn.

The NestJS backend should:
1. Store the user message in `chat_messages`.
2. Call this endpoint.
3. Store the `assistant_message` as another `chat_message`.
4. Optionally merge `updated_chat_answers` into the draft’s `chat_answers` column.

---

### 4.2 `POST /api/contract/generate`

Called when the user clicks “Generate Contract”.

**Request (JSON)**

- `draft_id: string`  
- `context: ContractContext` – includes template questions, form answers, chat answers.  
- `messages: ChatMessage[]` – full conversation history.  
- `precedent_snippets?: string[]` – optional, for future RAG integration.

**Response (JSON)**

- `draft_id: string`  
- `contract_text: string` – the full generated contract.  
- `revision_notes?: string` – reserved for a future self-critique pass.

The NestJS backend should:
1. Call this endpoint.
2. Store `contract_text` in `ContractDraft.ai_draft_text`.
3. Update status to `ready_for_review`.

---

## 5. Anthropic + Instructor Integration

The service uses:

- `anthropic.Anthropic` as the base client (configured with `ANTHROPIC_API_KEY`).
- `instructor.from_anthropic(...)` to wrap the client and allow `response_model=` requests.

For now:
- `/contract/chat` uses plain text responses.
- `/contract/generate` uses plain text responses for the full contract text.

Later, we can:
- Add structured models for extracted answers (per contract type).
- Add a second structured model for “clause-by-clause” outputs if needed.

---

## 6. Environment Variables

Create a `.env` file with at least:

- `ANTHROPIC_API_KEY=your_key_here`  
- `ANTHROPIC_MODEL=claude-3-5-sonnet-20241022` (or `claude-3-haiku-20240307`)  
- `LOG_LEVEL=INFO`  
- `LOG_FILE=logs/lexy-mlend.log`  

---

## 7. Installation & Running

1. Create and activate a virtualenv.
2. Install dependencies:

   `pip install -r requirements.txt`

3. Run the server:

   `uvicorn main:app --host 0.0.0.0 --port 5000 --reload`

4. The health check should be available at:

   `GET http://localhost:5000/api/health`

---

## 8. Next Steps

- Add structured extraction models with Instructor to populate `chat_answers`.
- Add a second Anthropic call for self-critique and `revision_notes`.
- Integrate basic RAG by passing precedent snippets from the NestJS side.
- Harden logging, error handling, and retry logic.
