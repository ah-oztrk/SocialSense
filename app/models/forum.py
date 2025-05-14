# === models/forum.py ===
from pydantic import BaseModel, Field
from bson import ObjectId
from typing import Optional
from datetime import datetime


class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)


class ForumQuestion(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    question_id: str
    user_id: str
    question_header: str
    question: str
    creation_date: str

    class Config:
        json_encoders = {ObjectId: str}
        allow_population_by_field_name = True
        schema_extra = {
            "example": {
                "_id": "60d21b4667d0d63dc98fc3c3",
                "question_id": "q123",
                "user_id": "60d21b4667d0d63dc98fc3aa",
                "question_header": "How to interpret non-verbal cues?",
                "question": "I struggle with understanding non-verbal communication. Can anyone share tips on how to recognize and interpret common social cues?",
                "creation_date": "2025-05-14T12:34:56.789Z"
            }
        }


class ForumAnswer(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    answer_id: str
    question_id: str
    user_id: str
    answer: str
    creation_date: str

    class Config:
        json_encoders = {ObjectId: str}
        allow_population_by_field_name = True
        schema_extra = {
            "example": {
                "_id": "60d21b4667d0d63dc98fc3c4",
                "answer_id": "a456",
                "question_id": "q123",
                "user_id": "60d21b4667d0d63dc98fc3bb",
                "answer": "One effective strategy is to focus on facial expressions...",
                "creation_date": "2025-05-14T12:45:56.789Z"
            }
        }