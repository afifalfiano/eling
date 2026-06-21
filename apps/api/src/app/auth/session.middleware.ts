import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response, NextFunction } from 'express';

const SESSION_COOKIE = 'ELING_SESSION';
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

@Injectable()
export class SessionMiddleware implements NestMiddleware {
  constructor(private readonly jwt: JwtService) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const authHeader = req.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7);
        const payload = await this.jwt.verifyAsync<{ sub: string }>(token, {
          secret: process.env['JWT_SECRET'] ?? 'dev-secret-change-me',
        });
        req.userId = payload.sub;
      } catch {
        // invalid JWT — fall through to session cookie
      }
    }

    if (!req.userId) {
      let sessionId: string = req.cookies?.[SESSION_COOKIE];
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        res.cookie(SESSION_COOKIE, sessionId, {
          httpOnly: true,
          secure: process.env['NODE_ENV'] === 'production',
          sameSite: 'strict',
          maxAge: ONE_YEAR_MS,
        });
      }
      req.sessionId = sessionId;
    }

    next();
  }
}
