import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthPort } from '../../common/contracts/ports';
import { AdminGuard, CurrentUser, JwtAuthGuard } from '../../common/security/security';
import type { CurrentUserData } from '../../common/security/security';
import { EmptyQueryDto, IdParamDto } from '../../common/dto/shared.dto';
import { ApiError } from '../../common/errors/api-error';
import { CreateStaffDto, LoginDto, RegisterDto, UpdateStaffStatusDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthPort) {}
  @Post('register')
  register(@Body() input: RegisterDto, @Query() _query: EmptyQueryDto) { return this.auth.register(input); }
  @Post('login') @HttpCode(200)
  login(@Body() input: LoginDto, @Query() _query: EmptyQueryDto) { return this.auth.login(input); }
  @Get('me') @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: CurrentUserData, @Query() _query: EmptyQueryDto) { return this.auth.me(user); }

  @Post('staff')
  @UseGuards(JwtAuthGuard, AdminGuard)
  createStaff(@Body() input: CreateStaffDto, @Query() _query: EmptyQueryDto) {
    if (!this.auth.createStaff) throw new ApiError(501, 'NOT_IMPLEMENTED', 'Chưa hỗ trợ');
    return this.auth.createStaff(input);
  }

  @Get('staff')
  @UseGuards(JwtAuthGuard, AdminGuard)
  listStaff(@Query() _query: EmptyQueryDto) {
    if (!this.auth.listStaff) throw new ApiError(501, 'NOT_IMPLEMENTED', 'Chưa hỗ trợ');
    return this.auth.listStaff();
  }

  @Patch('staff/:id/status')
  @UseGuards(JwtAuthGuard, AdminGuard)
  setStaffStatus(@Param() params: IdParamDto, @Body() input: UpdateStaffStatusDto, @Query() _query: EmptyQueryDto) {
    if (!this.auth.setStaffStatus) throw new ApiError(501, 'NOT_IMPLEMENTED', 'Chưa hỗ trợ');
    return this.auth.setStaffStatus(params.id, input.active);
  }
}
