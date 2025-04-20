# === schemas/forum.py ===
from pydantic import BaseModel
from datetime import datetime

class ForumQuestionCreate(BaseModel):
    question_id: str
    user_id: str
    question_header: str
    question: str
    creation_date: str

class ForumAnswerCreate(BaseModel):
    answer_id: str
    question_id: str
    user_id: str
    answer: str
    creation_date: str
