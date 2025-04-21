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

class Query(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    query_id: str
    user_id: str
    query: str
    response: str
    user_rating: Optional[float] = None
    user_feedback: Optional[str] = None
    creation_date: str
    history_id: str

    class Config:
        json_encoders = {ObjectId: str}
        allow_population_by_field_name = True