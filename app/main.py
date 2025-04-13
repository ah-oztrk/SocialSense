import asyncio
from app.database import test_connection, get_collection

from app.database import register_user
from pydantic import EmailStr
from fastapi import FastAPI, HTTPException

# Initialize FastAPI app
app = FastAPI()



# Run the functions
async def main():
    await test_connection()  # Test the connection to MongoDB


# Run the main function
if __name__ == '__main__':
    asyncio.run(main())
