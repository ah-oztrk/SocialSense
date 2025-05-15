import asyncio
from app.db.database import test_connection
#from app.database import register_user
from fastapi import FastAPI
#from app.api.routes import history
from app.api.routes.history import router as history_router
from app.api.routes.forum import router as forum_router
from app.api.routes.user import router as user_router
from app.api.routes.auth import router as auth_router
from app.api.routes.query import router as query_router
from fastapi.middleware.cors import CORSMiddleware

# Initialize FastAPI app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # This allows all origins - adjust for production
    allow_credentials=True,
    allow_methods=["*"],  # This allows all methods
    allow_headers=["*"],  # This allows all headers
)

# Include your history router
app.include_router(history_router)
app.include_router(forum_router)
app.include_router(user_router, prefix="/user")
app.include_router(auth_router, prefix="/auth")
app.include_router(query_router)

print("🚀 Main.py yüklendi")
@app.get("/")
def root():
    return {"message": "API ayakta ✅"}


@app.on_event("startup")
async def startup_event():
    await test_connection()
