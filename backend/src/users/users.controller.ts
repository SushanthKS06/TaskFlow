import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
    constructor(private usersService: UsersService) { }

    @Get('me')
    getProfile(@CurrentUser() user: JwtPayload) {
        return this.usersService.findById(user.sub);
    }

    @Get('search')
    search(@Query('q') query: string, @CurrentUser() user: JwtPayload) {
        return this.usersService.searchUsers(query || '', user.sub);
    }
}
