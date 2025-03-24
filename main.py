import asyncio
from database import test_connection, insert_user
from datetime import datetime

# Example user data to insert
user_data = {
    "user_id": "12345",  # User ID
    "password": "securepassword123",  # Password (it should be hashed in a real case)
    "username": "ahsen_ozturk",  # Username
    "displayed_name": "Ahsen Öztürk",  # Displayed name
    "age": 23,  # Age
    "gender": "Female",  # Gender
    "account_creation_date": datetime.now(),  # Account creation date
}

# Run the functions
async def main():
    await test_connection()  # Test the connection to MongoDB
    await insert_user(user_data)  # Insert the example user

# Run the main function
if __name__ == '__main__':
    asyncio.run(main())
