import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  async login(
    username: string,
    password: string,
  ): Promise<{ access_token: string } | null> {
    const expectedUsername = process.env['AUTH_USERNAME'];
    const hashB64 = process.env['AUTH_PASSWORD_HASH'];

    if (!expectedUsername || !hashB64) return null;
    if (username !== expectedUsername) return null;

    const hash = Buffer.from(hashB64, 'base64').toString('utf-8');
    const valid = await bcrypt.compare(password, hash);
    if (!valid) return null;

    const token = await this.jwt.signAsync({ sub: username });
    return { access_token: token };
  }
}
