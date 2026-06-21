import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

const mockJwt = { signAsync: jest.fn() };
const mockPrisma = {
  user: { findUnique: jest.fn(), create: jest.fn() },
  item: { updateMany: jest.fn() },
  $transaction: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwt },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  describe('login()', () => {
    it('returns access_token when credentials are valid', async () => {
      const hash = await bcrypt.hash('secret123', 10);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'a@b.com', password: hash });
      mockJwt.signAsync.mockResolvedValue('signed.jwt');

      const result = await service.login('a@b.com', 'secret123');

      expect(result).toEqual({ access_token: 'signed.jwt' });
      expect(mockJwt.signAsync).toHaveBeenCalledWith({ sub: 'user-1' });
    });

    it('throws UnauthorizedException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login('x@x.com', 'pw')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      const hash = await bcrypt.hash('correct', 10);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u', email: 'a@b.com', password: hash });

      await expect(service.login('a@b.com', 'wrong')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('register()', () => {
    it('creates user, merges anon items, and returns access_token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const newUser = { id: 'user-new', email: 'new@b.com', password: 'hash' };
      mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) =>
        fn(mockPrisma),
      );
      mockPrisma.user.create.mockResolvedValue(newUser);
      mockPrisma.item.updateMany.mockResolvedValue({ count: 3 });
      mockJwt.signAsync.mockResolvedValue('new.jwt');

      const result = await service.register('new@b.com', 'password123', 'anon-sid');

      expect(result).toEqual({ access_token: 'new.jwt' });
      expect(mockPrisma.item.updateMany).toHaveBeenCalledWith({
        where: { sessionId: 'anon-sid' },
        data: { userId: 'user-new', sessionId: null },
      });
    });

    it('throws ConflictException when email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.register('exists@b.com', 'pw', undefined)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('works without sessionId (no items to merge)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) =>
        fn(mockPrisma),
      );
      mockPrisma.user.create.mockResolvedValue({ id: 'u2', email: 'c@d.com', password: 'h' });
      mockPrisma.item.updateMany.mockResolvedValue({ count: 0 });
      mockJwt.signAsync.mockResolvedValue('jwt2');

      const result = await service.register('c@d.com', 'pw', undefined);

      expect(result).toEqual({ access_token: 'jwt2' });
      expect(mockPrisma.item.updateMany).toHaveBeenCalledWith({
        where: { sessionId: undefined },
        data: { userId: 'u2', sessionId: null },
      });
    });
  });
});
