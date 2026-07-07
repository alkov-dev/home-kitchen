import { Controller } from '@nestjs/common';
import { GrpcMethod, GrpcStreamMethod } from '@nestjs/microservices';
import { AuthService } from './auth.service';

interface RegisterRequest {
  email: string;
  password: string;
  phone: string;
  firstName?: string;
  lastName?: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface VerifyTokenRequest {
  token: string;
}

interface RefreshTokenRequest {
  refresh_token: string;
}

interface LogoutRequest {
  user_id: number;
}

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @GrpcMethod('AuthService', 'Register')
  async register(data: RegisterRequest) {
    return this.authService.register(
      data.email,
      data.password,
      data.phone,
      data.firstName,
      data.lastName,
    );
  }

  @GrpcMethod('AuthService', 'Login')
  async login(data: LoginRequest) {
    return this.authService.login(data.email, data.password);
  }

  @GrpcMethod('AuthService', 'VerifyToken')
  async verifyToken(data: VerifyTokenRequest) {
    return this.authService.verifyToken(data.token);
  }

  @GrpcMethod('AuthService', 'RefreshToken')
  async refreshToken(data: RefreshTokenRequest) {
    return this.authService.refreshToken(data.refresh_token);
  }

  @GrpcMethod('AuthService', 'Logout')
  async logout(data: LogoutRequest) {
    return this.authService.logout(data.user_id);
  }
}