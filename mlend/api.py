# api.py
from fastapi import APIRouter, HTTPException
from base_models import (
    ContractChatRequest,
    ContractChatResponse,
    GenerateContractRequest,
    GenerateContractResponse,
)
from orchestrator import answer_contract_chat, generate_contract

router = APIRouter()


@router.get("/health")
async def health_check():
    return {"status": "ok", "message": "Lexy mlend is alive"}


@router.post("/contract/chat", response_model=ContractChatResponse)
async def contract_chat(req: ContractChatRequest):
    try:
        return answer_contract_chat(req)
    except Exception as e:
        # You can use your logger here
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/contract/generate", response_model=GenerateContractResponse)
async def contract_generate(req: GenerateContractRequest):
    try:
        return generate_contract(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
