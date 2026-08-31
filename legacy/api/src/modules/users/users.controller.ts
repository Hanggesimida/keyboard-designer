import { Controller, Get, NotFoundException, UseGuards } from '@nestjs/common';
import { UsersService } from '@modules/users/users.service';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { SkipMustChangePassword } from '@modules/auth/decorators/skip-must-change-password.decorator';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @SkipMustChangePassword()
  @Get('me')
  async getMe(@CurrentUser() user: { id: string }) {
    const found = await this.usersService.findById(user.id);
    if (!found) {
      throw new NotFoundException('User not found');
    }
    return found;
  }
}
