import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BoardsService } from '../boards/boards.service';

@Injectable()
export class ActivityService {
    constructor(
        private prisma: PrismaService,
        private boardsService: BoardsService,
    ) { }

    async getActivityForBoard(boardId: string, userId: string, page = 1, limit = 20) {
        await this.boardsService.verifyMembership(boardId, userId);

        const skip = (page - 1) * limit;

        const [activities, total] = await Promise.all([
            this.prisma.activityLog.findMany({
                where: { boardId },
                include: {
                    user: { select: { id: true, name: true, email: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.activityLog.count({ where: { boardId } }),
        ]);

        return {
            activities,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
}
