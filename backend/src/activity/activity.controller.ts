import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ActivityService } from './activity.service';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';

@Controller('activity')
@UseGuards(AuthGuard('jwt'))
export class ActivityController {
    constructor(private activityService: ActivityService) { }

    @Get(':boardId')
    getByBoard(
        @Param('boardId') boardId: string,
        @Query('page') page: string,
        @Query('limit') limit: string,
        @CurrentUser() user: JwtPayload,
    ) {
        return this.activityService.getActivityForBoard(boardId, user.sub, +page || 1, +limit || 20);
    }
}
