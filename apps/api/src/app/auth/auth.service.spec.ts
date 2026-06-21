import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

const mockJwtService = { signAsync: jest.fn() };

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();
    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    const hash = await bcrypt.hash('secret123', 10);
    process.env['AUTH_USERNAME'] = 'afif';
    process.env['AUTH_PASSWORD_HASH'] = Buffer.from(hash).toString('base64');
    process.env['JWT_SECRET'] = 'test-secret';
  });

  it('returns access_token when credentials are valid', async () => {
    mockJwtService.signAsync.mockResolvedValue('signed.jwt.token');
    const result = await service.login('afif', 'secret123');
    expect(result).toEqual({ access_token: 'signed.jwt.token' });
    expect(mockJwtService.signAsync).toHaveBeenCalledWith({ sub: 'afif' });
  });

  it('returns null when username is wrong', async () => {
    const result = await service.login('wrong', 'secret123');
    expect(result).toBeNull();
    expect(mockJwtService.signAsync).not.toHaveBeenCalled();
  });

  it('returns null when password is wrong', async () => {
    const result = await service.login('afif', 'wrongpassword');
    expect(result).toBeNull();
    expect(mockJwtService.signAsync).not.toHaveBeenCalled();
  });

  it('returns null when env vars are missing', async () => {
    delete process.env['AUTH_USERNAME'];
    delete process.env['AUTH_PASSWORD_HASH'];
    const result = await service.login('afif', 'secret123');
    expect(result).toBeNull();
  });
});
