import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BoardsService } from '../boards/boards.service';
import { EventsGateway } from '../events/events.gateway';
import { CreateListDto, UpdateListDto } from './dto/lists.dto';

@Injectable()
export class ListsService {
    constructor(
        private prisma: PrismaService,
        private boardsService: BoardsService,
        private eventsGateway: EventsGateway,
    ) { }

    async create(dto: CreateListDto, userId: string) {
        await this.boardsService.verifyMembership(dto.boardId, userId);

        const list = await this.prisma.$transaction(async (tx) => {
            const lastList = await tx.list.findFirst({
                where: { boardId: dto.boardId },
                orderBy: { position: 'desc' },
            });

            const position = lastList ? lastList.position + 1024 : 1024;

            const list = await tx.list.create({
                data: {
                    title: dto.title,
                    boardId: dto.boardId,
                    position,
                },
                include: { tasks: true },
            });

            await tx.activityLog.create({
                data: {
                    action: 'LIST_CREATED',
                    entityType: 'list',
                    entityId: list.id,
                    details: JSON.stringify({ title: list.title }),
                    userId,
                    boardId: dto.boardId,
                },
            });

            return list;
        });

        this.eventsGateway.emitToBoardExcept(dto.boardId, 'list:created', list, userId);

        return list;
    }

    async update(id: string, dto: UpdateListDto, userId: string) {
        const list = await this.findOneOrFail(id);
        await this.boardsService.verifyMembership(list.boardId, userId);

        const updated = await this.prisma.$transaction(async (tx) => {
            const updated = await tx.list.update({
                where: { id },
                data: dto,
                include: { tasks: true },
            });

            await tx.activityLog.create({
                data: {
                    action: 'LIST_UPDATED',
                    entityType: 'list',
                    entityId: id,
                    details: JSON.stringify(dto),
                    userId,
                    boardId: list.boardId,
                },
            });

            return updated;
        });

        this.eventsGateway.emitToBoardExcept(list.boardId, 'list:updated', updated, userId);

        return updated;
    }

    async reorder(id: string, position: number, userId: string) {
        const list = await this.findOneOrFail(id);
        await this.boardsService.verifyMembership(list.boardId, userId);

        const updated = await this.prisma.list.update({
            where: { id },
            data: { position },
            include: { tasks: true },
        });

        this.eventsGateway.emitToBoardExcept(list.boardId, 'list:updated', updated, userId);

        return updated;
    }

    async delete(id: string, userId: string) {
        const list = await this.findOneOrFail(id);
        await this.boardsService.verifyMembership(list.boardId, userId);

        await this.prisma.$transaction(async (tx) => {
            await tx.activityLog.create({
                data: {
                    action: 'LIST_DELETED',
                    entityType: 'list',
                    entityId: id,
                    details: JSON.stringify({ title: list.title }),
                    userId,
                    boardId: list.boardId,
                },
            });

            await tx.list.delete({ where: { id } });
        });

        this.eventsGateway.emitToBoardExcept(list.boardId, 'list:deleted', { listId: id, boardId: list.boardId }, userId);

        return { message: 'List deleted successfully', boardId: list.boardId };
    }

    private async findOneOrFail(id: string) {
        const list = await this.prisma.list.findUnique({ where: { id } });
        if (!list) throw new NotFoundException('List not found');
        return list;
    }
}
