import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  ValidateIf,
  MaxLength,
  Min,
  MinLength,
  ValidateBy,
} from 'class-validator';
import { ifDefined, trimLower, trimUpper } from '../../../common/dto/shared.dto';
import type { AuthRequest, LoginRequest } from '../../../common/contracts/api.generated';

export const MAX_ADMIN_INTEGER = 2_147_483_647;

const maxPasswordBytes = () => ValidateBy({ name: 'maxPasswordBytes', validator: {
  validate: (value: unknown) => typeof value === 'string' && Buffer.byteLength(value, 'utf8') <= 72,
  defaultMessage: () => 'password không được vượt quá 72 byte UTF-8',
} });

export class RegisterDto implements AuthRequest {
  @Transform(trimLower) @IsEmail() @MaxLength(254)
  email!: string;
  @IsString() @MinLength(8) @MaxLength(72) @maxPasswordBytes()
  password!: string;
}
export class LoginDto implements LoginRequest {
  @Transform(trimLower) @IsEmail() @MaxLength(254)
  email!: string;
  @IsString() @MinLength(1) @MaxLength(72) @maxPasswordBytes()
  password!: string;
}
export class CreateStaffDto implements AuthRequest {
  @Transform(trimLower) @IsEmail() @MaxLength(254)
  email!: string;
  @IsString() @MinLength(8) @MaxLength(72) @maxPasswordBytes()
  password!: string;
}
export class UpdateStaffStatusDto {
  @IsBoolean()
  active!: boolean;
}
export class AdminUpdateProductDto {
  @IsInt() @Min(0) @Max(MAX_ADMIN_INTEGER)
  expectedVersion!: number;
  @ValidateIf(ifDefined) @IsBoolean()
  active?: boolean;
  @ValidateIf(ifDefined) @IsInt() @Min(0) @Max(MAX_ADMIN_INTEGER)
  price?: number;
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @ValidateIf(ifDefined) @IsString() @MinLength(1) @MaxLength(120)
  name?: string;
}
export class AdminUpdateToppingDto {
  @ValidateIf(ifDefined) @IsBoolean()
  active?: boolean;
  @ValidateIf(ifDefined) @IsInt() @Min(0) @Max(MAX_ADMIN_INTEGER)
  price?: number;
}
export class AdminUpdateIngredientDto {
  @IsInt() @Min(0) @Max(MAX_ADMIN_INTEGER)
  expectedVersion!: number;
  @IsInt() @Min(0) @Max(MAX_ADMIN_INTEGER)
  stock!: number;
}
export class AdminCreatePromotionDto {
  @Transform(trimUpper) @IsString() @MinLength(3) @MaxLength(32) @Matches(/^[A-Z0-9_-]+$/)
  code!: string;
  @IsIn(['PERCENT', 'FIXED'])
  type!: 'PERCENT' | 'FIXED';
  @IsInt() @Min(1) @Max(MAX_ADMIN_INTEGER)
  value!: number;
  @IsInt() @Min(0) @Max(MAX_ADMIN_INTEGER)
  minSubtotal!: number;
  @IsOptional() @IsInt() @Min(1) @Max(MAX_ADMIN_INTEGER)
  maxDiscount?: number;
  @IsOptional() @IsInt() @Min(1) @Max(MAX_ADMIN_INTEGER)
  maxUses?: number;
  @IsDateString()
  startsAt!: string;
  @IsDateString()
  endsAt!: string;
}
export class AdminUpdatePromotionDto {
  @IsBoolean()
  active!: boolean;
}
