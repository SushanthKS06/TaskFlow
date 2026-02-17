import { Test, TestingModule } from '@nestjs/testing';
import { ActivityService } from './activity.service';
import { PrismaService } from '../prisma/prisma.service';
import { BoardsService } from '../boards/boards.service';

describe('ActivityService', () => {
    let service: ActivityService;

    const mockPrisma: any = {
        activityLog: {
            findMany: jest.fn(),
            count: jest.fn(),
        },
    };

    const mockBoardsService = {
        verifyMembership: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ActivityService,
                { provide: PrismaService, useValue: mockPrisma },
                { provide: BoardsService, useValue: mockBoardsService },
            ],
        }).compile();

        service = module.get<ActivityService>(ActivityService);
        jest.clearAllMocks();
    });

    describe('getByBoard', () => {
        it('should verify membership before returning activities', async () => {
            mockBoardsService.verifyMembership.mockResolvedValue({});
            mockPrisma.activityLog.findMany.mockResolvedValue([]);
            mockPrisma.activityLog.count.mockResolvedValue(0);

            await service.getActivityForBoard('board-1', 'user-1', 1, 20);

            expect(mockBoardsService.verifyMembership).toHaveBeenCalledWith('board-1', 'user-1');
        });

        it('should return paginated activity logs', async () => {
            mockBoardsService.verifyMembership.mockResolvedValue({});
            const mockActivities = [
                { id: '1', action: 'TASK_CREATED', user: { id: 'u1', name: 'Test' }, createdAt: new Date() },
                { id: '2', action: 'TASK_UPDATED', user: { id: 'u1', name: 'Test' }, createdAt: new Date() },
            ];
            mockPrisma.activityLog.findMany.mockResolvedValue(mockActivities);
            mockPrisma.activityLog.count.mockResolvedValue(25);

            const result = await service.getActivityForBoard('board-1', 'user-1', 1, 20);

            expect(result.activities).toHaveLength(2);
            expect(result.pagination.total).toBe(25);
            expect(result.pagination.totalPages).toBe(2);
            expect(result.pagination.page).toBe(1);
        });

        it('should handle empty results', async () => {
            mockBoardsService.verifyMembership.mockResolvedValue({});
            mockPrisma.activityLog.findMany.mockResolvedValue([]);
            mockPrisma.activityLog.count.mockResolvedValue(0);

            const result = await service.getActivityForBoard('board-1', 'user-1');

            expect(result.activities).toHaveLength(0);
            expect(result.pagination.total).toBe(0);
            expect(result.pagination.totalPages).toBe(0);
        });

        it('should paginate correctly for page 2', async () => {
            mockBoardsService.verifyMembership.mockResolvedValue({});
            mockPrisma.activityLog.findMany.mockResolvedValue([]);
            mockPrisma.activityLog.count.mockResolvedValue(30);

            await service.getActivityForBoard('board-1', 'user-1', 2, 10);

            expect(mockPrisma.activityLog.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    skip: 10,
                    take: 10,
                }),
            );
        });
    });
});
