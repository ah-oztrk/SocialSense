import pytest
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING
import os
from datetime import datetime

# Güvenli ortam değişkeni kullanımı (Atlas bağlantısı için varsayılan URI güncellendi)
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://sacar:Kyu1iFoTsSrGqOb6@bitirme.d49aj.mongodb.net/")
DB_NAME = os.getenv("DB_NAME", "SocialSense2")

# Asenkron MongoDB istemcisi oluştur
client = AsyncIOMotorClient(MONGO_URI)
database = client[DB_NAME]

# Koleksiyonlar
users_collection = database.get_collection("user")
assistance_collection = database.get_collection("history")
forum_question_collection = database.get_collection("forum-question")
forum_answer_collection = database.get_collection("forum-answer")
profile_collection = database.get_collection("query")


# Function to insert a user into the database
async def insert_user(user_data):


    try:
        # Insert the user into the collection
        result = await users_collection.insert_one(user_data)
        print(f"User added successfully. ID: {result.inserted_id}")
    except Exception as e:
        print(f"Error adding data: {e}")



# to test mongodb connection
async def test_connection():
    try:
        await database.command("ping")
        print("MongoDB connection successful!")
    except Exception as e:
        print(f"Connection error: {e}")

# to test mongodb connection
@pytest.mark.asyncio
async def test_mongo_connection():
    await test_connection()
