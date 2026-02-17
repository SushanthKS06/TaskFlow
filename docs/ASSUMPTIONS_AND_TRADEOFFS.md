# Assumptions and Trade-offs

## Assumptions

1.  **Deployment Environment**:
    - We assume the application will be containerized (Docker) for consistency across environments.
    - We assume a managed PostgreSQL and Redis instance will be available in production, though local containers are provided for development.

2.  **User Base**:
    - The initial design targets small to medium-sized teams (10-100 users per board).
    - We assume users have modern browsers with JavaScript enabled (required for React and Drag-and-Drop).

3.  **Data Volume**:
    - We assume reasonable limits on board size (e.g., < 100 lists, < 1000 tasks per board).
    - Archives/History are stored efficiently, but we assume active boards fit in memory for client-side rendering.

4.  **Network**:
    - We assume a reasonably stable internet connection for WebSocket usage. Reconnection logic is handled, but offline-first capabilities are a future enhancement.

---

## Technical Trade-offs

### 1. Float-Based Positioning vs. Integer Positioning
**Decision**: We use floating-point numbers (`65536`, `131072`, etc.) to order lists and tasks.
-   **Pro**: Allows O(1) reordering. Inserting an item between two others is just `(posA + posB) / 2`. No need to update 100+ rows just to move one item.
-   **Con**: Floating point precision limits. After thousands of repetitive insertions in the exact same spot, precision degrades.
-   **Mitigation**: A background job (or check on insert) can "normalize" positions if the gap becomes too small.

### 2. Activity Logging Implementation
**Decision**: Activity logs are written synchronously within the same transaction as the action.
-   **Pro**: Guaranteed consistency. If a task is created, the log entry *must* exist. The audit trail is reliable.
-   **Con**: Slightly increased latency for write operations.
-   **Alternative**: Fire-and-forget logging via message queue would be faster but risks missing logs if the consumer fails. Accuracy was prioritized over micro-optimizations.

### 3. Client-Side State (React Query) vs. Redux
**Decision**: We use React Query (TanStack Query) for server state and minimal Zustand for client state.
-   **Pro**: massively reduces boilerplate. Handling loading/error/success states is built-in. Caching strategy is configurable.
-   **Con**: Less "centralized" control than Redux. Debugging relies on React Query DevTools rather than Redux DevTools.
-   **Verdict**: Net positive for developer velocity and app performance.

### 4. WebSocket (Socket.IO) vs. Polling
**Decision**: Full duplex communication via WebSockets.
-   **Pro**: Instant updates. "It just feels fast."
-   **Con**: Requires maintaining stateful TCP connections. Scaling requires a Redis Adapter (which we implemented). Harder to debug than REST.
-   **Verdict**: Essential for a collaboration tool. The complexity cost is justified by the user experience.

### 5. Single Page Application (SPA) vs. Server Side Rendering (SSR)
**Decision**: Pure React SPA (Vite) instead of Next.js/SSR.
-   **Pro**: Simpler deployment (just static files + Nginx). Highly interactive "app-like" feel.
-   **Con**: Poor SEO (irrelevant for a private dashboard) and slightly slower initial load.
-   **Verdict**: Correct choice for a dashboard application behind authentication.
