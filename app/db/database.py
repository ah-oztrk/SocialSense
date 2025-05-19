import pytest
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from pymongo import ASCENDING
import os
from datetime import datetime

# Güvenli ortam değişkeni kullanımı (Atlas bağlantısı için varsayılan URI güncellendi)
# MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://sacar:Kyu1iFoTsSrGqOb6@bitirme.d49aj.mongodb.net/")
DB_NAME = os.getenv("DB_NAME", "SocialSense2")

# Asenkron MongoDB istemcisi oluştur
client = AsyncIOMotorClient("mongodb+srv://sacar:Kyu1iFoTsSrGqOb6@bitirme.d49aj.mongodb.net/")
database = client[DB_NAME]

# Koleksiyonlar
user_collection = database.get_collection("user")
history_collection = database.get_collection("history")
forum_question_collection = database.get_collection("forum-question")
forum_answer_collection = database.get_collection("forum-answer")
query_collection = database.get_collection("query")


# Function to get the collection
async def get_collection(collection_name: str):
    return database[collection_name]


# to test mongodb connection
async def test_connection():
    try:
        await database.command("ping")
        print("MongoDB connection successful!")
        # print(await database.list_collection_names())
    except Exception as e:
        print(f"Connection error: {e}")

# to test mongodb connection
@pytest.mark.asyncio
async def test_mongo_connection():
    await test_connection()
