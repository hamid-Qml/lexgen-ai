# api.py
from fastapi import APIRouter, HTTPException
from starlette.concurrency import run_in_threadpool
from base_models import (
    ContractChatRequest,
    ContractChatResponse,
    GenerateContractRequest,
    GenerateContractResponse,
)
from orchestrator import answer_contract_chat, generate_contract
from progress_store import get_progress

router = APIRouter()


@router.get("/health")
async def health_check():
    return {"status": "ok", "message": "Lexy mlend is alive"}


@router.post("/contract/chat", response_model=ContractChatResponse)
async def contract_chat(req: ContractChatRequest):
    try:
        return await run_in_threadpool(answer_contract_chat, req)
    except Exception as e:
        # You can use your logger here
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/contract/generate", response_model=GenerateContractResponse)
async def contract_generate(req: GenerateContractRequest):
    try:
        return await run_in_threadpool(generate_contract, req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/contract/progress/{draft_id}")
async def contract_progress(draft_id: str):
    progress = get_progress(draft_id)
    if not progress:
        return {
            "draft_id": draft_id,
            "status": "idle",
            "percent": 0,
            "current_step": None,
            "completed_sections": 0,
            "total_sections": 0,
            "updated_at": None,
            "error": None,
        }
    return progress
