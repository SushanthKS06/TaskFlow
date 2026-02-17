import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BoardsService } from './boards.service';
import { CreateBoardDto, UpdateBoardDto, AddMemberDto } from './dto/boards.dto';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';

@Controller('boards')
@UseGuards(AuthGuard('jwt'))
export class BoardsController {
    constructor(private boardsService: BoardsService) { }

    @Post()
    create(@Body() dto: CreateBoardDto, @CurrentUser() user: JwtPayload) {
        return this.boardsService.create(dto, user.sub);
    }

    @Get()
    findAll(@CurrentUser() user: JwtPayload) {
        return this.boardsService.findAll(user.sub);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
        return this.boardsService.findOne(id, user.sub);
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() dto: UpdateBoardDto, @CurrentUser() user: JwtPayload) {
        return this.boardsService.update(id, dto, user.sub);
    }

    @Delete(':id')
    delete(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
        return this.boardsService.delete(id, user.sub);
    }

    @Post(':id/members')
    addMember(@Param('id') id: string, @Body() dto: AddMemberDto, @CurrentUser() user: JwtPayload) {
        return this.boardsService.addMember(id, dto.userId, user.sub);
    }

    @Delete(':id/members/:userId')
    removeMember(@Param('id') id: string, @Param('userId') userId: string, @CurrentUser() user: JwtPayload) {
        return this.boardsService.removeMember(id, userId, user.sub);
    }
}
