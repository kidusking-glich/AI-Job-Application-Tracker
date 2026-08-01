import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

interface JwtPayload {
  sub: string;
  email: string;
  version?: number;
  mfa?: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findOneById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    // MFA tickets (payload.mfa === true) are short-lived one-time login steps,
    // never valid as session tokens.
    if (payload.mfa === true) {
      throw new UnauthorizedException();
    }
    // Token versioning: reject any token that was issued before the user's
    // tokenVersion was bumped (e.g. after a password reset).
    if (payload.version !== user.tokenVersion) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
