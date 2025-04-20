import pytest
import httpx

BASE_URL = "http://127.0.0.1:8000"

@pytest.mark.asyncio
async def test_create_history():
    data = {
        "user_id": "test_user",
        "history_id": "hist_test",
        "assistant_name": "tester"
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(f"{BASE_URL}/history/", json=data)
        assert response.status_code == 200
        assert response.json()["user_id"] == "test_user"

@pytest.mark.asyncio
async def test_get_history():
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/history/hist_test")
        assert response.status_code == 200
        assert "query_number" in response.json()

@pytest.mark.asyncio
async def test_delete_history():
    async with httpx.AsyncClient() as client:
        response = await client.delete(f"{BASE_URL}/history/hist_test")
        assert response.status_code == 200
        assert response.json()["message"] == "Deleted"
