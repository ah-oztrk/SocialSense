from fastapi import APIRouter, HTTPException, Body, Depends
from app.db.database import query_collection, history_collection
from app.schemas.query import QueryCreate, QueryResponse, QueryUpdate
from app.schemas.history import HistoryUpdate
from app.core.auth import get_current_user
from datetime import datetime
import ollama
from typing import List
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/", response_model=QueryResponse)
async def create_query(
        query_data: QueryCreate,
        current_user: dict = Depends(get_current_user)
):
    logger.info("Received query request from user %s: %s", current_user["id"], query_data.dict())

    # Extract user_id from token
    user_id = current_user["id"]

    # Extract fields from the request body
    query = query_data.query
    history_id = query_data.history_id
    model_name = query_data.model_name

    # Validate model name
    valid_models = ["emotiondetection", "textSimplification", "socialNorm"]
    if model_name not in valid_models:
        raise HTTPException(status_code=400,
                            detail="Invalid model name. Choose from: emotiondetection, textSimplification, socialNorm")

    # Generate a unique query_id
    query_id = query_data.query_id or f"qry_{user_id}_{int(datetime.now().timestamp())}"
    logger.info("Generated query_id: %s", query_id)

    # Call the selected Ollama model to get the response
    logger.info("Calling Ollama model: %s", model_name)
    try:
        response = ollama.generate(model=model_name, prompt=query)
        logger.info("Full Ollama response: %s", response)
        response_text = response.get('response', '').strip()
        if not response_text:
            logger.warning("Ollama returned an empty response for model: %s", model_name)
            raise HTTPException(status_code=500, detail=f"Model {model_name} returned an empty response")
        logger.info("Ollama response text: %s", response_text)
    except Exception as e:
        logger.error("Ollama error: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Error processing query with model {model_name}: {str(e)}")

    # Prepare the query entry
    creation_date = datetime.now().isoformat()
    query_entry = {
        "query_id": query_id,
        "user_id": user_id,
        "query": query,
        "response": response_text,
        "creation_date": creation_date,
        "history_id": history_id
    }
    logger.info("Prepared query entry: %s", query_entry)

    # Insert into query collection
    logger.info("Inserting into query collection")
    res = await query_collection.insert_one(query_entry)
    created = await query_collection.find_one({"_id": res.inserted_id})
    logger.info("Inserted query, created: %s", created)

    if created and "_id" in created:
        created["id"] = str(created["_id"])
        del created["_id"]
    else:
        logger.error("Created document is invalid: %s", created)
        raise HTTPException(status_code=500, detail="Failed to retrieve inserted query")

    logger.info("Modified created document: %s", created)

    # Update the history collection with the new query_id
    logger.info("Updating history collection for history_id: %s", history_id)
    update_result = await history_collection.update_one(
        {"history_id": history_id},
        {"$push": {"query_set": query_id}, "$inc": {"query_number": 1}}
    )
    logger.info("History update result: modified_count=%d", update_result.modified_count)

    if update_result.modified_count == 0:
        logger.warning("History not found, rolling back query insertion")
        await query_collection.delete_one({"query_id": query_id})
        raise HTTPException(status_code=404, detail="History not found")

    logger.info("Query creation successful")
    return created


@router.get("/{query_id}", response_model=QueryResponse)
async def get_query(query_id: str, current_user: dict = Depends(get_current_user)):
    # Find the query
    doc = await query_collection.find_one({"query_id": query_id})

    if not doc:
        raise HTTPException(status_code=404, detail="Query not found")

    # Check if the query belongs to the current user
    if doc["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access forbidden: This query belongs to another user")

    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


@router.put("/{query_id}", response_model=QueryResponse)
async def update_query(
        query_id: str,
        update: QueryUpdate,
        current_user: dict = Depends(get_current_user)
):
    # Find the query first to check ownership
    doc = await query_collection.find_one({"query_id": query_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Query not found")

    # Check if the query belongs to the current user
    if doc["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access forbidden: This query belongs to another user")

    update_data = update.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")

    result = await query_collection.update_one(
        {"query_id": query_id},
        {"$set": update_data}
    )

    updated = await query_collection.find_one({"query_id": query_id})
    updated["id"] = str(updated["_id"])
    del updated["_id"]
    return updated


@router.delete("/{query_id}")
async def delete_query(query_id: str, current_user: dict = Depends(get_current_user)):
    # Find the query first to check ownership
    doc = await query_collection.find_one({"query_id": query_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Query not found")

    # Check if the query belongs to the current user
    if doc["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access forbidden: This query belongs to another user")

    # Remove query from history
    history = await history_collection.find_one({"query_set": query_id})
    if history:
        await history_collection.update_one(
            {"query_set": query_id},
            {"$pull": {"query_set": query_id}, "$inc": {"query_number": -1}}
        )

    # Delete the query
    result = await query_collection.delete_one({"query_id": query_id})
    return {"message": "Query deleted successfully"}


@router.get("/user/me", response_model=List[QueryResponse])
async def get_my_queries(current_user: dict = Depends(get_current_user)):
    # Get queries for the current user (from token)
    user_id = current_user["id"]
    docs = await query_collection.find({"user_id": user_id}).to_list(100)

    for doc in docs:
        doc["id"] = str(doc["_id"])
        del doc["_id"]

    return docs