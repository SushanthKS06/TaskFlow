import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BoardsService } from '../boards/boards.service';
import { EventsGateway } from '../events/events.gateway';
import { CreateTaskDto, UpdateTaskDto, MoveTaskDto, AssignTaskDto } from './dto/tasks.dto';

@Injectable()
export class TasksService {
    constructor(
        private prisma: PrismaService,
        private boardsService: BoardsService,
        private eventsGateway: EventsGateway,
    ) { }

    async create(dto: CreateTaskDto, userId: string) {
        const list = await this.prisma.list.findUnique({ where: { id: dto.listId } });
        if (!list) throw new NotFoundException('List not found');

        await this.boardsService.verifyMembership(list.boardId, userId);

        const task = await this.prisma.$transaction(async (tx) => {
            const lastTask = await tx.task.findFirst({
                where: { listId: dto.listId },
                orderBy: { position: 'desc' },
            });

            const position = lastTask ? lastTask.position + 1024 : 1024;

            const task = await tx.task.create({
                data: {
                    title: dto.title,
                    description: dto.description,
                    priority: dto.priority || 'medium',
                    position,
                    listId: dto.listId,
                    creatorId: userId,
                    assigneeId: dto.assigneeId,
                },
                include: {
                    assignee: { select: { id: true, name: true, email: true } },
                    creator: { select: { id: true, name: true, email: true } },
                },
            });

            await tx.activityLog.create({
                data: {
                    action: 'TASK_CREATED',
                    entityType: 'task',
                    entityId: task.id,
                    details: JSON.stringify({ title: task.title, listId: dto.listId }),
                    userId,
                    boardId: list.boardId,
                },
            });

            return task;
        });

        const result = { ...task, boardId: list.boardId };

        this.eventsGateway.emitToBoardExcept(list.boardId, 'task:created', result, userId);

        return result;
    }

    async findOne(id: string, userId?: string) {
        const task = await this.prisma.task.findUnique({
            where: { id },
            include: {
                assignee: { select: { id: true, name: true, email: true } },
                creator: { select: { id: true, name: true, email: true } },
                list: { select: { id: true, title: true, boardId: true } },
            },
        });
        if (!task) throw new NotFoundException('Task not found');

        // Verify the requesting user is a member of the task's board
        if (userId) {
            await this.boardsService.verifyMembership(task.list.boardId, userId);
        }

        return task;
    }

    async update(id: string, dto: UpdateTaskDto, userId: string) {
        const task = await this.findOneWithBoard(id);
        await this.boardsService.verifyMembership(task.list.boardId, userId);

        const updated = await this.prisma.$transaction(async (tx) => {
            const updated = await tx.task.update({
                where: { id },
                data: dto,
                include: {
                    assignee: { select: { id: true, name: true, email: true } },
                    creator: { select: { id: true, name: true, email: true } },
                },
            });

            await tx.activityLog.create({
                data: {
                    action: 'TASK_UPDATED',
                    entityType: 'task',
                    entityId: id,
                    details: JSON.stringify(dto),
                    userId,
                    boardId: task.list.boardId,
                },
            });

            return updated;
        });

        const result = { ...updated, boardId: task.list.boardId };

        this.eventsGateway.emitToBoardExcept(task.list.boardId, 'task:updated', result, userId);

        return result;
    }

    async move(id: string, dto: MoveTaskDto, userId: string) {
        const task = await this.findOneWithBoard(id);
        await this.boardsService.verifyMembership(task.list.boardId, userId);

        const targetList = await this.prisma.list.findUnique({ where: { id: dto.targetListId } });
        if (!targetList) throw new NotFoundException('Target list not found');

        const moved = await this.prisma.$transaction(async (tx) => {
            const moved = await tx.task.update({
                where: { id },
                data: {
                    listId: dto.targetListId,
                    position: dto.position,
                },
                include: {
                    assignee: { select: { id: true, name: true, email: true } },
                    creator: { select: { id: true, name: true, email: true } },
                },
            });

            await tx.activityLog.create({
                data: {
                    action: 'TASK_MOVED',
                    entityType: 'task',
                    entityId: id,
                    details: JSON.stringify({
                        fromListId: task.listId,
                        toListId: dto.targetListId,
                        position: dto.position,
                    }),
                    userId,
                    boardId: task.list.boardId,
                },
            });

            return moved;
        });

        const result = { ...moved, boardId: task.list.boardId };

        this.eventsGateway.emitToBoardExcept(task.list.boardId, 'task:moved', result, userId);

        return result;
    }

    async assign(id: string, dto: AssignTaskDto, userId: string) {
        const task = await this.findOneWithBoard(id);
        await this.boardsService.verifyMembership(task.list.boardId, userId);

        const updated = await this.prisma.$transaction(async (tx) => {
            const updated = await tx.task.update({
                where: { id },
                data: { assigneeId: dto.assigneeId || null },
                include: {
                    assignee: { select: { id: true, name: true, email: true } },
                    creator: { select: { id: true, name: true, email: true } },
                },
            });

            await tx.activityLog.create({
                data: {
                    action: 'TASK_ASSIGNED',
                    entityType: 'task',
                    entityId: id,
                    details: JSON.stringify({ assigneeId: dto.assigneeId }),
                    userId,
                    boardId: task.list.boardId,
                },
            });

            return updated;
        });

        const result = { ...updated, boardId: task.list.boardId };

        this.eventsGateway.emitToBoardExcept(task.list.boardId, 'task:assigned', result, userId);

        return result;
    }

    async delete(id: string, userId: string) {
        const task = await this.findOneWithBoard(id);
        await this.boardsService.verifyMembership(task.list.boardId, userId);

        await this.prisma.$transaction(async (tx) => {
            await tx.activityLog.create({
                data: {
                    action: 'TASK_DELETED',
                    entityType: 'task',
                    entityId: id,
                    details: JSON.stringify({ title: task.title }),
                    userId,
                    boardId: task.list.boardId,
                },
            });

            await tx.task.delete({ where: { id } });
        });

        const result = { message: 'Task deleted', boardId: task.list.boardId, taskId: id, listId: task.listId };

        this.eventsGateway.emitToBoardExcept(task.list.boardId, 'task:deleted', result, userId);

        return result;
    }

    async search(boardId: string, query: string, userId: string, page = 1, limit = 20) {
        await this.boardsService.verifyMembership(boardId, userId);

        const skip = (page - 1) * limit;

        const [tasks, total] = await Promise.all([
            this.prisma.task.findMany({
                where: {
                    list: { boardId },
                    OR: [
                        { title: { contains: query, mode: 'insensitive' } },
                        { description: { contains: query, mode: 'insensitive' } },
                    ],
                },
                include: {
                    assignee: { select: { id: true, name: true, email: true } },
                    list: { select: { id: true, title: true } },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.task.count({
                where: {
                    list: { boardId },
                    OR: [
                        { title: { contains: query, mode: 'insensitive' } },
                        { description: { contains: query, mode: 'insensitive' } },
                    ],
                },
            }),
        ]);

        return {
            tasks,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    private async findOneWithBoard(id: string) {
        const task = await this.prisma.task.findUnique({
            where: { id },
            include: { list: { select: { boardId: true } } },
        });
        if (!task) throw new NotFoundException('Task not found');
        return task;
    }
}
