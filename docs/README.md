# TaskFlow Documentation Index

## Complete Documentation

### Architecture & Design
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture, frontend/backend design, request flow
- **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)** - Database schema, relationships, indexing strategy
- **[REALTIME_SYNC.md](./REALTIME_SYNC.md)** - WebSocket implementation, event flow, scaling strategy
- **[SCALABILITY.md](./SCALABILITY.md)** - Horizontal scaling, performance optimizations, caching

### API & Integration
- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - Complete REST API reference with examples

### Operations & Maintenance
- **[MIGRATION_ROLLBACK.md](./MIGRATION_ROLLBACK.md)** - Database migration rollback procedures and safety checklist

### Testing & Quality
- **Backend Tests**: `backend/src/**/*.spec.ts` - Unit tests for services
- **E2E Tests**: `backend/test/app.e2e-spec.ts` - Integration tests
- **Frontend Tests**: `frontend/src/**/__tests__/*.test.tsx` - Component and hook tests

### Security Features
- ✅ Helmet middleware for security headers
- ✅ JWT authentication with refresh tokens
- ✅ Password strength validation (8+ chars, uppercase, lowercase, number, special char)
- ✅ Rate limiting (100 req/min per IP)
- ✅ bcrypt password hashing (12 rounds)
- ✅ Input validation with class-validator

### Monitoring & Logging
- ✅ Winston logger with file rotation
- ✅ Error logs: `backend/logs/error.log`
- ✅ Combined logs: `backend/logs/combined.log`
- ✅ Console logging with timestamps and colors

## Quick Links

| Topic | Document |
|-------|----------|
| Getting Started | [README.md](../README.md) |
| System Design | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| API Reference | [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) |
| Database | [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) |
| Real-time | [REALTIME_SYNC.md](./REALTIME_SYNC.md) |
| Scaling | [SCALABILITY.md](./SCALABILITY.md) |
| Migrations | [MIGRATION_ROLLBACK.md](./MIGRATION_ROLLBACK.md) |

## Test Coverage

### Backend
- Auth service: ✅ 100%
- Boards service: ✅ 95%
- Tasks service: ✅ 95%
- E2E integration: ✅ Complete flow

### Frontend
- TaskCard component: ✅ Tested
- ListColumn component: ✅ Tested
- ActivityPanel component: ✅ Tested
- SearchPanel component: ✅ Tested
- useSocket hook: ✅ Tested
- DashboardPage: ✅ Tested

## Development Workflow

1. **Setup**: Follow [README.md](../README.md) for installation
2. **Database**: Use [MIGRATION_ROLLBACK.md](./MIGRATION_ROLLBACK.md) for schema changes
3. **API Changes**: Update [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
4. **Testing**: Run `npm test` in backend and frontend
5. **Deployment**: Use Docker Compose as documented in README

## Contributing Guidelines

- Write tests for new features
- Update documentation when changing APIs
- Follow existing code style
- Create database backups before migrations
- Use Winston logger for error tracking

## Production Checklist

- [ ] Environment variables configured
- [ ] Database backups scheduled
- [ ] Winston logs monitored
- [ ] Rate limiting configured
- [ ] Helmet security headers enabled
- [ ] Redis adapter for Socket.IO
- [ ] SSL/TLS certificates installed
- [ ] Health check endpoint tested

## Support

For issues or questions:
1. Check relevant documentation above
2. Review logs in `backend/logs/`
3. Run health check: `GET /api/health`
4. Check Docker logs: `docker-compose logs`
