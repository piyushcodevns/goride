# 🚖 GoRide Backend API

A production-ready backend for **GoRide**, a modern ride-booking platform inspired by Uber, Ola and Rapido.

> **Note:** "GoRide" is currently a placeholder project name. It can be renamed and customized according to the client's branding.

---

# 🚀 Tech Stack

- Node.js
- Express.js
- PostgreSQL
- Prisma ORM
- JWT Authentication
- Bcrypt
- Nodemailer
- Zod Validation

---

# ✨ Features

## Authentication

- User Registration
- User Login
- JWT Authentication
- Protected Routes
- User Profile API

## Password Management

- Forgot Password
- Reset Password
- Secure Reset Token
- Token Expiry
- Password Hashing

## Security

- Helmet
- CORS
- Password Hashing (bcrypt)
- JWT
- Input Validation
- Secure Token Hashing

---

# 📁 Project Structure

```
goride/
│
├── prisma/
│   ├── migrations/
│   └── schema.prisma
│
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── repositories/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── validators/
│   ├── app.js
│   └── server.js
│
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

# ⚙️ Installation

Clone the repository

```bash
git clone <repository-url>
```

Install dependencies

```bash
npm install
```

Create environment file

```bash
cp .env.example .env
```

Run Prisma migrations

```bash
npx prisma migrate dev
```

Generate Prisma Client

```bash
npx prisma generate
```

Start development server

```bash
npm run dev
```

---

# 🌍 Environment Variables

Create a `.env` file using `.env.example`

```
PORT=

DATABASE_URL=

JWT_SECRET=

JWT_EXPIRES_IN=

EMAIL_HOST=

EMAIL_PORT=

EMAIL_USER=

EMAIL_PASS=

EMAIL_FROM=
```

---

# 🔑 Authentication APIs

| Method | Endpoint |
|---------|----------|
| POST | /api/auth/register |
| POST | /api/auth/login |
| GET | /api/auth/profile |
| POST | /api/auth/forgot-password |
| POST | /api/auth/reset-password |

---

# 🛠 Current Status

Completed

- User Authentication
- JWT Authorization
- Password Recovery
- Repository Pattern
- PostgreSQL Integration
- Prisma ORM

Upcoming

- Change Password
- Email Verification
- Driver Module
- Vehicle Module
- Ride Booking
- Fare Calculation
- Payment Integration
- Admin Panel

---

# 📄 License

This project is created for educational and portfolio purposes and can be customized for real-world client requirements.