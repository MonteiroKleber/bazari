import { describe, it, expect, vi } from 'vitest';
import { authConfig } from '../../../config/auth.js';
import { hashRefreshToken, rotateRefresh, type RefreshTokenRecord } from '../jwt.js';

describe('refresh token rotation', () => {
  it('revoga o token antigo e emite um novo cookie', async () => {
    const setCookie = vi.fn();

    const reply = {
      setCookie,
      clearCookie: vi.fn(),
    } as any;

    const createdTokens: Array<{ tokenHash: string }> = [];

    const prisma = {
      refreshToken: {
        update: vi.fn().mockResolvedValue(undefined),
        create: vi.fn().mockImplementation(async ({ data }: any) => {
          createdTokens.push({ tokenHash: data.tokenHash });
          const record: RefreshTokenRecord = {
            id: `token-${createdTokens.length}`,
            userId: data.userId,
            tokenHash: data.tokenHash,
            createdAt: new Date(),
            revokedAt: null,
          };

          return record;
        }),
      },
    } as any;

    const user = { id: 'user-1', address: '5Ff...' };

    const previousToken: RefreshTokenRecord = {
      id: 'previous',
      userId: user.id,
      tokenHash: hashRefreshToken('existing-token'),
      createdAt: new Date(Date.now() - 1000),
      revokedAt: null,
    };

    await rotateRefresh(reply, prisma, user, previousToken);

    expect(prisma.refreshToken.update).toHaveBeenCalledWith({
      where: { id: previousToken.id },
      data: { revokedAt: expect.any(Date) },
    });

    expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
    expect(setCookie).toHaveBeenCalledTimes(1);

    const [cookieName, cookieValue, options] = setCookie.mock.calls[0];

    expect(cookieName).toBe(authConfig.refreshCookieName);
    expect(typeof cookieValue).toBe('string');
    expect(cookieValue.length).toBeGreaterThan(0);
    expect(options).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });
    expect(options.maxAge).toBeGreaterThan(0);

    expect(createdTokens[0].tokenHash).toBe(hashRefreshToken(cookieValue));
  });
});
