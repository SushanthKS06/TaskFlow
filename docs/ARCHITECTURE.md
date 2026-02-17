# Architecture Overview

## System Architecture

```
┌──────────────────────────┐       ┌───────────────────────────────┐       ┌────────────────┐
│       Frontend           │       │       Backend (NestJS)        │       │   PostgreSQL   │
│   React 18 + TypeScript  │◀─────▶│   REST API + Socket.IO       │◀─────▶│   (Prisma ORM) │
│   Vite + TailwindCSS     │       │   Port 3000                  │       │   Port 5432    │
│   Port 80 (Docker)       │       │                              │       │                │
└──────────────────────────┘       └───────────────────────────────┘       └────────────────┘
        │                                    │                                     
        │  WebSocket (Socket.IO)             │                                     
        │◀───────────────────────────────────┘                                     
        │   Real-time board events                      ┌────────────────┐
        │                                               │     Redis      │
        └───────────────────────────────────────────────▶│  Socket.IO     │
                                                        │  Adapter       │
                                                        └────────────────┘
```

---

## Frontend Architecture

### Tech Stack
| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework with hooks and functional components |
| **TypeScript** | Type safety across the entire frontend |
| **Vite** | Fast build tool with HMR for development |
| **TailwindCSS** | Utility-first CSS framework for rapid, consistent styling |
| **React Query (TanStack)** | Server state management, caching, background refetch |
| **Zustand** | Lightweight client-side state management (auth, UI) |
| **dnd-kit** | Accessible drag-and-drop for task reordering |
| **Socket.IO Client** | Real-time WebSocket communication |
| **Axios** | HTTP client with interceptors for JWT |
| **React Router v6** | Client-side routing with protected routes |
| **Lucide React** | Beautiful, consistent icon library |

### State Management Strategy

```
┌─────────────────────────────────────────────────────────┐
│                   State Architecture                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────┐     ┌────────────────────────┐     │
│  │   Zustand Store │     │   React Query Cache    │     │
│  │                 │     │                        │     │
│  │  • Auth tokens  │     │  • Boards list         │     │
│  │  • Current user │     │  • Board detail + data │     │
│  │  • UI toggles   │     │  • Activity logs       │     │
│  │                 │     │  • Search results      │     │
│  └────────┬────────┘     └────────────┬───────────┘     │
│           │                           │                 │
│           │       ┌───────────────────┘                 │
│           ▼       ▼                                     │
│  ┌────────────────────────────────────────┐             │
│  │         Socket.IO Events               │             │
│  │  • On event → invalidate React Query   │             │
│  │  • Auto-refetch with fresh server data │             │
│  └────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────┘
```

**Why this approach:**
- **React Query** handles all server state — no manual fetching, caching, or synchronization logic
- **Zustand** is used only for client state (auth tokens, UI flags) — minimal boilerplate
- **Socket.IO events** trigger React Query cache invalidation, ensuring the UI always reflects the latest server state without polling

### Component Architecture

```
App.tsx
├── AuthGuard (Protected Route Wrapper)
│   ├── DashboardPage
│   │   ├── BoardCard (create, delete, navigate)
│   │   └── CreateBoardDialog
│   │
│   └── BoardDetailPage
│       ├── DndContext (drag-and-drop wrapper)
│       │   ├── ListColumn[] (droppable zones)
│       │   │   ├── TaskCard[] (draggable items)
│       │   │   │   ├── Priority Badge
│       │   │   │   ├── Assignee Avatar
│       │   │   │   ├── Inline Edit Mode
│       │   │   │   └── Assign Popover (Portal)
│       │   │   └── Add Task Form
│       │   └── Add List Button
│       │
│       ├── ActivityPanel (right sidebar)
│       ├── SearchPanel (right sidebar)
│       └── AddMemberDialog (modal)
│
├── LoginPage
└── SignupPage
```

### API Layer

The API layer uses a centralized Axios instance with interceptors:

1. **Request Interceptor** — Attaches JWT `Authorization` header to every request
2. **Response Interceptor** — On 401, attempts token refresh via `/auth/refresh`; if refresh fails, logs user out
3. **React Query Hooks** — Each API endpoint is wrapped in a custom hook (`useBoards`, `useBoard`, `useCreateTask`, etc.) providing loading, error, and success states

### Routing

