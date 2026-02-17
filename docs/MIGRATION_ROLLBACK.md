# Database Migration Rollback Strategy

## Overview
This document outlines the strategy for safely rolling back database migrations in TaskFlow.

## Prisma Migration Commands

### Check Migration Status
```bash
npx prisma migrate status
```

### Rollback Last Migration (Development)
```bash
# Mark migration as rolled back
npx prisma migrate resolve --rolled-back <migration_name>

# Apply previous state
npx prisma migrate dev
```

### Production Rollback Strategy

#### Option 1: Manual Rollback (Recommended)
```bash
# 1. Identify the migration to rollback
npx prisma migrate status

# 2. Create a new migration that reverses changes
npx prisma migrate dev --name rollback_<feature_name>

# 3. Deploy to production
npx prisma migrate deploy
```

#### Option 2: Database Restore
```bash
# 1. Stop the application
docker-compose down

# 2. Restore from backup
pg_restore -h localhost -U postgres -d taskflow backup.sql

# 3. Mark migrations as resolved
npx prisma migrate resolve --applied <migration_name>

# 4. Restart application
docker-compose up -d
```

## Backup Strategy

### Automated Daily Backups
```bash
# Add to crontab
0 2 * * * pg_dump -h localhost -U postgres taskflow > /backups/taskflow_$(date +\%Y\%m\%d).sql
```

### Pre-Migration Backup
```bash
# Always backup before production migration
pg_dump -h localhost -U postgres taskflow > backup_pre_migration_$(date +\%Y\%m\%d_%H\%M\%S).sql
```

## Migration Safety Checklist

- [ ] Test migration in development environment
- [ ] Create database backup before production migration
- [ ] Review migration SQL in `prisma/migrations/`
- [ ] Ensure migration is reversible
- [ ] Document any manual steps required
- [ ] Have rollback plan ready
- [ ] Monitor application after migration

## Common Rollback Scenarios

### 1. Add Column (Safe)
**Forward:**
```prisma
model Task {
  dueDate DateTime?
}
```

**Rollback:**
```prisma
model Task {
  // Remove dueDate field
}
```

### 2. Rename Column (Requires Data Migration)
**Forward:**
```sql
ALTER TABLE "Task" RENAME COLUMN "description" TO "details";
```

**Rollback:**
```sql
ALTER TABLE "Task" RENAME COLUMN "details" TO "description";
```

### 3. Drop Column (Data Loss Risk)
**Forward:**
```sql
ALTER TABLE "Task" DROP COLUMN "oldField";
```

**Rollback:**
```sql
-- Cannot recover dropped data without backup
-- Restore from backup or recreate column
ALTER TABLE "Task" ADD COLUMN "oldField" TEXT;
```

## Emergency Rollback Procedure

1. **Immediate Action**
   ```bash
   # Stop application
   docker-compose down backend
   ```

2. **Assess Damage**
   ```bash
   # Check database state
   psql -h localhost -U postgres taskflow
   \dt  # List tables
   ```

3. **Restore from Backup**
   ```bash
   # Restore latest backup
   pg_restore -h localhost -U postgres -d taskflow /backups/latest.sql
   ```

4. **Mark Migration Status**
   ```bash
   # Mark problematic migration as rolled back
   npx prisma migrate resolve --rolled-back <migration_name>
   ```

5. **Restart Application**
   ```bash
   docker-compose up -d backend
   ```

## Best Practices

1. **Never delete migrations** - They are the history of your schema
2. **Always test in staging** - Catch issues before production
3. **Use transactions** - Prisma migrations are transactional by default
4. **Keep backups** - Maintain at least 7 days of daily backups
5. **Document changes** - Add comments to complex migrations
6. **Monitor after deploy** - Watch logs and metrics for 30 minutes

## Prisma Migrate vs SQL Migrations

### Prisma Migrate (Recommended)
- Automatic schema diffing
- Type-safe migrations
- Rollback via new migrations

### Raw SQL (Advanced)
```bash
# Create empty migration
npx prisma migrate dev --create-only --name custom_migration

# Edit migration file manually
# Then apply
npx prisma migrate dev
```

## Contact & Support

For migration issues:
1. Check logs: `docker-compose logs backend`
2. Review migration files: `prisma/migrations/`
3. Consult Prisma docs: https://www.prisma.io/docs/concepts/components/prisma-migrate

## Version History

- v1.0 (2024) - Initial rollback strategy
