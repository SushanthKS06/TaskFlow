import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async findById(id: string) {
        return this.prisma.user.findUnique({
            where: { id },
            select: { id: true, name: true, email: true, createdAt: true },
        });
    }

    async findByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: { email },
            select: { id: true, name: true, email: true, createdAt: true },
        });
    }

    async searchUsers(query: string, excludeUserId?: string) {
        return this.prisma.user.findMany({
            where: {
                AND: [
                    {
                        OR: [
                            { name: { contains: query, mode: 'insensitive' } },
                            { email: { contains: query, mode: 'insensitive' } },
                        ],
                    },
                    excludeUserId ? { id: { not: excludeUserId } } : {},
                ],
            },
            select: { id: true, name: true, email: true },
            take: 10,
        });
    }
}
