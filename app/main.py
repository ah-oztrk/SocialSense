import asyncio
from app.db.database import test_connection
#from app.database import register_user
from fastapi import FastAPI

#from app.api.routes import history
from app.api.routes.history import router as history_router


# Initialize FastAPI app
app = FastAPI()

# Include your history router
app.include_router(history_router)

# Run the functions
async def main():
    await test_connection()  # Test the connection to MongoDB


# Run the main function
if __name__ == '__main__':
    asyncio.run(main())
