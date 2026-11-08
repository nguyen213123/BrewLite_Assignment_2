import { Global, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthPort } from '../../common/contracts/ports';
import { IdentityPort } from '../../common/security/security';
import { AdminGuard, JwtAuthGuard, StaffGuard } from '../../common/security/security';

@Global()
@Module({
  imports: [],
  controllers: [AuthController, AdminController],
  providers: [
    AuthService,
    AdminService,
    { provide: AuthPort, useExisting: AuthService },
    { provide: IdentityPort, useExisting: AuthService },
    JwtAuthGuard,
    StaffGuard,
    AdminGuard,
  ],
  exports: [AuthPort, IdentityPort, JwtAuthGuard, StaffGuard, AdminGuard],
})
export class AuthModule {}
