import { Module } from '@nestjs/common';
import { ListsController } from './lists.controller';
import { ListsService } from './lists.service';
import { BoardsModule } from '../boards/boards.module';
import { EventsModule } from '../events/events.module';

@Module({
    imports: [BoardsModule, EventsModule],
    controllers: [ListsController],
    providers: [ListsService],
    exports: [ListsService],
})
export class ListsModule { }
