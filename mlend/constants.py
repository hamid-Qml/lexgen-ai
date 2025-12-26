# constants.py
import os
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# Sonnet is mid-tier; Haiku is cheaper. Pick one.
DEFAULT_ANTHROPIC_MODEL = os.getenv(
    "ANTHROPIC_MODEL",
    "claude-sonnet-4-5"  # or "claude-3-haiku-20240307"
)

CLAUDE_SONNET_4_5_INPUT_COST_PER_MILLION = 3.0
