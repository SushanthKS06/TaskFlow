import { Controller, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ListsService } from './lists.service';
import { CreateListDto, UpdateListDto, ReorderListDto } from './dto/lists.dto';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';

@Controller('lists')
@UseGuards(AuthGuard('jwt'))
export class ListsController {
    constructor(private listsService: ListsService) { }

    @Post()
    create(@Body() dto: CreateListDto, @CurrentUser() user: JwtPayload) {
        return this.listsService.create(dto, user.sub);
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() dto: UpdateListDto, @CurrentUser() user: JwtPayload) {
        return this.listsService.update(id, dto, user.sub);
    }

    @Put(':id/reorder')
    reorder(@Param('id') id: string, @Body() dto: ReorderListDto, @CurrentUser() user: JwtPayload) {
        return this.listsService.reorder(id, dto.position, user.sub);
    }

    @Delete(':id')
    delete(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
        return this.listsService.delete(id, user.sub);
    }
}
