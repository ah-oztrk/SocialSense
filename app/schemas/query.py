from pydantic import BaseModel
from typing import Optional, List

class QueryCreate(BaseModel):
    query_id: Optional[str] = None  # Made optional, will be generated if not provided
    query: str
    history_id: str
    model_name: str  # Added model_name to schema for validation

class QueryResponse(BaseModel):
    id: str
    query_id: str
    user_id: str
    query: str
    response: str
    creation_date: str
    history_id: str
    user_rating: Optional[float] = None
    user_feedback: Optional[str] = None

    class Config:
        from_attributes = True

class QueryUpdate(BaseModel):
    response: Optional[str] = None
    user_rating: Optional[float] = None
    user_feedback: Optional[str] = None