import asyncio
from app.db.database import test_connection
from fastapi import FastAPI
from app.api.routes.history import router as history_router
from app.api.routes.forum import router as forum_router
from app.api.routes.user import router as user_router
from app.api.routes.auth import router as auth_router


# Initialize FastAPI app
app = FastAPI()

app.include_router(history_router)
app.include_router(forum_router)
app.include_router(user_router, prefix="/user")
app.include_router(auth_router, prefix="/auth")

print("🚀 Main.py yüklendi")
@app.get("/")
def root():
    return {"message": "API ayakta ✅"}


@app.on_event("startup")
async def startup_event():
    await test_connection()
