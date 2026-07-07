import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) { }

  // ==================== REGISTRATION ====================
  async register(
    email: string,
    password: string,
    phone: string,
    firstName?: string,
    lastName?: string,
  ) {
    // Проверка существования пользователя
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Хэширование пароля
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создание пользователя
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      phone,
      firstName,
      lastName,
      role: UserRole.CUSTOMER,
    });

    await this.userRepository.save(user);

    // Генерация токенов
    const tokens = await this.generateTokens(user);

    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      user_id: user.id,
      email: user.email,
      role: user.role,
    };
  }

  // ==================== LOGIN ====================
  async login(email: string, password: string) {
    // Поиск пользователя
    const user = await this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'password', 'role', 'isActive'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Проверка пароля
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Генерация токенов
    const tokens = await this.generateTokens(user);

    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      user_id: user.id,
      email: user.email,
      role: user.role,
    };
  }

  // ==================== VERIFY TOKEN ====================
  async verifyToken(token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
        select: ['id', 'email', 'role', 'isActive'],
      });

      if (!user || !user.isActive) {
        return { user_id: 0, email: '', role: '', valid: false };
      }

      return {
        user_id: user.id,
        email: user.email,
        role: user.role,
        valid: true,
      };
    } catch (error) {
      return { user_id: 0, email: '', role: '', valid: false };
    }
  }

  // ==================== REFRESH TOKEN ====================
  async refreshToken(refreshToken: string) {
    // Поиск токена в БД
    const storedToken = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
      relations: ['user'],
    });

    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = storedToken.user;

    // Генерация новых токенов
    const tokens = await this.generateTokens(user);

    // Отзыв старого refresh токена
    storedToken.revoked = true;
    storedToken.replacedByToken = tokens.refreshToken;
    await this.refreshTokenRepository.save(storedToken);

    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      user_id: user.id,
      email: user.email,
      role: user.role,
    };
  }

  // ==================== LOGOUT ====================
  async logout(userId: number) {
    // Отзыв всех refresh токенов пользователя
    await this.refreshTokenRepository.update(
      { userId, revoked: false },
      { revoked: true, reasonRevoked: 'logout' },
    );

    return { success: true };
  }

  // ==================== HELPER METHODS ====================
  private async generateTokens(user: User) {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(user),
      this.generateRefreshToken(user),
    ]);

    return { accessToken, refreshToken };
  }

  private async generateAccessToken(user: User): Promise<string> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
    });
  }

  private async generateRefreshToken(user: User): Promise<string> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    // Сохранение refresh токена в БД
    await this.refreshTokenRepository.save({
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 дней
    });

    return refreshToken;
  }
}