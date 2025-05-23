# === api/routes/forum.py ===
from fastapi import APIRouter, HTTPException, Depends, status
from app.db.database import forum_question_collection, forum_answer_collection
from app.schemas.forum import ForumQuestionCreate, ForumAnswerCreate, ForumQuestionResponse, ForumAnswerResponse
from app.core.auth import get_current_user
from bson import ObjectId
from typing import List, Dict
from datetime import datetime
from app.db.database import forum_question_collection, forum_answer_collection, user_collection
router = APIRouter()


# Helper function to add username to a document
async def add_username_to_doc(doc):
    if doc and "user_id" in doc:
        try:
            user = None
            user_id = doc["user_id"]

            # First method: Try to look up by direct ID
            print(f"Looking up username for user_id: {user_id}")

            # Try with ObjectId
            if ObjectId.is_valid(user_id):
                user = await user_collection.find_one({"_id": ObjectId(user_id)})
                if user:
                    print(f"Found user by ObjectId: {user.get('username')}")

            # If not found, try with string ID
            if not user:
                user = await user_collection.find_one({"id": user_id})
                if user:
                    print(f"Found user by string id: {user.get('username')}")

            # If still not found, try as username
            if not user:
                user = await user_collection.find_one({"username": user_id})
                if user:
                    print(f"Found user by username: {user.get('username')}")

            # If found a user, add username
            if user and "username" in user:
                doc["username"] = user["username"]
                print(f"Added username '{user['username']}' to document")
            else:
                print(f"No user found for user_id: {user_id}")

                # If the user ID is in a specific format like "a_123456_timestamp",
                # extract a friendly name from it
                if user_id and isinstance(user_id, str):
                    if user_id.startswith("a_") or user_id.startswith("q_"):
                        parts = user_id.split("_")
                        if len(parts) >= 2:
                            # Use "User" followed by the first few chars of the ID
                            doc["username"] = f"User {parts[1][:8]}"
                            print(f"Created friendly name from ID: {doc['username']}")
                    else:
                        # Ensure we have some username even if lookup failed
                        doc["username"] = f"User {user_id[:8]}"
                        print(f"Using shortened ID as username: {doc['username']}")

                # Debug - print user collection info
                count = await user_collection.count_documents({})
                print(f"Total users in database: {count}")

                # Sample first user
                if count > 0:
                    sample_user = await user_collection.find_one({})
                    if sample_user:
                        print(f"Sample user structure: {sample_user.keys()}")

        except Exception as e:
            print(f"Error looking up username for user_id {doc['user_id']}: {e}")
            # Fallback username on error
            doc["username"] = f"User {doc['user_id'][:8]}" if isinstance(doc['user_id'], str) else "Unknown User"
    return doc

# === Forum Questions ===

# === Forum Questions ===
@router.post("/forum/question/", response_model=ForumQuestionResponse)
async def create_question(
        question: ForumQuestionCreate,
        current_user: dict = Depends(get_current_user)
):
    question_id = question.question_id or f"q_{current_user['id']}_{int(datetime.utcnow().timestamp())}"

    # Add user ID from the authenticated user
    new_entry = question.model_dump()
    new_entry["user_id"] = current_user["id"]
    new_entry["question_id"] = question_id
    new_entry["creation_date"] = datetime.utcnow().isoformat()

    res = await forum_question_collection.insert_one(new_entry)
    created = await forum_question_collection.find_one({"_id": res.inserted_id})

    if created and "_id" in created:
        created["id"] = str(created["_id"])
        del created["_id"]

    # Add username from current user
    created["username"] = current_user["username"]
    return created



# Add new endpoint to get all questions - placing it before specific routes
@router.get("/forum/question/all")
async def get_all_questions(current_user: dict = Depends(get_current_user)):
    try:
        print(f"Fetching all questions for user: {current_user['id']}")

        questions = []
        cursor = forum_question_collection.find({})

        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            # Add username to each question
            doc = await add_username_to_doc(doc)
            questions.append(doc)

        print(f"Returning {len(questions)} questions")
        return questions
    except Exception as e:
        print(f"Error in get_all_questions: {str(e)}")
        import traceback
        traceback.print_exc()
        # Return empty list instead of throwing an error
        return []


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
    # Add username
    doc = await add_username_to_doc(doc)
    return doc

@router.get("/forum/my-questions/", response_model=List[ForumQuestionResponse])
async def get_user_questions(
        current_user: dict = Depends(get_current_user)
):
    questions = []
    cursor = forum_question_collection.find({"user_id": current_user["id"]})
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        # Add username - for my questions, we know it's the current user
        doc["username"] = current_user["username"]
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

    answer_id = answer.answer_id or f"a_{current_user['id']}_{int(datetime.utcnow().timestamp())}"

    # Add user ID from the authenticated user
    new_entry = answer.model_dump()
    new_entry["user_id"] = current_user["id"]
    new_entry["answer_id"] = answer_id
    new_entry["creation_date"] = datetime.utcnow().isoformat()

    res = await forum_answer_collection.insert_one(new_entry)
    created = await forum_answer_collection.find_one({"_id": res.inserted_id})

    if created and "_id" in created:
        created["id"] = str(created["_id"])
        del created["_id"]

    # Add username from current user
    created["username"] = current_user["username"]
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
    # Add username
    doc = await add_username_to_doc(doc)
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
        # Add username
        doc = await add_username_to_doc(doc)
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
        # Add username - for my answers, we know it's the current user
        doc["username"] = current_user["username"]
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
async def get_question_answers_alt(question_id: str, current_user: dict = Depends(get_current_user)):
    answers = []
    cursor = forum_answer_collection.find({"question_id": question_id})
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        # Add username
        doc = await add_username_to_doc(doc)
        answers.append(doc)
    return answers