import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { PrismaService } from '../prisma/prisma.service';
import { BoardsService } from '../boards/boards.service';
import { EventsGateway } from '../events/events.gateway';
import { NotFoundException } from '@nestjs/common';

describe('TasksService', () => {
    let service: TasksService;

    const mockPrisma: any = {
        $transaction: jest.fn((fn: any) => fn(mockPrisma)),
        task: {
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
        },
        list: {
            findUnique: jest.fn(),
        },
        activityLog: {
            create: jest.fn(),
        },
    };

    const mockBoardsService = {
        verifyMembership: jest.fn(),
    };

    const mockEventsGateway = {
        emitToBoard: jest.fn(),
        emitToBoardExcept: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TasksService,
                { provide: PrismaService, useValue: mockPrisma },
                { provide: BoardsService, useValue: mockBoardsService },
                { provide: EventsGateway, useValue: mockEventsGateway },
            ],
        }).compile();

        service = module.get<TasksService>(TasksService);
        jest.clearAllMocks();
        mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockPrisma));
    });

    describe('create', () => {
        it('should create a task with correct position and emit event', async () => {
            const mockList = { id: 'list-1', boardId: 'board-1' };
            mockPrisma.list.findUnique.mockResolvedValue(mockList);
            mockBoardsService.verifyMembership.mockResolvedValue({});
            mockPrisma.task.findFirst.mockResolvedValue(null); // No existing tasks
            const mockTask = {
                id: 'task-1', title: 'New Task', position: 1024, listId: 'list-1',
                creator: { id: 'user-1', name: 'Test' },
                assignee: null,
            };
            mockPrisma.task.create.mockResolvedValue(mockTask);
            mockPrisma.activityLog.create.mockResolvedValue({});

            const result = await service.create(
                { title: 'New Task', listId: 'list-1' },
                'user-1',
            );

            expect(result.title).toBe('New Task');
            expect(result.boardId).toBe('board-1');
            expect(mockEventsGateway.emitToBoardExcept).toHaveBeenCalledWith(
                'board-1', 'task:created', expect.objectContaining({ boardId: 'board-1' }), 'user-1',
            );
        });

        it('should position task after last existing task', async () => {
            mockPrisma.list.findUnique.mockResolvedValue({ id: 'list-1', boardId: 'board-1' });
            mockBoardsService.verifyMembership.mockResolvedValue({});
            mockPrisma.task.findFirst.mockResolvedValue({ position: 2048 });
            mockPrisma.task.create.mockResolvedValue({ id: 'task-2', position: 3072 });
            mockPrisma.activityLog.create.mockResolvedValue({});

            await service.create({ title: 'Second Task', listId: 'list-1' }, 'user-1');

            expect(mockPrisma.task.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ position: 3072 }),
                }),
            );
        });

        it('should throw NotFoundException for non-existent list', async () => {
            mockPrisma.list.findUnique.mockResolvedValue(null);

            await expect(service.create(
                { title: 'Task', listId: 'non-existent' },
                'user-1',
            )).rejects.toThrow(NotFoundException);
        });
    });

    describe('findOne', () => {
        it('should return task with relations', async () => {
            const mockTask = {
                id: 'task-1', title: 'Test',
                assignee: { id: 'user-1' },
                creator: { id: 'user-2' },
                list: { id: 'list-1', title: 'Todo', boardId: 'board-1' },
            };
            mockPrisma.task.findUnique.mockResolvedValue(mockTask);

            const result = await service.findOne('task-1');
            expect(result.title).toBe('Test');
            expect(result.list.boardId).toBe('board-1');
        });

        it('should throw NotFoundException for non-existent task', async () => {
            mockPrisma.task.findUnique.mockResolvedValue(null);

            await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('move', () => {
        it('should move task to target list and emit event', async () => {
            mockPrisma.task.findUnique.mockResolvedValue({
                id: 'task-1', listId: 'list-1', title: 'Task',
                list: { boardId: 'board-1' },
            });
            mockBoardsService.verifyMembership.mockResolvedValue({});
            mockPrisma.list.findUnique.mockResolvedValue({ id: 'list-2' });
            const movedTask = { id: 'task-1', listId: 'list-2', position: 512 };
            mockPrisma.task.update.mockResolvedValue(movedTask);
            mockPrisma.activityLog.create.mockResolvedValue({});

            const result = await service.move(
                'task-1',
                { targetListId: 'list-2', position: 512 },
                'user-1',
            );

            expect(result.boardId).toBe('board-1');
            expect(mockEventsGateway.emitToBoardExcept).toHaveBeenCalledWith(
                'board-1', 'task:moved', expect.anything(), 'user-1',
            );
        });

        it('should throw NotFoundException for non-existent target list', async () => {
            mockPrisma.task.findUnique.mockResolvedValue({
                id: 'task-1', list: { boardId: 'board-1' },
            });
            mockBoardsService.verifyMembership.mockResolvedValue({});
            mockPrisma.list.findUnique.mockResolvedValue(null);

            await expect(service.move(
                'task-1',
                { targetListId: 'non-existent', position: 512 },
                'user-1',
            )).rejects.toThrow(NotFoundException);
        });
    });

    describe('assign', () => {
        it('should assign user to task and emit event', async () => {
            mockPrisma.task.findUnique.mockResolvedValue({
                id: 'task-1', list: { boardId: 'board-1' },
            });
            mockBoardsService.verifyMembership.mockResolvedValue({});
            mockPrisma.task.update.mockResolvedValue({
                id: 'task-1',
                assignee: { id: 'user-2', name: 'Assignee' },
            });
            mockPrisma.activityLog.create.mockResolvedValue({});

            const result = await service.assign('task-1', { assigneeId: 'user-2' }, 'user-1');

            expect(mockEventsGateway.emitToBoardExcept).toHaveBeenCalledWith(
                'board-1', 'task:assigned', expect.anything(), 'user-1',
            );
        });

        it('should unassign when assigneeId is null', async () => {
            mockPrisma.task.findUnique.mockResolvedValue({
                id: 'task-1', list: { boardId: 'board-1' },
            });
            mockBoardsService.verifyMembership.mockResolvedValue({});
            mockPrisma.task.update.mockResolvedValue({ id: 'task-1', assignee: null });
            mockPrisma.activityLog.create.mockResolvedValue({});

            await service.assign('task-1', { assigneeId: undefined }, 'user-1');

            expect(mockPrisma.task.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: { assigneeId: null },
                }),
            );
        });
    });

    describe('delete', () => {
        it('should log activity BEFORE deleting and emit event', async () => {
            mockPrisma.task.findUnique.mockResolvedValue({
                id: 'task-1', title: 'Delete Me', listId: 'list-1',
                list: { boardId: 'board-1' },
            });
            mockBoardsService.verifyMembership.mockResolvedValue({});
            mockPrisma.activityLog.create.mockResolvedValue({});
            mockPrisma.task.delete.mockResolvedValue({});

            const callOrder: string[] = [];
            mockPrisma.activityLog.create.mockImplementation(() => {
                callOrder.push('log');
                return Promise.resolve({});
            });
            mockPrisma.task.delete.mockImplementation(() => {
                callOrder.push('delete');
                return Promise.resolve({});
            });

            const result = await service.delete('task-1', 'user-1');

            expect(callOrder).toEqual(['log', 'delete']); // Log BEFORE delete
            expect(result.taskId).toBe('task-1');
            expect(mockEventsGateway.emitToBoardExcept).toHaveBeenCalledWith(
                'board-1', 'task:deleted', expect.objectContaining({ taskId: 'task-1' }), 'user-1',
            );
        });
    });

    describe('search', () => {
        it('should return paginated search results', async () => {
            mockBoardsService.verifyMembership.mockResolvedValue({});
            mockPrisma.task.findMany.mockResolvedValue([{ id: 'task-1', title: 'Match' }]);
            mockPrisma.task.count.mockResolvedValue(1);

            const result = await service.search('board-1', 'match', 'user-1', 1, 20);

            expect(result.tasks).toHaveLength(1);
            expect(result.pagination.total).toBe(1);
            expect(result.pagination.totalPages).toBe(1);
        });

        it('should handle empty search results', async () => {
            mockBoardsService.verifyMembership.mockResolvedValue({});
            mockPrisma.task.findMany.mockResolvedValue([]);
            mockPrisma.task.count.mockResolvedValue(0);

            const result = await service.search('board-1', 'nope', 'user-1');

            expect(result.tasks).toHaveLength(0);
            expect(result.pagination.total).toBe(0);
        });
    });
});
