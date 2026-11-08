// Owner: TV4 — #6. Replace stubs here; keep public DTO/port contracts.
import { assertAccountActivationAllowed } from './legacy-password-policy';
import { Injectable, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthPort } from '../../common/contracts/ports';
import type { StaffAccount } from '../../common/contracts/ports';
import type * as Api from '../../common/contracts/api.generated';
import { IdentityPort } from '../../common/security/security';
import type { CurrentUserData } from '../../common/security/security';
import { ApiError } from '../../common/errors/api-error';
import { AUTH_POLICY } from './auth-policy';

@Injectable()
export class AuthService implements AuthPort, IdentityPort, OnModuleInit {
  private secret!: string;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    const envSecret = process.env.JWT_SECRET;
    if (!envSecret || envSecret.length < AUTH_POLICY.minSecretLength) {
      throw new Error(
        `JWT_SECRET must be configured with at least ${AUTH_POLICY.minSecretLength} characters`,
      );
    }
    this.secret = envSecret;
  }

  async register(input: Api.AuthRequest): Promise<Api.AuthResponse> {
    const email = input.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ApiError(409, 'EMAIL_ALREADY_EXISTS', 'Email đã được sử dụng');
    }

    const passwordHash = await bcrypt.hash(input.password, AUTH_POLICY.bcryptCost);

    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          role: 'CUSTOMER',
          loyaltyPoints: 0,
        },
      });

      return this.buildAuthResponse(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ApiError(409, 'EMAIL_ALREADY_EXISTS', 'Email đã được sử dụng');
      }
      throw error;
    }
  }

  async login(input: Api.LoginRequest): Promise<Api.AuthResponse> {
    const email = input.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng');
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!isMatch) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng');
    }

    if ((user as { active?: boolean }).active === false) {
      throw new ApiError(403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa');
    }

    return this.buildAuthResponse(user);
  }

  async me(user: CurrentUserData): Promise<Api.User> {
    const dbUser = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Cần đăng nhập');
    }
    if ((dbUser as { active?: boolean }).active === false) {
      throw new ApiError(403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa');
    }

    return {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      loyaltyPoints: dbUser.loyaltyPoints,
    };
  }

  async createStaff(input: Api.AuthRequest): Promise<StaffAccount> {
    const email = input.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ApiError(409, 'EMAIL_ALREADY_EXISTS', 'Email đã được sử dụng');
    }

    const passwordHash = await bcrypt.hash(input.password, AUTH_POLICY.bcryptCost);

    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          role: 'STAFF',
          active: true,
          loyaltyPoints: 0,
        },
      });

      return this.toStaffAccount(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ApiError(409, 'EMAIL_ALREADY_EXISTS', 'Email đã được sử dụng');
      }
      throw error;
    }
  }

  async listStaff(): Promise<{ data: StaffAccount[] }> {
    const staffUsers = await this.prisma.user.findMany({
      where: { role: 'STAFF' },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return {
      data: staffUsers.map(u => this.toStaffAccount(u)),
    };
  }

  async setStaffStatus(staffId: string, active: boolean): Promise<StaffAccount> {
    const existing = await this.prisma.user.findUnique({ where: { id: staffId } });
    if (!existing || existing.role !== 'STAFF') {
      throw new ApiError(404, 'STAFF_NOT_FOUND', 'Không tìm thấy tài khoản nhân viên');
    }

    await assertAccountActivationAllowed(existing, active);
    const updated = await this.prisma.user.update({
      where: { id: staffId },
      data: { active },
    });

    return this.toStaffAccount(updated);
  }

  async verifyAccessToken(token: string): Promise<CurrentUserData> {
    try {
      const secret = this.secret ?? process.env.JWT_SECRET;
      if (!secret || secret.length < AUTH_POLICY.minSecretLength) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Cần đăng nhập');
      }

      const decoded = jwt.verify(token, secret, {
        algorithms: [AUTH_POLICY.algorithm as jwt.Algorithm],
        issuer: AUTH_POLICY.issuer,
        audience: AUTH_POLICY.audience,
      }) as jwt.JwtPayload;

      if (!decoded || typeof decoded.sub !== 'string') {
        throw new ApiError(401, 'UNAUTHORIZED', 'Token không hợp lệ');
      }

      const dbUser = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
        select: { id: true, email: true, role: true, active: true },
      });

      if (!dbUser) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Người dùng không tồn tại');
      }

      if (decoded.role !== dbUser.role) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Quyền tài khoản đã thay đổi, vui lòng đăng nhập lại');
      }

      if ((dbUser as { active?: boolean }).active === false) {
        throw new ApiError(403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa');
      }

      return {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(401, 'UNAUTHORIZED', 'Token không hợp lệ hoặc đã hết hạn');
    }
  }

  private toStaffAccount(user: {
    id: string;
    email: string;
    active?: boolean;
    createdAt?: Date;
  }): StaffAccount {
    return {
      id: user.id,
      email: user.email,
      role: 'STAFF',
      active: user.active !== false,
      createdAt: (user.createdAt ?? new Date()).toISOString(),
    };
  }

  private buildAuthResponse(user: {
    id: string;
    email: string;
    role: 'CUSTOMER' | 'STAFF' | 'ADMIN';
    loyaltyPoints: number;
  }): Api.AuthResponse {
    const secret = this.secret ?? process.env.JWT_SECRET;
    const token = jwt.sign(
      {
        sub: user.id,
        role: user.role,
      },
      secret,
      {
        algorithm: AUTH_POLICY.algorithm as jwt.Algorithm,
        issuer: AUTH_POLICY.issuer,
        audience: AUTH_POLICY.audience,
        expiresIn: AUTH_POLICY.expiresInSeconds,
      },
    );

    return {
      accessToken: token,
      tokenType: 'Bearer',
      expiresIn: AUTH_POLICY.expiresInSeconds,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        loyaltyPoints: user.loyaltyPoints,
      },
    };
  }
}
