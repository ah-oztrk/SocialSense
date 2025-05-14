# === api/routes/forum.py ===
from fastapi import APIRouter, HTTPException, Depends, status
from app.db.database import forum_question_collection, forum_answer_collection
from app.schemas.forum import ForumQuestionCreate, ForumAnswerCreate, ForumQuestionResponse, ForumAnswerResponse
from app.core.auth import get_current_user
from bson import ObjectId
from typing import List, Dict
from datetime import datetime

router = APIRouter()


# === Forum Questions ===
@router.post("/forum/question/", response_model=ForumQuestionResponse)
async def create_question(
        question: ForumQuestionCreate,
        current_user: dict = Depends(get_current_user)
):
    # Add user ID from the authenticated user
    new_entry = question.model_dump()
    new_entry["user_id"] = current_user["id"]
    new_entry["creation_date"] = datetime.utcnow().isoformat()

    res = await forum_question_collection.insert_one(new_entry)
    created = await forum_question_collection.find_one({"_id": res.inserted_id})

    if created and "_id" in created:
        created["id"] = str(created["_id"])
        del created["_id"]

    return created




@router.get("/forum/question/{question_id}", response_model=ForumQuestionResponse)
async def get_question(
        question_id: str,
        current_user: dict = Depends(get_current_user)
):
    doc = await forum_question_collection.find_one({"question_id": question_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Question not found")

    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


@router.get("/forum/questions/", response_model=List[ForumQuestionResponse])
async def get_all_questions(
        current_user: dict = Depends(get_current_user),
        skip: int = 0,
        limit: int = 20
):
    questions = []
    cursor = forum_question_collection.find().skip(skip).limit(limit)
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        questions.append(doc)

    return questions


@router.get("/forum/my-questions/", response_model=List[ForumQuestionResponse])
async def get_user_questions(
        current_user: dict = Depends(get_current_user)
):
    questions = []
    cursor = forum_question_collection.find({"user_id": current_user["id"]})
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        questions.append(doc)

    return questions


@router.delete("/forum/question/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question(
        question_id: str,
        current_user: dict = Depends(get_current_user)
):
    # Check if the question exists and belongs to the current user
    question = await forum_question_collection.find_one({"question_id": question_id})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    if question["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this question"
        )

    result = await forum_question_collection.delete_one({"question_id": question_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=500, detail="Failed to delete question")

    return None


# === Forum Answers ===
@router.post("/forum/answer/", response_model=ForumAnswerResponse)
async def create_answer(
        answer: ForumAnswerCreate,
        current_user: dict = Depends(get_current_user)
):
    # Check if the question exists
    question = await forum_question_collection.find_one({"question_id": answer.question_id})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    # Add user ID from the authenticated user
    new_entry = answer.model_dump()
    new_entry["user_id"] = current_user["id"]
    new_entry["creation_date"] = datetime.utcnow().isoformat()

    res = await forum_answer_collection.insert_one(new_entry)
    created = await forum_answer_collection.find_one({"_id": res.inserted_id})

    if created and "_id" in created:
        created["id"] = str(created["_id"])
        del created["_id"]

    return created


@router.get("/forum/answer/{answer_id}", response_model=ForumAnswerResponse)
async def get_answer(
        answer_id: str,
        current_user: dict = Depends(get_current_user)
):
    doc = await forum_answer_collection.find_one({"answer_id": answer_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Answer not found")

    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


@router.get("/forum/question/{question_id}/answers", response_model=List[ForumAnswerResponse])
async def get_question_answers(
        question_id: str,
        current_user: dict = Depends(get_current_user)
):
    # Check if the question exists
    question = await forum_question_collection.find_one({"question_id": question_id})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    answers = []
    cursor = forum_answer_collection.find({"question_id": question_id})
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        answers.append(doc)

    return answers


@router.get("/forum/my-answers/", response_model=List[ForumAnswerResponse])
async def get_user_answers(
        current_user: dict = Depends(get_current_user)
):
    answers = []
    cursor = forum_answer_collection.find({"user_id": current_user["id"]})
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        answers.append(doc)

    return answers


@router.delete("/forum/answer/{answer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_answer(
        answer_id: str,
        current_user: dict = Depends(get_current_user)
):
    # Check if the answer exists and belongs to the current user
    answer = await forum_answer_collection.find_one({"answer_id": answer_id})
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found")

    if answer["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this answer"
        )

    result = await forum_answer_collection.delete_one({"answer_id": answer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=500, detail="Failed to delete answer")

    return None

# Add new endpoint to get answers for a specific question - placing it before specific routes

@router.get("/forum/answer/question/{question_id}")

async def get_question_answers(question_id: str):

    answers = []

    cursor = forum_answer_collection.find({"question_id": question_id})

    async for doc in cursor:

        doc["id"] = str(doc["_id"])

        del doc["_id"]

        answers.append(doc)

    return answers