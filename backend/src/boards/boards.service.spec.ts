import { Test, TestingModule } from '@nestjs/testing';
import { BoardsService } from './boards.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('BoardsService', () => {
    let service: BoardsService;

    const mockPrisma: any = {
        $transaction: jest.fn((fn: any) => fn(mockPrisma)),
        board: {
            create: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        boardMember: {
            findUnique: jest.fn(),
            create: jest.fn(),
            deleteMany: jest.fn(),
        },
        user: {
            findUnique: jest.fn(),
        },
        activityLog: {
            create: jest.fn(),
        },
    };

    const mockEventsGateway = {
        emitToBoard: jest.fn(),
        emitToBoardExcept: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BoardsService,
                { provide: PrismaService, useValue: mockPrisma },
                { provide: EventsGateway, useValue: mockEventsGateway },
            ],
        }).compile();

        service = module.get<BoardsService>(BoardsService);
        jest.clearAllMocks();
        mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockPrisma));
    });

    describe('create', () => {
        it('should create a board with owner as member and log activity', async () => {
            const mockBoard = {
                id: 'board-1',
                title: 'Test Board',
                ownerId: 'user-1',
                members: [{ userId: 'user-1', role: 'owner' }],
                owner: { id: 'user-1', name: 'Test', email: 'test@test.com' },
            };

            mockPrisma.board.create.mockResolvedValue(mockBoard);
            mockPrisma.board.findUnique.mockResolvedValue(mockBoard);
            mockPrisma.activityLog.create.mockResolvedValue({});

            const result = await service.create({ title: 'Test Board' }, 'user-1');

            expect(result!.title).toBe('Test Board');
            expect(mockPrisma.board.create).toHaveBeenCalled();
            expect(mockPrisma.activityLog.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ action: 'BOARD_CREATED' }),
                }),
            );
        });
    });

    describe('findOne', () => {
        it('should throw NotFoundException for non-existent board', async () => {
            mockPrisma.board.findUnique.mockResolvedValue(null);

            await expect(service.findOne('nonexistent', 'user-1')).rejects.toThrow(NotFoundException);
        });

        it('should throw ForbiddenException for non-members', async () => {
            mockPrisma.board.findUnique.mockResolvedValue({
                id: 'board-1',
                members: [{ userId: 'other-user' }],
            });

            await expect(service.findOne('board-1', 'user-1')).rejects.toThrow(ForbiddenException);
        });
    });

    describe('update', () => {
        it('should update board and emit real-time event', async () => {
            mockPrisma.boardMember.findUnique.mockResolvedValue({ userId: 'user-1', boardId: 'board-1' });
            const mockBoard = { id: 'board-1', title: 'Updated' };
            mockPrisma.board.update.mockResolvedValue(mockBoard);
            mockPrisma.activityLog.create.mockResolvedValue({});

            const result = await service.update('board-1', { title: 'Updated' }, 'user-1');

            expect(result!.title).toBe('Updated');
            expect(mockEventsGateway.emitToBoardExcept).toHaveBeenCalledWith('board-1', 'board:updated', mockBoard, 'user-1');
        });
    });

    describe('delete', () => {
        it('should throw ForbiddenException if not owner', async () => {
            mockPrisma.board.findUnique.mockResolvedValue({
                id: 'board-1',
                ownerId: 'other-user',
            });

            await expect(service.delete('board-1', 'user-1')).rejects.toThrow(ForbiddenException);
        });

        it('should delete board and emit event', async () => {
            mockPrisma.board.findUnique.mockResolvedValue({ id: 'board-1', ownerId: 'user-1' });
            mockPrisma.board.delete.mockResolvedValue({});

            await service.delete('board-1', 'user-1');

            expect(mockPrisma.board.delete).toHaveBeenCalledWith({ where: { id: 'board-1' } });
            expect(mockEventsGateway.emitToBoard).toHaveBeenCalledWith('board-1', 'board:deleted', { boardId: 'board-1' });
        });
    });

    describe('verifyMembership', () => {
        it('should throw ForbiddenException for non-members', async () => {
            mockPrisma.boardMember.findUnique.mockResolvedValue(null);

            await expect(service.verifyMembership('board-1', 'user-1')).rejects.toThrow(ForbiddenException);
        });

        it('should return membership for valid members', async () => {
            const membership = { userId: 'user-1', boardId: 'board-1', role: 'member' };
            mockPrisma.boardMember.findUnique.mockResolvedValue(membership);

            const result = await service.verifyMembership('board-1', 'user-1');
            expect(result).toEqual(membership);
        });
    });

    describe('addMember', () => {
        it('should add member and emit event', async () => {
            mockPrisma.boardMember.findUnique.mockResolvedValue({ userId: 'user-1', boardId: 'board-1' });
            mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-2', name: 'New User' });
            const mockMember = { userId: 'user-2', boardId: 'board-1', user: { id: 'user-2', name: 'New User' } };
            mockPrisma.boardMember.create.mockResolvedValue(mockMember);
            mockPrisma.activityLog.create.mockResolvedValue({});

            const result = await service.addMember('board-1', 'user-2', 'user-1');

            expect(result!.userId).toBe('user-2');
            expect(mockEventsGateway.emitToBoardExcept).toHaveBeenCalledWith('board-1', 'member:added', mockMember, 'user-1');
        });
    });
});
