import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { EmptyQueryDto, IdParamDto } from '../../common/dto/shared.dto';
import { AdminGuard, JwtAuthGuard } from '../../common/security/security';
import { AdminService } from './admin.service';
import {
  AdminCreatePromotionDto,
  AdminUpdateIngredientDto,
  AdminUpdateProductDto,
  AdminUpdatePromotionDto,
  AdminUpdateToppingDto,
  UpdateStaffStatusDto,
} from './dto/auth.dto';

@Controller('auth/admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview')
  getOverview(@Query() _query: EmptyQueryDto) {
    return this.admin.getOverview();
  }

  @Patch('users/:id/status')
  setUserStatus(
    @Param() params: IdParamDto,
    @Body() input: UpdateStaffStatusDto,
    @Query() _query: EmptyQueryDto,
  ) {
    return this.admin.setUserStatus(params.id, input.active);
  }

  @Get('catalog')
  listCatalog(@Query() _query: EmptyQueryDto) {
    return this.admin.listCatalog();
  }

  @Patch('products/:id')
  updateProduct(
    @Param() params: IdParamDto,
    @Body() input: AdminUpdateProductDto,
    @Query() _query: EmptyQueryDto,
  ) {
    return this.admin.updateProduct(params.id, input);
  }

  @Patch('toppings/:id')
  updateTopping(
    @Param() params: IdParamDto,
    @Body() input: AdminUpdateToppingDto,
    @Query() _query: EmptyQueryDto,
  ) {
    return this.admin.updateTopping(params.id, input);
  }

  @Get('ingredients')
  listIngredients(@Query() _query: EmptyQueryDto) {
    return this.admin.listIngredients();
  }

  @Patch('ingredients/:id')
  updateIngredientStock(
    @Param() params: IdParamDto,
    @Body() input: AdminUpdateIngredientDto,
    @Query() _query: EmptyQueryDto,
  ) {
    return this.admin.updateIngredientStock(params.id, input);
  }

  @Get('promotions')
  listPromotions(@Query() _query: EmptyQueryDto) {
    return this.admin.listPromotions();
  }

  @Post('promotions')
  createPromotion(@Body() input: AdminCreatePromotionDto, @Query() _query: EmptyQueryDto) {
    return this.admin.createPromotion(input);
  }

  @Patch('promotions/:id')
  updatePromotion(
    @Param() params: IdParamDto,
    @Body() input: AdminUpdatePromotionDto,
    @Query() _query: EmptyQueryDto,
  ) {
    return this.admin.updatePromotion(params.id, input);
  }
}
