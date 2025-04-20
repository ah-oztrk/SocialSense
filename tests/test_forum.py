import pytest
import httpx

BASE_URL = "http://127.0.0.1:8000"

# ---------- Question Tests ----------

@pytest.mark.asyncio
async def test_create_forum_question():
    data = {
        "question_id": "q_test_02",
        "user_id": "user_test_02",
        "question_header": "Sample Q",
        "question": "What is the meaning of async in FastAPI?",
        "creation_date": "2024-04-19T12:00:00"
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(f"{BASE_URL}/forum/question/", json=data)
        assert response.status_code == 200
        assert response.json()["question_id"] == "q_test_02"

@pytest.mark.asyncio
async def test_get_forum_question():
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/forum/question/q_test_02")
        assert response.status_code == 200
        assert "question" in response.json()

@pytest.mark.asyncio
async def test_delete_forum_question():
    async with httpx.AsyncClient() as client:
        response = await client.delete(f"{BASE_URL}/forum/question/q_test_02")
        assert response.status_code == 200
        assert response.json()["message"] == "Deleted"


# ---------- Answer Tests ----------

@pytest.mark.asyncio
async def test_create_forum_answer():
    data = {
        "question_id": "q_test_03",
        "user_id": "user_test_03",
        "answer_id": "a_test_01",
        "answer": "Async allows concurrency in FastAPI endpoints.",
        "creation_date": "2024-04-19T13:00:00"
    }

    # You need to create the corresponding question first for referential integrity
    await httpx.AsyncClient().post(f"{BASE_URL}/forum/question/", json={
        "question_id": "q_test_03",
        "user_id": "user_test_03",
        "question_header": "Async Question",
        "question": "Explain async?",
        "creation_date": "2024-04-19T13:00:00"
    })

    async with httpx.AsyncClient() as client:
        response = await client.post(f"{BASE_URL}/forum/answer/", json=data)
        assert response.status_code == 200
        assert response.json()["answer_id"] == "a_test_01"

@pytest.mark.asyncio
async def test_get_forum_answer():
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/forum/answer/a_test_01")
        assert response.status_code == 200
        assert "answer" in response.json()

@pytest.mark.asyncio
async def test_delete_forum_answer():
    async with httpx.AsyncClient() as client:
        response = await client.delete(f"{BASE_URL}/forum/answer/a_test_01")
        assert response.status_code == 200
        assert response.json()["message"] == "Deleted"
