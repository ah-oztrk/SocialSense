from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import os
from bson import ObjectId

from app.models.user import TokenData

# Security configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-for-jwt-should-be-kept-secure")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme for token handling
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def verify_password(plain_password, hashed_password):
    """Verify if a plain password matches the hashed password"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    """Hash a password"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token"""
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    expires_at = int(expire.timestamp())

    return encoded_jwt, expires_at


async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Dependency to get the current user from the token"""
    from app.db.database import user_collection

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenData(user_id=user_id)
    except JWTError:
        raise credentials_exception

    user = await user_collection.find_one({"_id": ObjectId(token_data.user_id)})
    if user is None:
        raise credentials_exception

    # Convert ObjectId to string
    user["id"] = str(user["_id"])
    del user["_id"]

    return user