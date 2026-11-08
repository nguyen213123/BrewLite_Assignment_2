import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateBy,
} from 'class-validator';
import { trimLower, trimUpper } from '../../../common/dto/shared.dto';
import type { AuthRequest, LoginRequest } from '../../../common/contracts/api.generated';

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
  @IsInt() @Min(0)
  expectedVersion!: number;
  @IsOptional() @IsBoolean()
  active?: boolean;
  @IsOptional() @IsInt() @Min(0)
  price?: number;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(120)
  name?: string;
}
export class AdminUpdateToppingDto {
  @IsOptional() @IsBoolean()
  active?: boolean;
  @IsOptional() @IsInt() @Min(0)
  price?: number;
}
export class AdminUpdateIngredientDto {
  @IsInt() @Min(0)
  expectedVersion!: number;
  @IsInt() @Min(0)
  stock!: number;
}
export class AdminCreatePromotionDto {
  @Transform(trimUpper) @IsString() @MinLength(3) @MaxLength(32)
  code!: string;
  @IsIn(['PERCENT', 'FIXED'])
  type!: 'PERCENT' | 'FIXED';
  @IsInt() @Min(1)
  value!: number;
  @IsInt() @Min(0)
  minSubtotal!: number;
  @IsOptional() @IsInt() @Min(1)
  maxDiscount?: number;
  @IsOptional() @IsInt() @Min(1)
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
