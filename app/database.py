import pytest
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
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


# Function to get the collection
async def get_collection(collection_name: str):
    return database[collection_name]

# Function to register a user in the 'users' collection
async def register_user(user_data: dict):
    # Add created_at field to user data
    user_data["created_at"] = datetime.utcnow()

    collection = await get_collection("users")
    result = await collection.insert_one(user_data)  # Await the insert operation

    return result.inserted_id  # After awaiting, you can get the inserted_id

"""
# Function to insert data into any collection
async def insert_data(data, collection_name):
    try:
        # Get the collection dynamically
        collection = database.get_collection(collection_name)

        # Insert the data into the collection
        result = await collection.insert_one(data)
        print(f"Data added successfully to {collection_name}. ID: {result.inserted_id}")
    except Exception as e:
        print(f"Error adding data to {collection_name}: {e}")


# Function to delete a document by `user_id`
async def delete_by_id(collection_name , id):
    try:
        # Get the collection dynamically
        collection = database.get_collection(collection_name)

        # Convert the string ID to ObjectId
        object_id = ObjectId(id)

        # Perform a delete operation based on user_id
        result = await collection.delete_one({"_id": object_id})

        # Check if a document was deleted
        if result.deleted_count > 0:
            print(f"The data with id {id} was deleted.")
        else:
            print(f"No user found with id {id}.")
    except Exception as e:
        print(f"Error deleting user: {e}")
"""

# Function to list all indexes and documents in a collection
async def list_indexes_and_data(collection_name):
    try:
        # Get the collection dynamically
        collection = database.get_collection(collection_name)

        # List all indexes in the collection
        indexes = await collection.list_indexes().to_list(None)  # None means no limit

        # Retrieve and print all documents in the collection
        documents = await collection.find().to_list(None)  # Fetch all documents
        print(f"\nDocuments in collection '{collection_name}':")
        for document in documents:
            print(document)  # Print each document
    except Exception as e:
        print(f"Error listing indexes in {collection_name}: {e}")

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
