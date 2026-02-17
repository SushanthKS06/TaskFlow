import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { BoardsModule } from '../boards/boards.module';
import { EventsModule } from '../events/events.module';

@Module({
    imports: [BoardsModule, EventsModule],
    controllers: [TasksController],
    providers: [TasksService],
    exports: [TasksService],
})
export class TasksModule { }
