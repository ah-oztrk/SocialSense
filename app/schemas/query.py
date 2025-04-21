from pydantic import BaseModel
from typing import Optional, List

class QueryCreate(BaseModel):
    query_id: str
    user_id: str
    query: str
    response: str
    creation_date: str
    history_id: str

class QueryResponse(BaseModel):
    id: str
    query_id: str
    user_id: str
    query: str
    response: str
    creation_date: str
    history_id: str
    user_rating: Optional[float] = None  # Make optional with default None
    user_feedback: Optional[str] = None  # Make optional with default None

    class Config:
        from_attributes = True

class QueryUpdate(BaseModel):
    response: Optional[str] = None
    user_rating: Optional[float] = None
    user_feedback: Optional[str] = None