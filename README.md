# TaskFlow — Real-Time Task Collaboration Platform

![Build Status](https://github.com/username/repo/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![NestJS](https://img.shields.io/badge/NestJS-10.0-red)
![React](https://img.shields.io/badge/React-18.0-blue)

TaskFlow is a high-performance, real-time collaboration tool inspired by Trello and Notion. It enables teams to organize tasks visually, communicate instantly, and track progress effortlessly.

## Key Features

*   **Real-Time Collaboration**: Instant updates via Socket.IO/Redis. See changes as they happen.
*   **Drag & Drop Interface**: Smooth, optimistic UI updates for moving tasks and lists (powered by `@dnd-kit`).
*   **Role-Based Access**: Board owners can invite members and manage permissions.
*   **robust Security**: JWT authentication, rate limiting, and inputs validation.
*   **Activity Logging**: Detailed audit trail for every action on the board.
*   **Modern UI**: Glassmorphism design, dark mode, and responsive layout.

## Tech Stack

### Backend
*   **Framework**: NestJS (Node.js)
*   **Database**: PostgreSQL with Prisma ORM
*   **Real-time**: Socket.IO with Redis Adapter (scalable to multiple instances)
*   **Validation**: class-validator & class-transformer
*   **Testing**: Jest (Unit & E2E)
*   **Security**: Helmet, Throttler (Rate Limiting), CORS
*   **Logging**: Winston with file rotation

### Frontend
*   **Framework**: React (Vite)
*   **State Management**: Zustand + React Query (TanStack Query)
*   **Styling**: TailwindCSS
*   **Drag & Drop**: @dnd-kit
*   **Testing**: Vitest + React Testing Library

### DevOps
*   **Containerization**: Docker & Docker Compose
*   **CI/CD**: GitHub Actions
*   **Reverse Proxy**: Nginx

## Getting Started

### Prerequisites
*   Docker & Docker Compose installed
*   Node.js 18+ (for local dev without Docker)

### Quick Start (Docker)

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-repo/taskflow.git
    cd taskflow
    ```

2.  **Start the services**
    ```bash
    docker-compose up --build
    ```
    This will spin up Postgres, Redis, Backend (API), and Frontend (Nginx).

3.  **Access the app**
    *   Frontend: `http://localhost:5173`
    *   Backend API: `http://localhost:3000/api`
    *   Health Check: `http://localhost:3000/api/health`

4.  **Demo Credentials** (automatically seeded)
    ```
    Email: stark@demo.com
    Password: password123
    
    Email: steve@demo.com
    Password: password123
    
    Email: peter@demo.com
    Password: password123
    ```

### Local Development

1.  **Backend**
    ```bash
    cd backend
    npm install
    # Set up .env (copy from .env.example)
    npx prisma generate
    npx prisma migrate dev
    npx prisma db seed  # Seed demo users
    npm run start:dev
    ```

2.  **Frontend**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

## Testing

### Backend
```bash
cd backend
npm test        # Unit tests
npm run test:e2e # End-to-end tests
```

### Frontend
```bash
cd frontend
npm test        # Run Vitest
```

## API Documentation

The API follows RESTful conventions. Key endpoints:

*   **Auth**: `POST /api/auth/signup`, `POST /api/auth/login`
*   **Boards**: `GET /api/boards`, `POST /api/boards`
*   **Tasks**: `POST /api/tasks`, `PUT /api/tasks/:id/move`
*   **Health**: `GET /api/health`

## Security & Scalability

*   **Rate Limiting**: Global limit of 100 requests per minute per IP.
*   **Security Headers**: Helmet middleware for XSS, clickjacking, and MIME-type sniffing protection.
*   **Password Strength**: Enforced 8+ characters with uppercase, lowercase, number, and special character.
*   **Logging**: Winston logger with file rotation for error tracking and debugging.
*   **Redis Adapter**: WebSocket events are broadcast via Redis, allowing the backend to scale horizontally across multiple instances.
*   **Optimistic Updates**: The frontend UI updates immediately while the server processes the request, providing a snappy experience.

## License
MIT
