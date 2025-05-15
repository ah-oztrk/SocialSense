# === schemas/forum.py ===
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ForumQuestionCreate(BaseModel):
    question_id: Optional[str] = None
    question_header: str
    question: str

class ForumAnswerCreate(BaseModel):
    answer_id: Optional[str] = None
    question_id: str
    answer: str

class ForumQuestionResponse(BaseModel):
    id: str
    question_id: str
    user_id: str
    username: Optional[str] = None
    question_header: str
    question: str
    creation_date: str

class ForumAnswerResponse(BaseModel):
    id: str
    answer_id: str
    question_id: str
    user_id: str
    username: Optional[str] = None
    answer: str
    creation_date: str

# Keep these for compatibility if needed
class ForumReplyCreate(BaseModel):
    content: str
    author: str

class ForumReply(ForumReplyCreate):
    id: str
    timestamp: str

class ForumQuestion(ForumQuestionCreate):
    id: str
    timestamp: str
    replies: List[ForumReply] = []

    class Config:
        from_attributes = True
