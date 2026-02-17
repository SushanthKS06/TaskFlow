# Real-Time Sync Strategy

## Overview

TaskFlow uses **Socket.IO** for real-time bidirectional communication. When any user modifies a board (creates a task, moves a card, adds a member, etc.), all other users viewing the same board see the changes instantly — without manual refresh.

---

## Architecture

```
┌─────────────┐     WebSocket      ┌──────────────────┐     Redis Adapter     ┌──────────────┐
│  Browser A  │◀───────────────────▶│  EventsGateway   │◀───────────────────▶  │   Redis      │
│  (Board #1) │                     │  (Socket.IO)     │                       │  (Pub/Sub)   │
└─────────────┘                     │                  │                       └──────────────┘
                                    │  Board Rooms:    │
┌─────────────┐     WebSocket      │  • board:abc123  │
│  Browser B  │◀───────────────────▶│  • board:def456  │
│  (Board #1) │                     │                  │
└─────────────┘                     └──────────────────┘
```

---

## Connection Lifecycle

### 1. Authentication
Clients connect with JWT in the handshake:

```typescript
// Frontend: useSocket hook
const socket = io('http://localhost:3000', {
  auth: { token: accessToken }
});
```

The gateway verifies the JWT on connection:
```typescript
// Backend: EventsGateway.handleConnection()
const token = client.handshake.auth?.token;
const payload = this.jwtService.verify(token, { secret });
this.connectedUsers.set(client.id, payload.sub);
```

If the token is invalid, the connection is rejected immediately.

### 2. Join Board Room
When a user navigates to a board, the frontend joins the board's Socket.IO room:

```typescript
// Frontend
socket.emit('join:board', { boardId });

// Backend
client.join(`board:${data.boardId}`);
```

### 3. Leave Board Room
When navigating away from a board:

```typescript
// Frontend (cleanup in useEffect)
socket.emit('leave:board', { boardId });

// Backend
client.leave(`board:${data.boardId}`);
```

---

## Event Flow

When a mutation occurs (e.g., creating a task):

```
┌──────────┐   REST API    ┌───────────┐   Prisma    ┌──────────┐
│  User A  │──────────────▶│  TasksAPI │────────────▶│    DB    │
│ (Browser)│               │  Service  │◀────────────│          │
└──────────┘               └─────┬─────┘             └──────────┘
                                 │
                                 │ 1. Save to DB
                                 │ 2. Log activity
                                 │ 3. Emit socket event
                                 ▼
                          ┌──────────────┐
                          │ EventsGateway│
                          │ .emitToBoard │
                          └──────┬───────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐
              │  User A  │ │  User B  │ │  User C  │
              │ (sender) │ │ (viewer) │ │ (viewer) │
              └──────────┘ └──────────┘ └──────────┘
                                │            │
                                ▼            ▼
                          React Query    React Query
                          invalidation   invalidation
                          → auto refetch → auto refetch
```

---

## Socket Events Reference

### Client → Server Events
| Event | Payload | Description |
|-------|---------|-------------|
| `join:board` | `{ boardId: string }` | Subscribe to board updates |
| `leave:board` | `{ boardId: string }` | Unsubscribe from board updates |

### Server → Client Events
| Event | Payload | Trigger |
|-------|---------|---------|
| `task:created` | Task object | Task is created |
| `task:updated` | Task object | Task title/description/priority changed |
| `task:moved` | Task object | Task moved between lists |
| `task:deleted` | `{ taskId: string }` | Task is deleted |
| `task:assigned` | Task object | Task assignee changed |
| `list:created` | List object | New list created |
| `list:updated` | List object | List renamed |
| `list:deleted` | `{ listId: string }` | List deleted |
| `member:added` | Member object | Member added to board |
| `member:removed` | `{ userId: string }` | Member removed from board |

---

## Frontend Sync Strategy

The frontend uses **React Query cache invalidation** instead of manually merging socket data into state:

```typescript
// useSocket hook
useEffect(() => {
  if (!socket || !boardId) return;

  socket.emit('join:board', { boardId });

  const events = [
    'task:created', 'task:updated', 'task:moved',
    'task:deleted', 'task:assigned',
    'list:created', 'list:updated', 'list:deleted',
    'member:added', 'member:removed'
  ];

  const handler = () => {
    // Invalidate the board query → triggers refetch
    queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    queryClient.invalidateQueries({ queryKey: ['activity', boardId] });
  };

  events.forEach(event => socket.on(event, handler));

  return () => {
    socket.emit('leave:board', { boardId });
    events.forEach(event => socket.off(event, handler));
  };
}, [socket, boardId]);
```

**Why invalidation instead of direct state merge:**
1. **Simplicity** — No complex merge logic needed
2. **Consistency** — Server is always the source of truth
3. **Correctness** — Avoids stale data or race conditions
4. **React Query handles it** — Background refetch with stale-while-revalidate

---

## Scaling with Redis Adapter

For multi-instance deployments, Socket.IO uses the Redis adapter:

```typescript
// redis-io.adapter.ts
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

This ensures events emitted on Instance A are broadcast to clients connected to Instance B via Redis Pub/Sub.

---

## Consistency Guarantees

| Aspect | Strategy |
|--------|----------|
| **Source of Truth** | Always the PostgreSQL database |
| **Event Reliability** | Events are fire-and-forget; if missed, next React Query refetch picks up changes |
| **Ordering** | Activity logs ordered by `createdAt` timestamp |
| **Conflict Resolution** | Last-write-wins — the most recent mutation is the final state |
| **Stale Data** | React Query uses 30s stale time; socket events trigger immediate refetch |
