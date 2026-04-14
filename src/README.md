# TypeScript CRUD API with Node.js, Express & MySQL

A fully typed REST API for user management built with TypeScript, Express, Sequelize, and MySQL.

## Tech Stack
- TypeScript - Type safety
- Express - Web framework
- Sequelize - ORM for MySQL
- Joi - Request validation
- bcryptjs - Password hashing

## Setup Instructions

```bash
# Create project
mkdir typescript-crud-api && cd typescript-crud-api

# Initialize
npm init -y

# Install dependencies
npm install express mysql2 sequelize bcryptjs jsonwebtoken cors joi
npm install --save-dev typescript ts-node @types/node @types/express @types/cors @types/bcryptjs @types/jsonwebtoken nodemon

# Generate tsconfig.json
npx tsc --init

# Create folders
mkdir src src/_helpers src/_middleware src/users

Create config.json:

json
{
    "database": {
        "host": "localhost",
        "port": 3306,
        "user": "root",
        "password": "",
        "database": "typescript_crud_api"
    }
}
Update package.json scripts:

json
"scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "start:dev": "nodemon --exec ts-node src/server.ts"
}
Run the server:

bash
npm run start:dev
API Endpoints
Method	Endpoint	Description
POST	/users	Create user
GET	/users	Get all users
GET	/users/:id	Get user by ID
PUT	/users/:id	Update user
DELETE	/users/:id	Delete user
Postman Testing
POST /users - Create User

URL: http://localhost:4000/users

Headers: Content-Type: application/json

Body:

json
{
    "title": "Ms",
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@example.com",
    "password": "secret123",
    "confirmPassword": "secret123",
    "role": "User"
}
Response: { "message": "User created" }

GET /users - Get All Users

URL: http://localhost:4000/users

Response: Array of users (passwordHash hidden)

GET /users/:id - Get User by ID

URL: http://localhost:4000/users/1

Error: /users/999 → { "message": "User not found" }

PUT /users/:id - Update User

URL: http://localhost:4000/users/1

Body: { "firstName": "Janet", "lastName": "Smith-Jones" }

Response: { "message": "User updated" }

DELETE /users/:id - Delete User

URL: http://localhost:4000/users/1

Response: { "message": "User deleted" }

Validation Error Test

Send POST with missing fields: { "firstName": "Bob" }

Response (400): { "message": "Validation error: \"title\" is required, \"lastName\" is required, \"email\" is required, \"password\" is required, \"confirmPassword\" is required" }

TypeScript Benefits
Catches typos like findByPK instead of findByPk at compile time, prevents missing await before bcrypt.hash(), provides autocomplete, makes code self-documenting.

Troubleshooting
Issue	Solution
MODULE_NOT_FOUND	Run npm install
MySQL connection error	Check MySQL is running and config.json credentials
Port 4000 in use	Change PORT or kill process using the port