# === schemas/forum.py ===
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class ForumQuestionCreate(BaseModel):
    question_id: str
    question_header: str
    question: str

    class Config:
        schema_extra = {
            "example": {
                "question_id": "q123",
                "question_header": "How to interpret non-verbal cues?",
                "question": "I struggle with understanding non-verbal communication. Can anyone share tips on how to recognize and interpret common social cues?"
            }
        }


class ForumQuestionResponse(BaseModel):
    id: str
    question_id: str
    user_id: str
    question_header: str
    question: str
    creation_date: str

    class Config:
        schema_extra = {
            "example": {
                "id": "60d21b4667d0d63dc98fc3c3",
                "question_id": "q123",
                "user_id": "60d21b4667d0d63dc98fc3aa",
                "question_header": "How to interpret non-verbal cues?",
                "question": "I struggle with understanding non-verbal communication. Can anyone share tips on how to recognize and interpret common social cues?",
                "creation_date": "2025-05-14T12:34:56.789Z"
            }
        }


class ForumAnswerCreate(BaseModel):
    answer_id: str
    question_id: str
    answer: str

    class Config:
        schema_extra = {
            "example": {
                "answer_id": "a456",
                "question_id": "q123",
                "answer": "One effective strategy is to focus on facial expressions. Start by learning to recognize basic emotions like happiness, sadness, anger, surprise, fear and disgust through facial expressions."
            }
        }


class ForumAnswerResponse(BaseModel):
    id: str
    answer_id: str
    question_id: str
    user_id: str
    answer: str
    creation_date: str

    class Config:
        schema_extra = {
            "example": {
                "id": "60d21b4667d0d63dc98fc3c4",
                "answer_id": "a456",
                "question_id": "q123",
                "user_id": "60d21b4667d0d63dc98fc3bb",
                "answer": "One effective strategy is to focus on facial expressions. Start by learning to recognize basic emotions like happiness, sadness, anger, surprise, fear and disgust through facial expressions.",
                "creation_date": "2025-05-14T12:45:56.789Z"
            }
        }