import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto, MoveTaskDto, AssignTaskDto } from './dto/tasks.dto';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';

@Controller('tasks')
@UseGuards(AuthGuard('jwt'))
export class TasksController {
    constructor(private tasksService: TasksService) { }

    @Post()
    create(@Body() dto: CreateTaskDto, @CurrentUser() user: JwtPayload) {
        return this.tasksService.create(dto, user.sub);
    }

    @Get('search/:boardId')
    search(
        @Param('boardId') boardId: string,
        @Query('q') query: string,
        @Query('page') page: string,
        @Query('limit') limit: string,
        @CurrentUser() user: JwtPayload,
    ) {
        return this.tasksService.search(boardId, query || '', user.sub, +page || 1, +limit || 20);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
        return this.tasksService.findOne(id, user.sub);
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @CurrentUser() user: JwtPayload) {
        return this.tasksService.update(id, dto, user.sub);
    }

    @Put(':id/move')
    move(@Param('id') id: string, @Body() dto: MoveTaskDto, @CurrentUser() user: JwtPayload) {
        return this.tasksService.move(id, dto, user.sub);
    }

    @Put(':id/assign')
    assign(@Param('id') id: string, @Body() dto: AssignTaskDto, @CurrentUser() user: JwtPayload) {
        return this.tasksService.assign(id, dto, user.sub);
    }

    @Delete(':id')
    delete(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
        return this.tasksService.delete(id, user.sub);
    }
}
