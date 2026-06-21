import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async login(email: string, password: string): Promise<{ access_token: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException();
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException();
    const token = await this.jwt.signAsync({ sub: user.id });
    return { access_token: token };
  }

  async register(
    email: string,
    password: string,
    sessionId: string | undefined,
  ): Promise<{ access_token: string }> {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already registered');

    const hash = await bcrypt.hash(password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({ data: { email, password: hash } });
      await tx.item.updateMany({
        where: { sessionId },
        data: { userId: created.id, sessionId: null },
      });
      return created;
    });

    const token = await this.jwt.signAsync({ sub: user.id });
    return { access_token: token };
  }
}
