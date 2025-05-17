from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime, timedelta
from bson import ObjectId
import secrets
import string
from typing import Dict

from app.db.database import user_collection, history_collection
from app.models.user import UserCreate, UserInDB, UserResponse, Token, PasswordReset, PasswordChange
from app.core.auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user: UserCreate):
    """Register a new user"""
    # Check if username already exists
    existing_user = await user_collection.find_one({"username": user.username})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )

    # Check if email already exists
    existing_user = await user_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Hash the password
    hashed_password = get_password_hash(user.password)

    # Create user in DB
    new_user = {
        "username": user.username,
        "email": user.email,
        "name": user.name,
        "hashed_password": hashed_password,
        "created_at": datetime.utcnow()
    }

    # Add optional fields if they exist
    if user.age is not None:
        new_user["age"] = user.age
    if user.gender is not None:
        new_user["gender"] = user.gender

    result = await user_collection.insert_one(new_user)

    created_user = await user_collection.find_one({"_id": result.inserted_id})

    # Generate a unique history_id if not provided
    history_id = f"hist_{str(created_user["_id"])}_{int(datetime.now().timestamp())}"


    new_entry = {
        "user_id": str(created_user["_id"]),
        "query_set": [],
        "query_number": 0,
        "history_id": history_id
    }
    res = await history_collection.insert_one(new_entry)

    return {
        "id": str(created_user["_id"]),
        "username": created_user["username"],
        "email": created_user["email"],
        "name": created_user["name"],
        "age": created_user.get("age"),
        "gender": created_user.get("gender"),
        "created_at": created_user["created_at"]
    }


@router.post("/login", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login endpoint to get access token"""
    # Find user by username
    user = await user_collection.find_one({"username": form_data.username})

    # If user not found or password doesn't match
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create access token with user ID as subject
    access_token, expires_at = create_access_token(
        data={"sub": str(user["_id"])},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_at": expires_at
    }


@router.post("/refresh-token", response_model=Token)
async def refresh_access_token(current_user: dict = Depends(get_current_user)):
    """Refresh access token"""
    access_token, expires_at = create_access_token(
        data={"sub": current_user["id"]},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_at": expires_at
    }


@router.post("/change-password", status_code=status.HTTP_200_OK)
async def change_password(
        password_data: PasswordChange,
        current_user: dict = Depends(get_current_user)
):
    """Change user password"""
    # Verify current password
    if not verify_password(password_data.current_password, current_user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    # Hash new password
    hashed_password = get_password_hash(password_data.new_password)

    # Update password in database
    result = await user_collection.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"hashed_password": hashed_password}}
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update password"
        )

    return {"message": "Password updated successfully"}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(reset_data: PasswordReset):
    """Request password reset (in a real application, this would send an email)"""
    user = await user_collection.find_one({"email": reset_data.email})

    if not user:
        # Don't reveal that the email doesn't exist
        return {"message": "If your email is registered, you will receive a reset link"}

    # Generate a random reset token
    # In a real application, you would store this token and send it via email
    reset_token = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))

    # Store the reset token with an expiration time
    await user_collection.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "reset_token": reset_token,
                "reset_token_expires": datetime.utcnow() + timedelta(hours=1)
            }
        }
    )

    # In a real application, send email with reset link
    # Here we just return a message
    return {"message": "If your email is registered, you will receive a reset link"}


@router.get("/verify-token", response_model=Dict[str, bool])
async def verify_token(current_user: dict = Depends(get_current_user)):
    """Verify if a token is valid"""
    return {"valid": True}

@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Logout endpoint - this is stateless since we're using JWT,
    but we can use this endpoint for client-side logout actions"""
    return {"message": "Successfully logged out"}