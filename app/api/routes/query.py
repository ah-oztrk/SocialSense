from fastapi import APIRouter, HTTPException, Body  # Add Body import
from app.db.database import query_collection, history_collection
from app.schemas.query import QueryCreate, QueryResponse, QueryUpdate
from app.schemas.history import HistoryUpdate
from datetime import datetime
import ollama
from typing import List
import logging  # Import the logging module

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)  # Create a logger for this module
router = APIRouter()


@router.post("/query/", response_model=QueryResponse)
async def create_query(query_data: dict = Body(...)):
    logger.info("Received query request: %s", query_data)

    # Extract fields from the request body
    user_id = query_data.get("user_id")
    query = query_data.get("query")
    history_id = query_data.get("history_id")
    model_name = query_data.get("model_name")

    logger.info("Extracted fields - user_id: %s, query: %s, history_id: %s, model_name: %s",
                user_id, query, history_id, model_name)

    # Validate that all required fields are present
    if not all([user_id, query, history_id, model_name]):
        raise HTTPException(status_code=400, detail="Missing required fields: user_id, query, history_id, model_name are all required")

    # Validate model name
    valid_models = ["emotiondetection", "textSimplification", "socialNorm"]
    if model_name not in valid_models:
        raise HTTPException(status_code=400, detail="Invalid model name. Choose from: emotiondetection, textSimplification, socialNorm")

    # Generate a unique query_id (for simplicity, using timestamp + user_id)
    query_id = f"qry_{user_id}_{int(datetime.now().timestamp())}"
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
    query_entry = QueryCreate(
        query_id=query_id,
        user_id=user_id,
        query=query,
        response=response_text,
        creation_date=creation_date,
        history_id=history_id
    )
    logger.info("Prepared query entry: %s", query_entry.model_dump())

    # Insert into query collection
    logger.info("Inserting into query collection")
    new_entry = query_entry.model_dump()
    res = await query_collection.insert_one(new_entry)
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
    history_update = HistoryUpdate(query_id=query_id)
    update_result = await history_collection.update_one(
        {"history_id": history_id},
        {"$push": {"query_set": query_id}, "$inc": {"query_number": 1}}
    )
    logger.info("History update result: modified_count=%d", update_result.modified_count)

    if update_result.modified_count == 0:
        logger.warning("History not found, rolling back query insertion")
        await query_collection.delete_one({"query_id": query_id})
        raise HTTPException(status_code=404, detail="History not found")

    # Validate the response against QueryResponse model manually
    try:
        validated_response = QueryResponse(**created)
        logger.info("Validated response: %s", validated_response.dict())
    except Exception as e:
        logger.error("Response validation error: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Response validation failed: {str(e)}")

    logger.info("Query creation successful")
    return created


# The rest of the endpoints (get_query, update_query, delete_query, get_user_queries) remain unchanged
@router.get("/query/{query_id}", response_model=QueryResponse)
async def get_query(query_id: str):
    doc = await query_collection.find_one({"query_id": query_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Query not found")
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


@router.put("/query/{query_id}", response_model=QueryResponse)
async def update_query(query_id: str, update: QueryUpdate):
    update_data = update.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")

    result = await query_collection.update_one(
        {"query_id": query_id},
        {"$set": update_data}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Query not found")

    updated = await query_collection.find_one({"query_id": query_id})
    updated["id"] = str(updated["_id"])
    del updated["_id"]
    return updated


@router.delete("/query/{query_id}")
async def delete_query(query_id: str):
    # Remove query from history
    history = await history_collection.find_one({"query_set": query_id})
    if history:
        await history_collection.update_one(
            {"query_set": query_id},
            {"$pull": {"query_set": query_id}, "$inc": {"query_number": -1}}
        )

    # Delete the query
    result = await query_collection.delete_one({"query_id": query_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Query not found")
    return {"message": "Deleted"}


@router.get("/query/user/{user_id}", response_model=List[QueryResponse])
async def get_user_queries(user_id: str):
    docs = await query_collection.find({"user_id": user_id}).to_list(100)
    for doc in docs:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return docs