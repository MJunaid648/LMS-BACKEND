import { User, UserRole } from 'src/modules/user/user.entity';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
// import { JwtStrategy } from './jwt.stratey';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

export type Payload = { sub: number; email: string; role: UserRole };
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly _configService: ConfigService,
    private readonly _dataSource: DataSource,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: _configService.get<string>('JWT_ACCESS_SECRET')!,
      ignoreExpiration: false,
    });
  }
  async validate(payload: Payload) {
    const userRepository = this._dataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: payload.sub } });
    return user;
  }
}
