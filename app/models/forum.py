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
