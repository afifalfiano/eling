import { SessionMiddleware } from './session.middleware';
import { JwtService } from '@nestjs/jwt';

const mockJwt = { verifyAsync: jest.fn() };
const mockRes = { cookie: jest.fn() };
const mockNext = jest.fn();

function makeReq(overrides: Record<string, unknown> = {}) {
  return { headers: {}, cookies: {}, ...overrides } as any;
}

describe('SessionMiddleware', () => {
  let middleware: SessionMiddleware;

  beforeEach(() => {
    middleware = new SessionMiddleware(mockJwt as unknown as JwtService);
    jest.clearAllMocks();
  });

  it('attaches userId from valid JWT', async () => {
    mockJwt.verifyAsync.mockResolvedValue({ sub: 'user-123' });
    const req = makeReq({ headers: { authorization: 'Bearer valid.token' } });

    await middleware.use(req, mockRes as any, mockNext);

    expect(req.userId).toBe('user-123');
    expect(req.sessionId).toBeUndefined();
    expect(mockRes.cookie).not.toHaveBeenCalled();
  });

  it('attaches existing sessionId from cookie when no JWT', async () => {
    const req = makeReq({ cookies: { ELING_SESSION: 'existing-sid' } });

    await middleware.use(req, mockRes as any, mockNext);

    expect(req.userId).toBeUndefined();
    expect(req.sessionId).toBe('existing-sid');
    expect(mockRes.cookie).not.toHaveBeenCalled();
  });

  it('generates new sessionId and sets cookie when no JWT and no cookie', async () => {
    const req = makeReq();

    await middleware.use(req, mockRes as any, mockNext);

    expect(req.userId).toBeUndefined();
    expect(req.sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(mockRes.cookie).toHaveBeenCalledWith(
      'ELING_SESSION',
      req.sessionId,
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it('falls through to session when JWT is invalid', async () => {
    mockJwt.verifyAsync.mockRejectedValue(new Error('invalid'));
    const req = makeReq({
      headers: { authorization: 'Bearer bad.token' },
      cookies: { ELING_SESSION: 'fallback-sid' },
    });

    await middleware.use(req, mockRes as any, mockNext);

    expect(req.userId).toBeUndefined();
    expect(req.sessionId).toBe('fallback-sid');
  });

  it('calls next() in all cases', async () => {
    const req = makeReq();
    await middleware.use(req, mockRes as any, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });
});
