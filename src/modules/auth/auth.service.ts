import { Profile } from './../profile/profile.entity';
import { User, UserRole } from './../user/user.entity';
import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { RegisterInput } from './dto/register.input';
import { AuthResponse } from './dto/auth-response';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly _dataSource: DataSource,
    private readonly _jwtService: JwtService,
    private readonly _configService: ConfigService,
  ) {}

  async register(input: RegisterInput): Promise<AuthResponse> {
    const userRepository = this._dataSource.getRepository(User);
    const { name, email, password } = input;
    const existingUser = await userRepository.findOne({
      where: { email },
    });
    if (existingUser) throw new ConflictException('Email already in use');
    const passwordHash = await bcrypt.hash(password, 12);
    const { user, refreshToken, accessToken } =
      await this._dataSource.transaction(async (manager) => {
        const user = manager.create(User, {
          name,
          email,
          passwordHash,
          role: UserRole.STUDENT,
        });
        const savedUser = await manager.save(user);
        const { refreshToken, accessToken } = this._generateTokens(
          savedUser.id,
          savedUser.email,
          savedUser.role,
        );
        const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

        await manager.update(User, savedUser.id, {
          hashedRefreshToken,
        });

        const profile = manager.create(Profile, {
          user: savedUser,
        });
        await manager.save(profile);
        return { user: savedUser, refreshToken, accessToken };
      });

    return { user, refreshToken, accessToken };
  }

  private _generateTokens(userId: number, email: string, role: UserRole) {
    const accessToken = this._jwtService.sign(
      {
        sub: userId,
        email: email,
        role: role,
      },
      {
        secret: this._configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this._configService.get('JWT_ACCESS_EXPIRY'),
      },
    );
    const refreshToken = this._jwtService.sign(
      {
        sub: userId,
        email: email,
        role: role,
      },
      {
        secret: this._configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this._configService.get('JWT_REFRESH_EXPIRY'),
      },
    );
    return { refreshToken, accessToken };
  }
}
