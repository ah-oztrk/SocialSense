# === api/routes/history.py ===
from fastapi import APIRouter, HTTPException, FastAPI, Depends
from app.db.database import history_collection
from app.schemas.history import HistoryCreate, HistoryResponse, HistoryUpdate
from typing import List
from bson import ObjectId
from fastapi import Body
from app.core.auth import get_current_user
from datetime import datetime
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/history/", response_model=HistoryResponse)
async def create_history(
        entry: HistoryCreate,
        current_user: dict = Depends(get_current_user)
):
    # Generate a unique history_id if not provided
    history_id = entry.history_id or f"hist_{current_user['id']}_{int(datetime.now().timestamp())}"
    logger.info("Generated history_id: %s", history_id)

    new_entry = {
        "user_id": current_user["id"],
        "query_set": [],
        "query_number": 0,
        #"assistant_name": entry.assistant_name,
        "history_id": history_id
    }
    res = await history_collection.insert_one(new_entry)
    new_entry["_id"] = res.inserted_id
    return {**new_entry, "id": str(new_entry["_id"])}


@router.get("/history/user/", response_model=List[HistoryResponse])
async def get_user_histories(
        user_id: str,
        current_user: dict = Depends(get_current_user)
):

    docs = await history_collection.find({"user_id": current_user["id"]}).to_list(100)
    for doc in docs:
        doc["id"] = str(doc["_id"])
    return docs


@router.get("/history/{history_id}", response_model=HistoryResponse)
async def get_history(
        history_id: str,
        current_user: dict = Depends(get_current_user)
):
    doc = await history_collection.find_one({"history_id": history_id})
    if not doc:
        raise HTTPException(status_code=404, detail="History not found")

    # Ensure users can only access their own history
    if doc["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to access this history")

    doc["id"] = str(doc["_id"])
    return doc


@router.put("/history/{history_id}/add-query")
async def add_query_to_history(
        history_id: str,
        update: HistoryUpdate,
        current_user: dict = Depends(get_current_user)
):
    # First check if the history belongs to the current user
    history = await history_collection.find_one({"history_id": history_id})
    if not history:
        raise HTTPException(status_code=404, detail="History not found")

    if history["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to update this history")

    update_result = await history_collection.update_one(
        {"history_id": history_id},
        {"$push": {"query_set": update.query_id}, "$inc": {"query_number": 1}}
    )

    if update_result.modified_count == 0:
        raise HTTPException(status_code=500, detail="Failed to update history")

    return {"message": "Query added"}


@router.put("/history/{history_id}/remove-query")
async def remove_query_from_history(
        history_id: str,
        query_id: str = Body(..., embed=True),
        current_user: dict = Depends(get_current_user)
):
    # First check if the history belongs to the current user
    history = await history_collection.find_one({"history_id": history_id})
    if not history:
        raise HTTPException(status_code=404, detail="History not found")

    if history["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to update this history")

    update_result = await history_collection.update_one(
        {"history_id": history_id, "query_set": query_id},
        {
            "$pull": {"query_set": query_id},
            "$inc": {"query_number": -1}
        }
    )

    if update_result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Query not found in history or history ID invalid")

    return {"message": f"Query '{query_id}' removed from history '{history_id}'"}


@router.delete("/history/{history_id}")
async def delete_history(
        history_id: str,
        current_user: dict = Depends(get_current_user)
):
    # First check if the history belongs to the current user
    history = await history_collection.find_one({"history_id": history_id})
    if not history:
        raise HTTPException(status_code=404, detail="History not found")

    if history["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this history")

    result = await history_collection.delete_one({"history_id": history_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=500, detail="Failed to delete history")

    return {"message": "Deleted"}