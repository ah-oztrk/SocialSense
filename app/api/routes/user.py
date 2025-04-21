from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from bson import ObjectId
from app.db.database import user_collection
from app.models.user import UserResponse, UserUpdate
from app.core.auth import get_current_user

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    return {
        "id": current_user["id"],
        "username": current_user["username"],
        "email": current_user["email"],
        "name": current_user["name"],
        "age": current_user.get("age"),
        "gender": current_user.get("gender"),
        "created_at": current_user["created_at"]
    }


@router.put("/update", response_model=UserResponse)
async def update_user(
        user_update: UserUpdate,
        current_user: dict = Depends(get_current_user)
):
    """Update user information"""
    # Create an update dictionary with only the fields that are provided
    update_data = {k: v for k, v in user_update.dict().items() if v is not None}

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid update data provided"
        )

    # Check if username is being updated and is already taken
    if "username" in update_data:
        existing_user = await user_collection.find_one({"username": update_data["username"]})
        if existing_user and str(existing_user["_id"]) != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )

    # Check if email is being updated and is already taken
    if "email" in update_data:
        existing_user = await user_collection.find_one({"email": update_data["email"]})
        if existing_user and str(existing_user["_id"]) != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already taken"
            )

    # Update the user in the database
    result = await user_collection.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": update_data}
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user"
        )

    # Fetch the updated user
    updated_user = await user_collection.find_one({"_id": ObjectId(current_user["id"])})

    # Return the updated user information
    return {
        "id": str(updated_user["_id"]),
        "username": updated_user["username"],
        "email": updated_user["email"],
        "name": updated_user["name"],
        "age": updated_user.get("age"),
        "gender": updated_user.get("gender"),
        "created_at": updated_user["created_at"]
    }


@router.delete("/delete", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(current_user: dict = Depends(get_current_user)):
    """Delete current user account"""
    result = await user_collection.delete_one({"_id": ObjectId(current_user["id"])})

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete user"
        )

    return None