import pytest
import httpx

BASE_URL = "http://127.0.0.1:8000"


@pytest.mark.asyncio
async def test_create_query():
    history_data = {
        "user_id": "test_user_query",
        "history_id": "hist_test_query",
        "assistant_name": "tester"
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Create history
        await client.post(f"{BASE_URL}/history/", json=history_data)

        # Create query
        query_data = {
            "user_id": "test_user_query",
            "query": "Is it okay to be late to a meeting?",
            "history_id": "hist_test_query",
            "model_name": "social_norm_model"
        }
        response = await client.post(f"{BASE_URL}/query/", json=query_data)
        assert response.status_code == 200
        assert response.json()["user_id"] == "test_user_query"
        assert "response" in response.json()


@pytest.mark.asyncio
async def test_get_query():
    async with httpx.AsyncClient() as client:
        # Create required history
        await client.post(f"{BASE_URL}/history/", json={
            "user_id": "user123",
            "history_id": "hist_get_test",
            "assistant_name": "tester"
        })

        # Create query
        query_data = {
            "user_id": "user123",
            "query": "Is stealing wrong?",
            "history_id": "hist_get_test",
            "model_name": "social_norm_model"
        }
        post_response = await client.post(f"{BASE_URL}/query/", json=query_data)
        assert post_response.status_code == 200
        query_id = post_response.json()["query_id"]

        # Fetch query
        get_response = await client.get(f"{BASE_URL}/query/{query_id}")
        assert get_response.status_code == 200
        assert get_response.json()["query"] == "Is stealing wrong?"


@pytest.mark.asyncio
async def test_update_query():
    async with httpx.AsyncClient() as client:
        await client.post(f"{BASE_URL}/history/", json={
            "user_id": "test_user_query",
            "history_id": "hist_update_test",
            "assistant_name": "tester"
        })

        # Create query
        query_data = {
            "user_id": "test_user_query",
            "query": "Test query for update",
            "history_id": "hist_update_test",
            "model_name": "social_norm_model"
        }
        post_response = await client.post(f"{BASE_URL}/query/", json=query_data)
        query_id = post_response.json()["query_id"]

        # Update query
        update_data = {
            "user_rating": 4.5,
            "user_feedback": "Very helpful!"
        }
        put_response = await client.put(f"{BASE_URL}/query/{query_id}", json=update_data)
        assert put_response.status_code == 200
        assert put_response.json()["user_rating"] == 4.5
        assert put_response.json()["user_feedback"] == "Very helpful!"


@pytest.mark.asyncio
async def test_delete_query():
    async with httpx.AsyncClient() as client:
        await client.post(f"{BASE_URL}/history/", json={
            "user_id": "test_user_query",
            "history_id": "hist_delete_test",
            "assistant_name": "tester"
        })

        # Create query
        query_data = {
            "user_id": "test_user_query",
            "query": "Test query for delete",
            "history_id": "hist_delete_test",
            "model_name": "social_norm_model"
        }
        post_response = await client.post(f"{BASE_URL}/query/", json=query_data)
        query_id = post_response.json()["query_id"]

        # Delete query
        delete_response = await client.delete(f"{BASE_URL}/query/{query_id}")
        assert delete_response.status_code == 200
        assert delete_response.json()["message"] == "Deleted"

# === Negative Cases ===
@pytest.mark.asyncio
async def test_create_query_missing_field():
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Make sure the history exists
        await client.post(f"{BASE_URL}/history/", json={
            "user_id": "test_user_query",
            "history_id": "hist_missing_field",
            "assistant_name": "tester"
        })

        # Missing the 'query' field
        query_data = {
            "user_id": "test_user_query",
            "history_id": "hist_missing_field",
            "model_name": "social_norm_model"
        }

        response = await client.post(f"{BASE_URL}/query/", json=query_data)
        assert response.status_code == 400
        assert response.json()["detail"] == "Missing required fields: user_id, query, history_id, model_name are all required"


@pytest.mark.asyncio
async def test_create_query_invalid_model_name():
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Make sure the history exists
        await client.post(f"{BASE_URL}/history/", json={
            "user_id": "test_user_query",
            "history_id": "hist_invalid_model",
            "assistant_name": "tester"
        })

        # Invalid model name
        query_data = {
            "user_id": "test_user_query",
            "query": "Test query for invalid model",
            "history_id": "hist_invalid_model",
            "model_name": "unknown_model"
        }

        response = await client.post(f"{BASE_URL}/query/", json=query_data)
        assert response.status_code == 400
        assert "Invalid model name" in response.json()["detail"]
