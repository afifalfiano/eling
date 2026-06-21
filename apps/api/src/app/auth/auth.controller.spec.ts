import { Test } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const mockAuthService = { login: jest.fn(), register: jest.fn() };

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(AuthController);
    jest.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    it('returns access_token when credentials valid', async () => {
      mockAuthService.login.mockResolvedValue({ access_token: 'tok' });

      const result = await controller.login({ email: 'a@b.com', password: 'pw' });

      expect(result).toEqual({ access_token: 'tok' });
      expect(mockAuthService.login).toHaveBeenCalledWith('a@b.com', 'pw');
    });

    it('propagates UnauthorizedException', async () => {
      mockAuthService.login.mockRejectedValue(new UnauthorizedException());

      await expect(controller.login({ email: 'x', password: 'y' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('POST /auth/register', () => {
    it('returns access_token on success', async () => {
      mockAuthService.register.mockResolvedValue({ access_token: 'new.tok' });
      const req = { sessionId: 'anon-sid', userId: undefined } as any;

      const result = await controller.register({ email: 'new@b.com', password: 'pw123' }, req);

      expect(result).toEqual({ access_token: 'new.tok' });
      expect(mockAuthService.register).toHaveBeenCalledWith('new@b.com', 'pw123', 'anon-sid');
    });

    it('propagates ConflictException when email exists', async () => {
      mockAuthService.register.mockRejectedValue(new ConflictException());
      const req = { sessionId: undefined, userId: undefined } as any;

      await expect(
        controller.register({ email: 'dup@b.com', password: 'pw' }, req),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
