import asyncio
from app.database import test_connection, register_user, list_indexes_and_data, get_collection

from app.database import register_user
from app.models import UserRegistrationRequest
from pydantic import EmailStr
from fastapi import FastAPI, HTTPException

# Initialize FastAPI app
app = FastAPI()




@app.post("/register")
async def register_user_endpoint(user: UserRegistrationRequest):
    # Prepare user data
    user_data = user.dict()

    try:
        # Await the async call to register the user
        inserted_id = await register_user(user_data)  # Ensure the async function is awaited
        return {"message": "User registered successfully!", "user_id": str(inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error registering user: {str(e)}")

# Run the functions
async def main():
    await test_connection()  # Test the connection to MongoDB
    #await insert_data(user_data, "user")  # Insert the example user
    await list_indexes_and_data("user")
    await delete_by_id("user", "67e18da5da8bb3f910e12363")
    await list_indexes_and_data("user")

# Run the main function
if __name__ == '__main__':
    asyncio.run(main())
