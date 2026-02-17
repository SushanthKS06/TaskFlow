# Scalability Considerations

## Current Architecture

TaskFlow is built with scalability in mind from day one, even though it currently runs as a single instance.

---

## Horizontal Scaling

### Backend Statelessness
The NestJS backend is **completely stateless**:
- Authentication uses JWT — no server-side session storage
- No in-memory caches that would be lost across instances
- All state lives in PostgreSQL and Redis

This means you can run **multiple backend instances** behind a load balancer:

```
                    ┌──────────────┐
                    │ Load Balancer│
                    │  (nginx)     │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Backend 1│ │ Backend 2│ │ Backend 3│
        │  (3000)  │ │  (3001)  │ │  (3002)  │
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │            │            │
             └────────────┼────────────┘
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
        ┌──────────┐          ┌──────────┐
        │ PostgreSQL│          │   Redis  │
        │  (5432)  │          │  (6379)  │
        └──────────┘          └──────────┘
```

### Socket.IO with Redis Adapter
The most critical scaling challenge is WebSocket connections. Socket.IO uses the **Redis Adapter** (`@socket.io/redis-adapter`):

- When Instance 1 emits a board event, Redis Pub/Sub broadcasts it to Instance 2 and 3
- Clients connected to any instance receive the event
- No session affinity (sticky sessions) required for the REST API

```typescript
// Already implemented in redis-io.adapter.ts
import { createAdapter } from '@socket.io/redis-adapter';
const pubClient = createClient({ url: REDIS_URL });
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));
```

---

## Database Scaling

### Indexing Strategy
All frequently queried columns have dedicated indexes:

| Query Pattern | Index |
|---------------|-------|
| Login by email | `User.email` (unique) |
| Boards by owner | `Board.ownerId` |
| Members of a board | `BoardMember.boardId` |
| Lists in position order | `List.(boardId, position)` |
| Tasks in position order | `Task.(listId, position)` |
| Activity newest first | `ActivityLog.(boardId, createdAt)` |

### Float-Based Positioning
Instead of integer positions that require reindexing:

```
Traditional (integer):          Float-based:
  Insert at pos 2:               Insert between 1024 and 2048:
  → Update pos 2→3, 3→4, 4→5    → New pos = 1536
  → N rows updated               → 1 row updated
```

This reduces database writes from O(n) to O(1) for drag-and-drop operations.

### Connection Pooling
For high throughput, add **PgBouncer** between the application and PostgreSQL:
- Limits connection overhead
- Supports thousands of concurrent queries with a small pool
- Transparent to the application (just change `DATABASE_URL`)

### Read Replicas
For read-heavy workloads:
- Route GET requests to PostgreSQL read replicas
- Keep writes on the primary
- Prisma supports this via `$extends` or connection URL routing

---

## Caching Strategy

### Server-Side (Redis)
- Board data can be cached in Redis with TTL-based invalidation
- Cache invalidated on any mutation (create/update/delete operations)
- Activity logs are append-only — cache-friendly

### Client-Side (React Query)
- **Stale time:** 30 seconds — data is served instantly from cache, refetched in background
- **Socket events** trigger immediate cache invalidation for real-time feel
- **Garbage collection:** Unused queries are garbage collected after 5 minutes

```
┌─────────┐  Request  ┌───────────────┐  Cache Miss  ┌──────────┐
│ Component│──────────▶│ React Query   │─────────────▶│ API Call │
│          │◀──────────│ Cache (30s)   │◀─────────────│          │
└─────────┘  Instant   └───────┬───────┘  Fresh data  └──────────┘
                               │
                        Socket event
                        → invalidate
                        → refetch
```

---

## Event Consistency

### Activity Logs
- Written in the **same database transaction** as the mutation
- Not in socket handlers (which are unreliable)
- Guarantees: if the task was created, the log exists

### Socket Events
- Fire-and-forget — optimized for speed, not guaranteed delivery
- If a client misses an event (network blip), React Query's stale-while-revalidate picks up changes on the next auto-refetch cycle
- Source of truth is always the database, never the socket payload

### Optimistic Updates
- Drag-and-drop uses DnD Kit's visual transform — UI updates instantly
- React Query mutation callbacks handle rollback if the server rejects the change
- This eliminates perceived latency for the user

---

## Performance Optimizations

| Area | Optimization |
|------|-------------|
| **Queries** | Prisma's `select` and `include` to fetch only needed fields |
| **Pagination** | Offset-based pagination for activity logs and search results |
| **Batch Operations** | `createMany` for seeding and bulk operations |
| **Lazy Loading** | Activity and search panels load data only when opened |
| **Bundle Size** | Vite tree-shaking, code splitting by route |
| **Static Assets** | Frontend served via nginx with gzip compression in Docker |

---

## Future Scaling Considerations

| Challenge | Solution |
|-----------|----------|
| Very large boards (1000+ tasks) | Virtual scrolling (react-window), cursor-based pagination |
| Global distribution | Multi-region PostgreSQL (CockroachDB/Citus), regional Redis |
| High write throughput | Event sourcing with CQRS pattern |
| File attachments | S3/R2 with pre-signed URLs |
| Rate limiting | NestJS `@nestjs/throttler` guards |
| Monitoring | OpenTelemetry + Grafana/Prometheus for metrics |
