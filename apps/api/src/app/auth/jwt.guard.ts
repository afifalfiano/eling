import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedException();

    const token = authHeader.slice(7);
    try {
      await this.jwt.verifyAsync(token, {
        secret: process.env['JWT_SECRET'] ?? 'dev-secret-change-me',
      });
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
