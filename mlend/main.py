# main.py
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import router as api_router
from precedent_repo import configure_precedent_lookup
from precedent_db import get_precedent_outline_from_db

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Lexy mlend", version="0.1.0")

# DB-backed precedent lookup
configure_precedent_lookup(get_precedent_outline_from_db)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")
