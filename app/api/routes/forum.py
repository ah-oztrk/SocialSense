# === api/routes/forum.py ===
from fastapi import APIRouter, HTTPException
from app.db.database import forum_question_collection, forum_answer_collection
from app.schemas.forum import ForumQuestionCreate, ForumAnswerCreate
from bson import ObjectId
from typing import List

router = APIRouter()

# === Forum Questions ===
@router.post("/forum/question/")
async def create_question(question: ForumQuestionCreate):
    new_entry = question.model_dump()
    res = await forum_question_collection.insert_one(new_entry)
    # Fetch the full doc (includes _id as ObjectId)
    created = await forum_question_collection.find_one({"_id": res.inserted_id})

    # Convert _id to string
    if created and "_id" in created:
        created["id"] = str(created["_id"])
        del created["_id"]

    return created

@router.get("/forum/question/{question_id}")
async def get_question(question_id: str):
    doc = await forum_question_collection.find_one({"question_id": question_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Question not found")
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc

@router.delete("/forum/question/{question_id}")
async def delete_question(question_id: str):
    result = await forum_question_collection.delete_one({"question_id": question_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Question not found")
    return {"message": "Deleted"}


# === Forum Answers ===
@router.post("/forum/answer/")
async def create_answer(answer: ForumAnswerCreate):
    new_entry = answer.model_dump()
    res = await forum_answer_collection.insert_one(new_entry)
    created = await forum_answer_collection.find_one({"_id": res.inserted_id})

    if created and "_id" in created:
        created["id"] = str(created["_id"])
        del created["_id"]

    return created
@router.get("/forum/answer/{answer_id}")
async def get_answer(answer_id: str):
    doc = await forum_answer_collection.find_one({"answer_id": answer_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Answer not found")
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc

@router.delete("/forum/answer/{answer_id}")
async def delete_answer(answer_id: str):
    result = await forum_answer_collection.delete_one({"answer_id": answer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Answer not found")
    return {"message": "Deleted"}

