from typing import Optional
from pydantic import BaseModel, EmailStr

class UserRegistrationRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    displayed_name: str
    age: int
    gender: str
    created_at: Optional[str] = None
