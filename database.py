from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING
import os

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = "fastapi_project"

client = AsyncIOMotorClient(MONGO_URI)
database = client[DB_NAME]

# Kullanıcı koleksiyonu
users_collection = database.get_collection("users")
assistance_collection = database.get_collection("assistance")
forum_collection = database.get_collection("forum")
profile_collection = database.get_collection("profile")
