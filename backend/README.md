# Backend Setup Instructions

## Prerequisites

1. Python 3.8 or higher
2. MySQL database server
3. pip package manager

## Installation

1. Install Python dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. Set up environment variables:
   Create a `.env` file in the `backend` directory with the following content:
   ```
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=your_mysql_username
   DB_PASSWORD=your_mysql_password
   DB_NAME=kelasipro_db
   JWT_SECRET=your_secret_key_here
   ```

3. Set up the database:
   - Create a MySQL database named `kelasipro_db`
   - The `create_super_admin.py` script will automatically create the necessary tables and a super admin user

## Running the Server

1. Start the backend server:
   ```bash
   cd backend
   python app.py
   ```

2. The server will start on `http://localhost:5000`

## API Endpoints

- `GET /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/users` - Get all users (requires SUPER_ADMIN role)
- `POST /api/users` - Create new user (requires SUPER_ADMIN role)
- `PUT /api/users/{id}` - Update user (requires SUPER_ADMIN role)
- `DELETE /api/users/{id}` - Delete user (requires SUPER_ADMIN role)

## Troubleshooting

- If you get "Module not found" errors, ensure all dependencies are installed with `pip install -r requirements.txt`
- If the server won't start, check that your MySQL server is running and credentials are correct
- For CORS issues, ensure the frontend is running on `http://localhost:3000`