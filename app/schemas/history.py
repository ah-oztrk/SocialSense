# === schemas/history.py ===
from pydantic import BaseModel
from typing import List, Optional

class HistoryCreate(BaseModel):
    #user_id: str
    history_id: Optional[str] = None

class HistoryUpdate(BaseModel):
    query_id: str  # used to append to query_set

class HistoryResponse(BaseModel):
    id: str
    user_id: str
    query_set: List[str]
    query_number: int
    history_id: str