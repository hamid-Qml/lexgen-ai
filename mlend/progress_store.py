# progress_store.py
from threading import Lock
from typing import Dict, Any, Optional
import time

_LOCK = Lock()
_PROGRESS: Dict[str, Dict[str, Any]] = {}


def _now_ts() -> float:
    return time.time()


def _percent(completed: int, total: int) -> int:
    if total <= 0:
        return 0
    ratio = completed / total
    return max(0, min(100, round(ratio * 100)))


def init_progress(
    draft_id: str,
    total_sections: int,
    current_step: Optional[str] = None,
) -> None:
    with _LOCK:
        _PROGRESS[draft_id] = {
            "draft_id": draft_id,
            "status": "running",
            "percent": _percent(0, total_sections),
            "current_step": current_step,
            "completed_sections": 0,
            "total_sections": total_sections,
            "updated_at": _now_ts(),
            "error": None,
        }


def update_progress(
    draft_id: str,
    completed_sections: int,
    total_sections: Optional[int] = None,
    current_step: Optional[str] = None,
) -> None:
    with _LOCK:
        progress = _PROGRESS.get(draft_id) or {
            "draft_id": draft_id,
            "status": "running",
            "percent": 0,
            "current_step": None,
            "completed_sections": 0,
            "total_sections": total_sections or 0,
            "updated_at": _now_ts(),
            "error": None,
        }

        if total_sections is not None:
            progress["total_sections"] = total_sections

        progress["completed_sections"] = max(0, completed_sections)
        percent = _percent(
            progress["completed_sections"],
            progress.get("total_sections") or 0,
        )
        progress["percent"] = min(percent, 95)
        if current_step is not None:
            progress["current_step"] = current_step
        progress["status"] = "running"
        progress["updated_at"] = _now_ts()

        _PROGRESS[draft_id] = progress


def complete_progress(
    draft_id: str,
    current_step: Optional[str] = None,
) -> None:
    with _LOCK:
        progress = _PROGRESS.get(draft_id)
        if not progress:
            progress = {
                "draft_id": draft_id,
                "status": "completed",
                "percent": 100,
                "current_step": current_step,
                "completed_sections": 0,
                "total_sections": 0,
                "updated_at": _now_ts(),
                "error": None,
            }
        progress["status"] = "completed"
        progress["percent"] = 100
        if current_step is not None:
            progress["current_step"] = current_step
        progress["updated_at"] = _now_ts()
        progress["error"] = None
        _PROGRESS[draft_id] = progress


def fail_progress(draft_id: str, error: str) -> None:
    with _LOCK:
        progress = _PROGRESS.get(draft_id) or {"draft_id": draft_id}
        progress["status"] = "failed"
        progress["error"] = error
        progress["updated_at"] = _now_ts()
        _PROGRESS[draft_id] = progress


def get_progress(draft_id: str) -> Optional[Dict[str, Any]]:
    with _LOCK:
        progress = _PROGRESS.get(draft_id)
        if not progress:
            return None
        return dict(progress)
