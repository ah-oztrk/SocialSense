import asyncio
from database import test_connection, insert_data, list_indexes_and_data, delete_by_id
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
    #await insert_data(user_data, "user")  # Insert the example user
    await list_indexes_and_data("user")
    await delete_by_id("user", "67e18da5da8bb3f910e12363")
    await list_indexes_and_data("user")

# Run the main function
if __name__ == '__main__':
    asyncio.run(main())
