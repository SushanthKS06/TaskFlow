import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { CreateBoardDto, UpdateBoardDto } from './dto/boards.dto';

@Injectable()
export class BoardsService {
    constructor(
        private prisma: PrismaService,
        private eventsGateway: EventsGateway,
    ) { }

    async create(dto: CreateBoardDto, userId: string) {
        const board = await this.prisma.$transaction(async (tx) => {
            const board = await tx.board.create({
                data: {
                    title: dto.title,
                    description: dto.description,
                    ownerId: userId,
                    members: {
                        create: { userId, role: 'owner' },
                    },
                },
            });

            await tx.activityLog.create({
                data: {
                    action: 'BOARD_CREATED',
                    entityType: 'board',
                    entityId: board.id,
                    details: JSON.stringify({ title: board.title }),
                    userId,
                    boardId: board.id,
                },
            });

            const createdBoard = await tx.board.findUnique({
                where: { id: board.id },
                include: {
                    members: { include: { user: { select: { id: true, name: true, email: true } } } },
                    owner: { select: { id: true, name: true, email: true } },
                },
            });

            return createdBoard;
        });

        return board;
    }

    async findAll(userId: string) {
        const memberships = await this.prisma.boardMember.findMany({
            where: { userId },
            select: { boardId: true }
        });
        
        if (memberships.length === 0) {
            return [];
        }
        
        const boardIds = memberships.map(m => m.boardId);
        
        return this.prisma.board.findMany({
            where: { id: { in: boardIds } },
            include: {
                owner: { select: { id: true, name: true, email: true } },
                members: { include: { user: { select: { id: true, name: true, email: true } } } },
                _count: { select: { lists: true } },
            },
            orderBy: { updatedAt: 'desc' },
        });
    }

    async findOne(id: string, userId: string) {
        const board = await this.prisma.board.findUnique({
            where: { id },
            include: {
                owner: { select: { id: true, name: true, email: true } },
                members: { include: { user: { select: { id: true, name: true, email: true } } } },
                lists: {
                    orderBy: { position: 'asc' },
                    include: {
                        tasks: {
                            orderBy: { position: 'asc' },
                            include: {
                                assignee: { select: { id: true, name: true, email: true } },
                                creator: { select: { id: true, name: true, email: true } },
                            },
                        },
                    },
                },
            },
        });

        if (!board) {
            throw new NotFoundException('Board not found');
        }

        const isMember = board.members.some((m) => m.userId === userId);
        if (!isMember) {
            throw new ForbiddenException('Not a member of this board');
        }

        return board;
    }

    async update(id: string, dto: UpdateBoardDto, userId: string) {
        await this.verifyMembership(id, userId);

        const board = await this.prisma.$transaction(async (tx) => {
            const board = await tx.board.update({
                where: { id },
                data: dto,
                include: {
                    owner: { select: { id: true, name: true, email: true } },
                    members: { include: { user: { select: { id: true, name: true, email: true } } } },
                },
            });

            await tx.activityLog.create({
                data: {
                    action: 'BOARD_UPDATED',
                    entityType: 'board',
                    entityId: board.id,
                    details: JSON.stringify(dto),
                    userId,
                    boardId: board.id,
                },
            });

            return board;
        });

        this.eventsGateway.emitToBoardExcept(id, 'board:updated', board, userId);

        return board;
    }

    async delete(id: string, userId: string) {
        const board = await this.prisma.board.findUnique({ where: { id } });
        if (!board) throw new NotFoundException('Board not found');
        if (board.ownerId !== userId) throw new ForbiddenException('Only the owner can delete a board');

        await this.prisma.board.delete({ where: { id } });

        this.eventsGateway.emitToBoard(id, 'board:deleted', { boardId: id });

        return { message: 'Board deleted successfully' };
    }

    async addMember(boardId: string, targetUserId: string, userId: string) {
        await this.verifyMembership(boardId, userId);

        const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
        if (!user) throw new NotFoundException('User not found');

        const member = await this.prisma.$transaction(async (tx) => {
            const member = await tx.boardMember.create({
                data: { userId: targetUserId, boardId },
                include: { user: { select: { id: true, name: true, email: true } } },
            });

            await tx.activityLog.create({
                data: {
                    action: 'MEMBER_ADDED',
                    entityType: 'board',
                    entityId: boardId,
                    details: JSON.stringify({ memberName: user.name }),
                    userId,
                    boardId,
                },
            });

            return member;
        });

        this.eventsGateway.emitToBoardExcept(boardId, 'member:added', member, userId);

        return member;
    }

    async removeMember(boardId: string, targetUserId: string, userId: string) {
        const board = await this.prisma.board.findUnique({ where: { id: boardId } });
        if (!board) throw new NotFoundException('Board not found');
        if (board.ownerId !== userId) throw new ForbiddenException('Only the owner can remove members');
        if (targetUserId === userId) throw new ForbiddenException('Cannot remove yourself');

        await this.prisma.$transaction(async (tx) => {
            await tx.boardMember.deleteMany({
                where: { boardId, userId: targetUserId },
            });

            await tx.activityLog.create({
                data: {
                    action: 'MEMBER_REMOVED',
                    entityType: 'board',
                    entityId: boardId,
                    details: JSON.stringify({ removedUserId: targetUserId }),
                    userId,
                    boardId,
                },
            });
        });

        this.eventsGateway.emitToBoardExcept(boardId, 'member:removed', { boardId, removedUserId: targetUserId }, userId);

        return { message: 'Member removed' };
    }

    async verifyMembership(boardId: string, userId: string) {
        const membership = await this.prisma.boardMember.findUnique({
            where: { userId_boardId: { userId, boardId } },
        });
        if (!membership) {
            throw new ForbiddenException('Not a member of this board');
        }
        return membership;
    }
}
