# === api/routes/history.py ===
from fastapi import APIRouter, HTTPException, FastAPI
from app.db.database import history_collection
from app.schemas.history import HistoryCreate, HistoryResponse, HistoryUpdate
from typing import List
from bson import ObjectId
from fastapi import Body


router = APIRouter()

@router.post("/history/", response_model=HistoryResponse)
async def create_history(entry: HistoryCreate):
    new_entry = {
        "user_id": entry.user_id,
        "query_set": [],
        "query_number": 0,
        "history_id": entry.history_id,
        "assistant_name": entry.assistant_name
    }
    res = await history_collection.insert_one(new_entry)
    new_entry["_id"] = res.inserted_id
    return {**new_entry, "id": str(new_entry["_id"])}

@router.get("/history/user/{user_id}", response_model=List[HistoryResponse])
async def get_user_histories(user_id: str):
    docs = await history_collection.find({"user_id": user_id}).to_list(100)
    for doc in docs:
        doc["id"] = str(doc["_id"])
    return docs

@router.get("/history/{history_id}", response_model=HistoryResponse)
async def get_history(history_id: str):
    doc = await history_collection.find_one({"history_id": history_id})
    if not doc:
        raise HTTPException(status_code=404, detail="History not found")
    doc["id"] = str(doc["_id"])
    return doc

@router.put("/history/{history_id}/add-query")
async def add_query_to_history(history_id: str, update: HistoryUpdate):
    update_result = await history_collection.update_one(
        {"history_id": history_id},
        {"$push": {"query_set": update.query_id}, "$inc": {"query_number": 1}}
    )
    if update_result.modified_count == 0:
        raise HTTPException(status_code=404, detail="History not found")
    return {"message": "Query added"}

@router.put("/history/{history_id}/remove-query")
async def remove_query_from_history(history_id: str, query_id: str = Body(..., embed=True)):
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
async def delete_history(history_id: str):
    result = await history_collection.delete_one({"history_id": history_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="History not found")
    return {"message": "Deleted"}