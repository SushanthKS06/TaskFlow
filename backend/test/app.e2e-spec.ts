import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * E2E Integration Tests for the TaskFlow API.
 *
 * These tests spin up the full NestJS application and test HTTP endpoints
 * end-to-end using supertest. They require a running PostgreSQL database.
 *
 * Run with: npm run test:e2e
 *
 * NOTE: These tests use the real database configured in .env.
 * For CI, set DATABASE_URL to a dedicated test database.
 */
describe('TaskFlow API (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let accessToken: string;
    let refreshToken: string;
    let userId: string;
    let boardId: string;
    let listId: string;
    let secondListId: string;
    let taskId: string;

    const testUser = {
        name: 'E2E Test User',
        email: `e2e-test-${Date.now()}@test.com`,
        password: 'TestPassword123!',
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.setGlobalPrefix('api');
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
        await app.init();

        prisma = app.get(PrismaService);
    });

    afterAll(async () => {
        // Clean up test data
        if (userId) {
            try {
                await prisma.user.delete({ where: { id: userId } });
            } catch {
                // User may have been deleted via cascade
            }
        }
        await app.close();
    });

    // ─── AUTH TESTS ─────────────────────────────────────────────────────

    describe('POST /api/auth/signup', () => {
        it('should create a new user and return tokens', () => {
            return request(app.getHttpServer())
                .post('/api/auth/signup')
                .send(testUser)
                .expect(201)
                .expect((res) => {
                    expect(res.body).toHaveProperty('accessToken');
                    expect(res.body).toHaveProperty('refreshToken');
                    expect(res.body.user).toHaveProperty('id');
                    expect(res.body.user.email).toBe(testUser.email);
                    expect(res.body.user).not.toHaveProperty('password');
                    accessToken = res.body.accessToken;
                    refreshToken = res.body.refreshToken;
                    userId = res.body.user.id;
                });
        });

        it('should reject duplicate email', () => {
            return request(app.getHttpServer())
                .post('/api/auth/signup')
                .send(testUser)
                .expect(409);
        });

        it('should reject invalid email format', () => {
            return request(app.getHttpServer())
                .post('/api/auth/signup')
                .send({ name: 'Test', email: 'not-an-email', password: 'pass123' })
                .expect(400);
        });
    });

    describe('POST /api/auth/login', () => {
        it('should login with valid credentials', () => {
            return request(app.getHttpServer())
                .post('/api/auth/login')
                .send({ email: testUser.email, password: testUser.password })
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('accessToken');
                    expect(res.body).toHaveProperty('refreshToken');
                    accessToken = res.body.accessToken;
                    refreshToken = res.body.refreshToken;
                });
        });

        it('should reject invalid credentials', () => {
            return request(app.getHttpServer())
                .post('/api/auth/login')
                .send({ email: testUser.email, password: 'wrong-password' })
                .expect(401);
        });
    });

    describe('POST /api/auth/refresh', () => {
        it('should return new tokens for valid refresh token', () => {
            return request(app.getHttpServer())
                .post('/api/auth/refresh')
                .send({ refreshToken })
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('accessToken');
                    expect(res.body).toHaveProperty('refreshToken');
                    accessToken = res.body.accessToken;
                    refreshToken = res.body.refreshToken;
                });
        });

        it('should reject invalid refresh token', () => {
            return request(app.getHttpServer())
                .post('/api/auth/refresh')
                .send({ refreshToken: 'invalid-token' })
                .expect(401);
        });
    });

    // ─── BOARDS TESTS ───────────────────────────────────────────────────

    describe('POST /api/boards', () => {
        it('should reject unauthenticated requests', () => {
            return request(app.getHttpServer())
                .post('/api/boards')
                .send({ title: 'Test Board' })
                .expect(401);
        });

        it('should create a board', () => {
            return request(app.getHttpServer())
                .post('/api/boards')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ title: 'E2E Test Board', description: 'Board for integration testing' })
                .expect(201)
                .expect((res) => {
                    expect(res.body).toHaveProperty('id');
                    expect(res.body.title).toBe('E2E Test Board');
                    expect(res.body.ownerId).toBe(userId);
                    expect(res.body.members).toHaveLength(1);
                    expect(res.body.members[0].role).toBe('owner');
                    boardId = res.body.id;
                });
        });
    });

    describe('GET /api/boards', () => {
        it('should return boards for authenticated user', () => {
            return request(app.getHttpServer())
                .get('/api/boards')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200)
                .expect((res) => {
                    expect(Array.isArray(res.body)).toBe(true);
                    expect(res.body.length).toBeGreaterThanOrEqual(1);
                    const board = res.body.find((b: any) => b.id === boardId);
                    expect(board).toBeDefined();
                });
        });
    });

    describe('GET /api/boards/:id', () => {
        it('should return board details with lists and tasks', () => {
            return request(app.getHttpServer())
                .get(`/api/boards/${boardId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body.id).toBe(boardId);
                    expect(res.body).toHaveProperty('lists');
                    expect(res.body).toHaveProperty('members');
                    expect(res.body).toHaveProperty('owner');
                });
        });

        it('should return 404 for non-existent board', () => {
            return request(app.getHttpServer())
                .get('/api/boards/00000000-0000-0000-0000-000000000000')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);
        });
    });

    // ─── LISTS TESTS ────────────────────────────────────────────────────

    describe('POST /api/lists', () => {
        it('should create a list in the board', () => {
            return request(app.getHttpServer())
                .post('/api/lists')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ title: 'To Do', boardId })
                .expect(201)
                .expect((res) => {
                    expect(res.body).toHaveProperty('id');
                    expect(res.body.title).toBe('To Do');
                    expect(res.body.boardId).toBe(boardId);
                    expect(res.body.position).toBe(1024);
                    listId = res.body.id;
                });
        });

        it('should auto-increment position for second list', () => {
            return request(app.getHttpServer())
                .post('/api/lists')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ title: 'In Progress', boardId })
                .expect(201)
                .expect((res) => {
                    expect(res.body.position).toBe(2048);
                    secondListId = res.body.id;
                });
        });
    });

    // ─── TASKS TESTS ────────────────────────────────────────────────────

    describe('POST /api/tasks', () => {
        it('should create a task in the list', () => {
            return request(app.getHttpServer())
                .post('/api/tasks')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ title: 'My First Task', listId, description: 'Testing task creation' })
                .expect(201)
                .expect((res) => {
                    expect(res.body).toHaveProperty('id');
                    expect(res.body.title).toBe('My First Task');
                    expect(res.body.boardId).toBe(boardId);
                    expect(res.body.position).toBe(1024);
                    expect(res.body.priority).toBe('medium');
                    taskId = res.body.id;
                });
        });
    });

    describe('GET /api/tasks/:id', () => {
        it('should return task details', () => {
            return request(app.getHttpServer())
                .get(`/api/tasks/${taskId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body.id).toBe(taskId);
                    expect(res.body.title).toBe('My First Task');
                    expect(res.body).toHaveProperty('creator');
                    expect(res.body).toHaveProperty('list');
                });
        });
    });

    describe('PUT /api/tasks/:id', () => {
        it('should update task title and priority', () => {
            return request(app.getHttpServer())
                .put(`/api/tasks/${taskId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ title: 'Updated Task', priority: 'high' })
                .expect(200)
                .expect((res) => {
                    expect(res.body.title).toBe('Updated Task');
                    expect(res.body.boardId).toBe(boardId);
                });
        });
    });

    describe('PUT /api/tasks/:id/move', () => {
        it('should move task to another list', () => {
            return request(app.getHttpServer())
                .put(`/api/tasks/${taskId}/move`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ targetListId: secondListId, position: 1024 })
                .expect(200)
                .expect((res) => {
                    expect(res.body.boardId).toBe(boardId);
                });
        });
    });

    describe('PUT /api/tasks/:id/assign', () => {
        it('should assign user to task', () => {
            return request(app.getHttpServer())
                .put(`/api/tasks/${taskId}/assign`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ assigneeId: userId })
                .expect(200)
                .expect((res) => {
                    expect(res.body.assignee).toBeDefined();
                    expect(res.body.assignee.id).toBe(userId);
                });
        });

        it('should unassign by sending null', () => {
            return request(app.getHttpServer())
                .put(`/api/tasks/${taskId}/assign`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ assigneeId: null })
                .expect(200)
                .expect((res) => {
                    expect(res.body.assignee).toBeNull();
                });
        });
    });

    describe('GET /api/tasks/search/:boardId', () => {
        it('should find tasks by search query', () => {
            return request(app.getHttpServer())
                .get(`/api/tasks/search/${boardId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .query({ q: 'Updated' })
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('tasks');
                    expect(res.body).toHaveProperty('pagination');
                    expect(res.body.tasks.length).toBeGreaterThanOrEqual(1);
                    expect(res.body.pagination).toHaveProperty('total');
                    expect(res.body.pagination).toHaveProperty('totalPages');
                });
        });

        it('should return empty results for non-matching query', () => {
            return request(app.getHttpServer())
                .get(`/api/tasks/search/${boardId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .query({ q: 'xyznonexistent123' })
                .expect(200)
                .expect((res) => {
                    expect(res.body.tasks).toHaveLength(0);
                    expect(res.body.pagination.total).toBe(0);
                });
        });
    });

    // ─── ACTIVITY TESTS ─────────────────────────────────────────────────

    describe('GET /api/activity/:boardId', () => {
        it('should return activity logs with pagination', () => {
            return request(app.getHttpServer())
                .get(`/api/activity/${boardId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('activities');
                    expect(res.body).toHaveProperty('pagination');
                    expect(Array.isArray(res.body.activities)).toBe(true);
                    expect(res.body.activities.length).toBeGreaterThanOrEqual(4);
                    if (res.body.activities.length > 0) {
                        expect(res.body.activities[0]).toHaveProperty('user');
                        expect(res.body.activities[0]).toHaveProperty('action');
                        expect(res.body.activities[0]).toHaveProperty('createdAt');
                    }
                });
        });
    });

    // ─── CLEANUP TESTS (in reverse order) ───────────────────────────────

    describe('DELETE /api/tasks/:id', () => {
        it('should delete the task', () => {
            return request(app.getHttpServer())
                .delete(`/api/tasks/${taskId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body.message).toBe('Task deleted');
                    expect(res.body.taskId).toBe(taskId);
                });
        });
    });

    describe('DELETE /api/boards/:id', () => {
        it('should delete the board (cascading lists and tasks)', () => {
            return request(app.getHttpServer())
                .delete(`/api/boards/${boardId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body.message).toBe('Board deleted successfully');
                });
        });
    });
});
