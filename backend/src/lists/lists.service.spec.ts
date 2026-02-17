import { Test, TestingModule } from '@nestjs/testing';
import { ListsService } from './lists.service';
import { PrismaService } from '../prisma/prisma.service';
import { BoardsService } from '../boards/boards.service';
import { EventsGateway } from '../events/events.gateway';
import { NotFoundException } from '@nestjs/common';

describe('ListsService', () => {
    let service: ListsService;

    const mockPrisma: any = {
        $transaction: jest.fn((fn: any) => fn(mockPrisma)),
        list: {
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        activityLog: {
            create: jest.fn(),
        },
    };

    const mockBoardsService = {
        verifyMembership: jest.fn(),
    };

    const mockEventsGateway = {
        emitToBoardExcept: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ListsService,
                { provide: PrismaService, useValue: mockPrisma },
                { provide: BoardsService, useValue: mockBoardsService },
                { provide: EventsGateway, useValue: mockEventsGateway },
            ],
        }).compile();

        service = module.get<ListsService>(ListsService);
        jest.clearAllMocks();
        mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockPrisma));
    });

    describe('create', () => {
        it('should create a list with correct position (first list)', async () => {
            mockBoardsService.verifyMembership.mockResolvedValue({});
            mockPrisma.list.findFirst.mockResolvedValue(null);
            const mockList = { id: 'list-1', title: 'To Do', boardId: 'board-1', position: 1024, tasks: [] };
            mockPrisma.list.create.mockResolvedValue(mockList);
            mockPrisma.activityLog.create.mockResolvedValue({});

            const result = await service.create({ title: 'To Do', boardId: 'board-1' }, 'user-1');

            expect(result.title).toBe('To Do');
            expect(mockPrisma.list.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ position: 1024 }),
                }),
            );
            expect(mockEventsGateway.emitToBoardExcept).toHaveBeenCalledWith(
                'board-1', 'list:created', mockList, 'user-1',
            );
        });

        it('should position list after last existing list', async () => {
            mockBoardsService.verifyMembership.mockResolvedValue({});
            mockPrisma.list.findFirst.mockResolvedValue({ position: 2048 });
            mockPrisma.list.create.mockResolvedValue({ id: 'list-2', position: 3072, tasks: [] });
            mockPrisma.activityLog.create.mockResolvedValue({});

            await service.create({ title: 'Done', boardId: 'board-1' }, 'user-1');

            expect(mockPrisma.list.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ position: 3072 }),
                }),
            );
        });

        it('should log activity on creation', async () => {
            mockBoardsService.verifyMembership.mockResolvedValue({});
            mockPrisma.list.findFirst.mockResolvedValue(null);
            mockPrisma.list.create.mockResolvedValue({ id: 'list-1', title: 'Test', tasks: [] });
            mockPrisma.activityLog.create.mockResolvedValue({});

            await service.create({ title: 'Test', boardId: 'board-1' }, 'user-1');

            expect(mockPrisma.activityLog.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ action: 'LIST_CREATED' }),
                }),
            );
        });
    });

    describe('update', () => {
        it('should update list title and emit event', async () => {
            mockPrisma.list.findUnique.mockResolvedValue({ id: 'list-1', boardId: 'board-1' });
            mockBoardsService.verifyMembership.mockResolvedValue({});
            mockPrisma.list.update.mockResolvedValue({ id: 'list-1', title: 'Updated', tasks: [] });
            mockPrisma.activityLog.create.mockResolvedValue({});

            const result = await service.update('list-1', { title: 'Updated' }, 'user-1');

            expect(result.title).toBe('Updated');
            expect(mockEventsGateway.emitToBoardExcept).toHaveBeenCalledWith(
                'board-1', 'list:updated', expect.anything(), 'user-1',
            );
        });
    });

    describe('reorder', () => {
        it('should update list position', async () => {
            mockPrisma.list.findUnique.mockResolvedValue({ id: 'list-1', boardId: 'board-1' });
            mockBoardsService.verifyMembership.mockResolvedValue({});
            mockPrisma.list.update.mockResolvedValue({ id: 'list-1', position: 512, tasks: [] });

            const result = await service.reorder('list-1', 512, 'user-1');

            expect(mockPrisma.list.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: { position: 512 },
                }),
            );
        });
    });

    describe('delete', () => {
        it('should throw NotFoundException for non-existent list', async () => {
            mockPrisma.list.findUnique.mockResolvedValue(null);

            await expect(service.delete('non-existent', 'user-1')).rejects.toThrow(NotFoundException);
        });

        it('should log activity BEFORE deleting and emit event', async () => {
            mockPrisma.list.findUnique.mockResolvedValue({ id: 'list-1', title: 'Delete Me', boardId: 'board-1' });
            mockBoardsService.verifyMembership.mockResolvedValue({});

            const callOrder: string[] = [];
            mockPrisma.activityLog.create.mockImplementation(() => {
                callOrder.push('log');
                return Promise.resolve({});
            });
            mockPrisma.list.delete.mockImplementation(() => {
                callOrder.push('delete');
                return Promise.resolve({});
            });

            const result = await service.delete('list-1', 'user-1');

            expect(callOrder).toEqual(['log', 'delete']);
            expect(result.message).toBe('List deleted successfully');
            expect(mockEventsGateway.emitToBoardExcept).toHaveBeenCalledWith(
                'board-1', 'list:deleted', expect.objectContaining({ listId: 'list-1' }), 'user-1',
            );
        });
    });
});
