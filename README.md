# TaskFlow — Real-Time Task Collaboration Platform

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![NestJS](https://img.shields.io/badge/NestJS-10.0-red)
![React](https://img.shields.io/badge/React-18.0-blue)
![Docker](https://img.shields.io/badge/Docker-Enabled-blue)

TaskFlow is a high-performance, real-time collaboration tool inspired by Trello. It enables teams to organize tasks visually, communicate instantly, and track progress effortlessly.

---

## Key Features

*   **Real-Time Collaboration**: Instant updates across all clients using Socket.IO & Redis.
*   **Kanban Board**: Smooth drag-and-drop interface powered by `@dnd-kit`.
*   **Robust Security**: JWT authentication, encrypted passwords, and secure headers.
*   **Activity Logging**: Complete audit trail for every action (create, move, edit, delete).
*   **Scalable Architecture**: Built with modular NestJS and containerized services.

---

## Documentation & Deliverables

Please find the detailed documentation for all requested deliverables in the `docs` folder:

| Deliverable | Document |
|:------------|:---------|
| **Frontend Architecture** | [Frontend Architecture](docs/ARCHITECTURE.md#frontend-architecture) |
| **Backend Architecture** | [Backend Architecture](docs/ARCHITECTURE.md#backend-architecture) |
| **Database Schema** | [Database Schema Diagram](docs/DATABASE_SCHEMA.md) |
| **API Contract** | [API Documentation](docs/API_DOCUMENTATION.md) |
| **Real-time Strategy** | [Real-time Sync Strategy](docs/REALTIME_SYNC.md) |
| **Scalability** | [Scalability Considerations](docs/SCALABILITY.md) |
| **Assumptions & Trade-offs** | [Assumptions and Trade-offs](docs/ASSUMPTIONS_AND_TRADEOFFS.md) |

---

## Demo Credentials

The database is automatically seeded with these users:

| Role | Email | Password |
|:-----|:------|:---------|
| **User 1** | `stark@demo.com` | `password123` |
| **User 2** | `steve@demo.com` | `password123` |
| **User 3** | `peter@demo.com` | `password123` |

*Note: You can login with different browsers/incognito windows to test real-time collaboration.*

---

## Setup Instructions

### Prerequisites
*   **Docker & Docker Compose** (Recommended)
*   OR Node.js 18+ and PostgreSQL (for local manual setup)

### Option 1: Docker (Recommended)

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd TaskFlow
    ```

2.  **Start the application**
    ```bash
    docker-compose up -d --build
    ```
    *This starts Postgres, Redis, Backend (API), and Frontend (Nginx).
    *   **Frontend**: http://localhost:80
    *   **Backend API**: http://localhost:3000

### Option 2: Local Development

If you want to run without Docker:

**Backend:**
```bash
cd backend
npm install
# Ensure you have a Postgres database running and update .env
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## Tech Stack

### Backend
*   **Framework**: NestJS (Node.js)
*   **Database**: PostgreSQL with Prisma ORM
*   **Real-time**: Socket.IO with Redis Adapter
*   **Validation**: class-validator
*   **Testing**: Jest

### Frontend
*   **Framework**: React (Vite)
*   **Styling**: TailwindCSS
*   **State**: React Query (Server) + Zustand (Client)
*   **Drag & Drop**: @dnd-kit

### Infrastructure
*   **Containerization**: Docker & Docker Compose
*   **IaC**: Terraform (AWS) - *See `terraform/` folder*
*   **Hosting**: AWS EC2 / VPS ready
