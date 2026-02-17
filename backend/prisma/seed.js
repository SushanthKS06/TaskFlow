const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create demo users
    const password = await bcrypt.hash('password123', 12);

    const stark = await prisma.user.upsert({
        where: { email: 'stark@demo.com' },
        update: {},
        create: {
            name: 'Stark',
            email: 'stark@demo.com',
            password,
        },
    });

    const steve = await prisma.user.upsert({
        where: { email: 'steve@demo.com' },
        update: {},
        create: {
            name: 'Steve',
            email: 'steve@demo.com',
            password,
        },
    });

    const peter = await prisma.user.upsert({
        where: { email: 'peter@demo.com' },
        update: {},
        create: {
            name: 'Peter',
            email: 'peter@demo.com',
            password,
        },
    });

    // Create a demo board
    const board = await prisma.board.create({
        data: {
            title: 'Project Alpha',
            description: 'Main project board for Team Alpha',
            ownerId: stark.id,
            members: {
                create: [
                    { userId: stark.id, role: 'owner' },
                    { userId: steve.id, role: 'member' },
                    { userId: peter.id, role: 'member' },
                ],
            },
        },
    });

    // Create lists
    const todoList = await prisma.list.create({
        data: { title: 'To Do', position: 1024, boardId: board.id },
    });

    const inProgressList = await prisma.list.create({
        data: { title: 'In Progress', position: 2048, boardId: board.id },
    });

    const doneList = await prisma.list.create({
        data: { title: 'Done', position: 3072, boardId: board.id },
    });

    // Create tasks
    await prisma.task.createMany({
        data: [
            {
                title: 'Set up project repository',
                description: 'Initialize Git repo and CI/CD pipeline',
                position: 1024,
                priority: 'high',
                listId: doneList.id,
                creatorId: stark.id,
                assigneeId: stark.id,
            },
            {
                title: 'Design database schema',
                description: 'Create ERD and Prisma schema for all entities',
                position: 2048,
                priority: 'high',
                listId: doneList.id,
                creatorId: stark.id,
                assigneeId: steve.id,
            },
            {
                title: 'Implement authentication',
                description: 'JWT-based auth with signup, login, and refresh tokens',
                position: 1024,
                priority: 'high',
                listId: inProgressList.id,
                creatorId: stark.id,
                assigneeId: peter.id,
            },
            {
                title: 'Build board CRUD API',
                description: 'REST endpoints for creating, reading, updating, and deleting boards',
                position: 2048,
                priority: 'medium',
                listId: inProgressList.id,
                creatorId: steve.id,
                assigneeId: steve.id,
            },
            {
                title: 'Implement drag and drop',
                description: 'Use DnD Kit for task reordering between lists',
                position: 1024,
                priority: 'medium',
                listId: todoList.id,
                creatorId: stark.id,
            },
            {
                title: 'Add real-time updates',
                description: 'Socket.IO integration for live collaboration',
                position: 2048,
                priority: 'high',
                listId: todoList.id,
                creatorId: stark.id,
            },
            {
                title: 'Write unit tests',
                description: 'Jest tests for backend services',
                position: 3072,
                priority: 'low',
                listId: todoList.id,
                creatorId: steve.id,
                assigneeId: peter.id,
            },
        ],
    });

    console.log('✅ Seed complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
