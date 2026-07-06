import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET || 'his_super_secret_access_key_change_in_prod_2026',
    });
  }

  async validate(payload: any) {
    return { 
      userId: payload.sub, 
      username: payload.username, 
      roles: payload.roles || [],
      permissions: payload.permissions || [],
      isAdmin: payload.isAdmin === true || (payload.roles && (payload.roles.includes('ADMIN') || payload.roles.includes('ADMINISTRATOR'))),
      isHRManager: payload.isHRManager === true
    };
  }
}
