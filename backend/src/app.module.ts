import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BoardsModule } from './boards/boards.module';
import { ListsModule } from './lists/lists.module';
import { TasksModule } from './tasks/tasks.module';
import { ActivityModule } from './activity/activity.module';
import { EventsModule } from './events/events.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        WinstonModule.forRoot({
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.colorize(),
                        winston.format.printf(({ timestamp, level, message, context }) => {
                            return `${timestamp} [${context}] ${level}: ${message}`;
                        }),
                    ),
                }),
                new winston.transports.File({
                    filename: 'logs/error.log',
                    level: 'error',
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.json(),
                    ),
                }),
                new winston.transports.File({
                    filename: 'logs/combined.log',
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.json(),
                    ),
                }),
            ],
        }),
        ThrottlerModule.forRoot([{
            ttl: 60000,
            limit: 100,
        }]),
        PrismaModule,
        AuthModule,
        UsersModule,
        BoardsModule,
        ListsModule,
        TasksModule,
        ActivityModule,
        EventsModule,
    ],
    providers: [
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule { }
