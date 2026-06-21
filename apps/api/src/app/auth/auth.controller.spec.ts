import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const mockAuthService = { login: jest.fn() };

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

  it('returns access_token when credentials are valid', async () => {
    mockAuthService.login.mockResolvedValue({ access_token: 'tok' });

    const result = await controller.login({ username: 'admin', password: 'secret' });

    expect(result).toEqual({ access_token: 'tok' });
    expect(mockAuthService.login).toHaveBeenCalledWith('admin', 'secret');
  });

  it('throws 401 when credentials are invalid', async () => {
    mockAuthService.login.mockResolvedValue(null);

    await expect(
      controller.login({ username: 'x', password: 'y' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