| Route | Component | Auth Required |
|-------|-----------|:------------:|
| `/login` | LoginPage | ❌ |
| `/signup` | SignupPage | ❌ |
| `/` | DashboardPage | ✅ |
| `/board/:boardId` | BoardDetailPage | ✅ |

---

## Backend Architecture

### Tech Stack
| Technology | Purpose |
|------------|---------|
| **NestJS 10** | Modular, enterprise-grade Node.js framework |
| **TypeScript** | Full type safety |
| **Prisma 5** | Type-safe ORM with auto-generated client |
| **PostgreSQL 16** | Relational database |
| **Socket.IO 4** | Real-time bidirectional communication |
| **Redis** | Socket.IO adapter for horizontal scaling |
| **JWT (jsonwebtoken)** | Stateless authentication |
| **bcrypt** | Password hashing (12 salt rounds) |
| **Passport.js** | Authentication middleware with JWT strategy |
| **class-validator** | DTO validation decorators |

### Module Architecture

```
AppModule
├── ConfigModule          (Global environment configuration)
├── PrismaModule          (Database client, global singleton)
├── AuthModule            (Signup, Login, Token Refresh, JWT Strategy)
│   ├── AuthController
│   ├── AuthService
│   └── JwtStrategy (Passport)
├── UsersModule           (User profile, search)
│   ├── UsersController
│   └── UsersService
├── BoardsModule          (Board CRUD, member management)
│   ├── BoardsController
│   └── BoardsService
├── ListsModule           (List CRUD, reordering)
│   ├── ListsController
│   └── ListsService
├── TasksModule           (Task CRUD, move, assign, search)
│   ├── TasksController
│   └── TasksService
├── ActivityModule        (Activity history per board)
│   ├── ActivityController
│   └── ActivityService
└── EventsModule          (WebSocket gateway)
    └── EventsGateway
```

### Request Flow

```
Client Request
     │
     ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│   NestJS     │────▶│  JWT Guard   │────▶│  Controller │────▶│   Service    │
│   Middleware │     │  (Passport)  │     │  (Routing)  │     │  (Business   │
│   (CORS,     │     │              │     │             │     │   Logic)     │
│    Validation)│     └──────────────┘     └─────────────┘     └──────┬───────┘
└─────────────┘                                                       │
                                                                      ▼
┌──────────────┐     ┌──────────────┐                        ┌──────────────┐
│  Socket.IO   │◀────│  Activity    │◀───────────────────────│   Prisma     │
│  Gateway     │     │  Service     │                        │   (Database) │
│  (Broadcast) │     │  (Logging)   │                        └──────────────┘
└──────────────┘     └──────────────┘
```

### Authentication Flow

```
┌──────────┐                    ┌───────────┐                    ┌──────────┐
│  Client  │                    │  Backend  │                    │    DB    │
└────┬─────┘                    └─────┬─────┘                    └────┬─────┘
     │  POST /auth/signup             │                               │
     │  {name, email, password}       │                               │
     │───────────────────────────────▶│  bcrypt.hash(password, 12)    │
     │                                │───────────────────────────────▶│
     │                                │◀───────────────────────────── │
     │◀──────────────────────────────│  Redirect to /login           │
     │                                │                               │
     │  POST /auth/login              │                               │
     │  {email, password}             │                               │
     │───────────────────────────────▶│  bcrypt.compare()             │
     │                                │  JWT sign (15min access)      │
     │                                │  JWT sign (7d refresh)        │
     │◀──────────────────────────────│  {user, accessToken, refresh} │
     │                                │                               │
     │  GET /api/* (with Bearer)      │                               │
     │───────────────────────────────▶│  JWT verify → extract userId  │
     │                                │───────────────────────────────▶│
     │◀──────────────────────────────│◀──────────────────────────────│
     │                                │                               │
     │  POST /auth/refresh            │                               │
     │  {refreshToken}                │                               │
     │───────────────────────────────▶│  Verify refresh token         │
     │◀──────────────────────────────│  Issue new access + refresh   │
```

### Error Handling

All controllers use NestJS exception filters. Services throw typed HTTP exceptions:
- `400 BadRequestException` — Invalid input
- `401 UnauthorizedException` — Missing/invalid JWT
- `403 ForbiddenException` — User lacks permission
- `404 NotFoundException` — Resource not found
- `409 ConflictException` — Duplicate resource (e.g., email already registered)
