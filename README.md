# TaskFlow — Team Task Manager

A full-stack collaborative task management app with role-based access control.

## Live URLs
- **Frontend:** replace with your Railway frontend URL
- **Backend API:** replace with your Railway backend URL

## Features

- **Authentication** — Signup/Login with JWT; secure password hashing (bcrypt)
- **Project Management** — Create projects; creator is auto-assigned Admin; Admins add/remove members
- **Task Management** — Create tasks with title, description, due date, priority; assign to members; track status (To Do / In Progress / Done)
- **Dashboard** — Total tasks, tasks by status, tasks per user, overdue tasks
- **Role-Based Access Control**
  - **Admin** — Full control: manage tasks, members, delete tasks
  - **Member** — Can only update status of tasks assigned to them

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Auth | JWT + bcryptjs |
| Deployment | Railway |

## Local Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm start
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

The database schema is created automatically on first start.

## Environment Variables

### Backend (`.env`)
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Secret key for signing JWTs
- `PORT` — Server port (default: 4000)
- `NODE_ENV` — `development` or `production`
- `FRONTEND_URL` — Frontend URL for CORS

### Frontend (`.env`)
- `VITE_API_URL` — Backend API base URL

## Deployment on Railway

### Backend service
- Root directory: `backend`
- Set environment variables:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `NODE_ENV=production`
  - `FRONTEND_URL=<your frontend Railway URL>`

### Frontend service
- Root directory: `frontend`
- Set environment variables:
  - `VITE_API_URL=<your backend Railway URL>`

### Deploy
Railway auto-deploys on push. Verify `/health` returns `{"status":"ok"}`.

## Database Schema

```sql
users (id, name, email, password_hash, created_at)
projects (id, name, description, created_by, created_at)
project_members (id, project_id, user_id, role, joined_at)
tasks (id, project_id, title, description, due_date, priority, status, assigned_to, created_by, created_at, updated_at)
```
