# API Contract Design

**Base URL:** `http://localhost:3000/api`

All protected endpoints require: `Authorization: Bearer <accessToken>`

---

## Authentication

### POST `/auth/signup`
Create a new user account.

**Request:**
```json
{
  "name": "Stark",
  "email": "stark@demo.com",
  "password": "password123"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "name": "Stark",
    "email": "stark@demo.com"
  },
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG..."
}
```

**Errors:** `409 Conflict` — Email already registered

---

### POST `/auth/login`
Authenticate and receive tokens.

**Request:**
```json
{
  "email": "stark@demo.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "name": "Stark",
    "email": "stark@demo.com"
  },
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG..."
}
```

**Errors:** `401 Unauthorized` — Invalid credentials

---

### POST `/auth/refresh`
Refresh an expired access token.

**Request:**
```json
{
  "refreshToken": "eyJhbG..."
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG..."
}
```

---

## Boards 🔒

### GET `/boards`
List all boards the authenticated user is a member of.

**Response (200):**
```json
[
  {
    "id": "uuid",
    "title": "Project Alpha",
    "description": "Main project board",
    "ownerId": "uuid",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "members": [
      { "id": "uuid", "role": "owner", "user": { "id": "uuid", "name": "Stark" } }
    ],
    "_count": { "lists": 3 }
  }
]
```

### POST `/boards`
Create a new board. The creator becomes the owner.

**Request:**
```json
{
  "title": "New Board",
  "description": "Optional description"
}
```

**Response (201):** Board object with members array

### GET `/boards/:id`
Get a board with all lists, tasks, and members.

**Response (200):**
```json
{
  "id": "uuid",
  "title": "Project Alpha",
  "members": [...],
  "lists": [
    {
      "id": "uuid",
      "title": "To Do",
      "position": 1024,
      "tasks": [
        {
          "id": "uuid",
          "title": "Implement feature",
          "description": "...",
          "position": 1024,
          "priority": "high",
          "assignee": { "id": "uuid", "name": "Steve" },
          "creator": { "id": "uuid", "name": "Stark" }
        }
      ]
    }
  ]
}
```

### PUT `/boards/:id`
Update board title or description.

**Request:**
```json
{
  "title": "Updated Title",
  "description": "Updated description"
}
```

### DELETE `/boards/:id`
Delete a board (owner only). Cascades to all lists, tasks, and activity.

**Errors:** `403 Forbidden` — Not the board owner

### POST `/boards/:id/members`
Add a member to the board.

**Request:**
```json
{
  "email": "steve@demo.com"
}
```

**Errors:** `404 Not Found` — User not found, `409 Conflict` — Already a member

### DELETE `/boards/:id/members/:userId`
Remove a member from the board.

---

## Lists 🔒

### POST `/lists`
Create a new list in a board.

**Request:**
```json
{
  "title": "In Progress",
  "boardId": "uuid"
}
```

### PUT `/lists/:id`
Update list title.

**Request:**
```json
{
  "title": "Updated Title",
  "boardId": "uuid"
}
```

### PUT `/lists/:id/reorder`
Change a list's position.

**Request:**
```json
{
  "position": 2048,
  "boardId": "uuid"
}
```

### DELETE `/lists/:id`
Delete a list and all its tasks.

**Query:** `?boardId=uuid`

---

## Tasks 🔒

### POST `/tasks`
Create a new task.

**Request:**
```json
{
  "title": "New Task",
  "description": "Optional description",
  "priority": "high",
  "listId": "uuid",
  "boardId": "uuid"
}
```

### GET `/tasks/:id`
Get a single task with assignee and creator.

### PUT `/tasks/:id`
Update task fields.

**Request:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "priority": "urgent",
  "boardId": "uuid"
}
```

### PUT `/tasks/:id/move`
Move a task to a different list and/or position.

**Request:**
```json
{
  "targetListId": "uuid",
  "position": 1536,
  "boardId": "uuid"
}
```

### PUT `/tasks/:id/assign`
Assign or unassign a user.

**Request:**
```json
{
  "assigneeId": "uuid or null",
  "boardId": "uuid"
}
```

### DELETE `/tasks/:id`
Delete a task.

**Query:** `?boardId=uuid`

### GET `/tasks/search/:boardId`
Search tasks by title or description.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `q` | string | `""` | Search query |
| `page` | number | `1` | Page number |
| `limit` | number | `20` | Results per page |

**Response (200):**
```json
{
  "tasks": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

---

## Activity 🔒

### GET `/activity/:boardId`
Get paginated activity log for a board.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | `1` | Page number |
| `limit` | number | `20` | Entries per page |

**Response (200):**
```json
{
  "activities": [
    {
      "id": "uuid",
      "action": "TASK_CREATED",
      "entityType": "task",
      "entityId": "uuid",
      "details": "{\"title\": \"New Task\"}",
      "user": { "id": "uuid", "name": "Stark" },
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "totalPages": 1
  }
}
```

---

## Users 🔒

### GET `/users/search?q=query`
Search users by name or email.

**Response (200):**
```json
[
  {
    "id": "uuid",
    "name": "Steve",
    "email": "steve@demo.com"
  }
]
```

---

## Error Response Format

All errors follow a consistent format:

```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

| Status Code | Meaning |
|-------------|---------|
| `400` | Bad Request — Validation error |
| `401` | Unauthorized — Missing/invalid token |
| `403` | Forbidden — Insufficient permissions |
| `404` | Not Found — Resource doesn't exist |
| `409` | Conflict — Duplicate resource |
| `500` | Internal Server Error |
