import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { OrderReadPort } from '../../common/contracts/ports';
import { EmptyQueryDto, IdParamDto, PaginationDto, StaffOrderQueryDto } from '../../common/dto/shared.dto';
import { ApiError } from '../../common/errors/api-error';
import { CurrentUser, JwtAuthGuard, StaffGuard } from '../../common/security/security';
import type { CurrentUserData } from '../../common/security/security';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderHistoryController {
  constructor(private readonly orders: OrderReadPort) {}
  // Static /me and /staff must precede /:id. TV4 owns read routes in this controller.
  @Get('me')
  list(@CurrentUser() user: CurrentUserData, @Query() query: PaginationDto) { return this.orders.listMine(user.id, query); }

  @Get('staff')
  @UseGuards(StaffGuard)
  listForStaff(@Query() query: StaffOrderQueryDto) {
    if (!this.orders.listAllForStaff) throw new ApiError(501, 'NOT_IMPLEMENTED', 'Chưa hỗ trợ');
    return this.orders.listAllForStaff(query);
  }

  @Get('staff/:id')
  @UseGuards(StaffGuard)
  detailForStaff(@Param() params: IdParamDto, @Query() _query: EmptyQueryDto) {
    if (!this.orders.findAnyForStaff) throw new ApiError(501, 'NOT_IMPLEMENTED', 'Chưa hỗ trợ');
    return this.orders.findAnyForStaff(params.id);
  }

  @Get(':id')
  detail(@CurrentUser() user: CurrentUserData, @Param() params: IdParamDto, @Query() _query: EmptyQueryDto) {
    return this.orders.findMine(user.id, params.id);
  }
}
