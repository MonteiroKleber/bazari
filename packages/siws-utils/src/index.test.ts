import { describe, expect, it } from 'vitest';
import { assertMessageAgainstEnv, buildMessage, parseMessage, SiwsError } from './index.js';

const baseParams = {
  domain: 'auth.example.com',
  address: '5F6H7J',
  uri: 'https://auth.example.com/login',
  version: '1',
  chain: 'polkadot',
  genesisHash: '0x123',
  nonce: 'abc-123',
  issuedAt: '2024-01-01T00:00:00.000Z',
  expiresAt: '2024-01-01T00:10:00.000Z',
  resources: ['https://example.com'],
  statement: 'Sign in',
};

describe('buildMessage & parseMessage', () => {
  it('round-trips message fields', () => {
    const message = buildMessage(baseParams);
    const parsed = parseMessage(message);
    expect(parsed).toMatchObject(baseParams);
  });

  it('throws on malformed message', () => {
    expect(() => parseMessage('invalid message')).toThrow(SiwsError);
  });
});

describe('assertMessageAgainstEnv', () => {
  const env = {
    domain: baseParams.domain,
    uri: baseParams.uri,
    genesisHash: baseParams.genesisHash,
    now: new Date('2024-01-01T00:05:00.000Z'),
  };

  it('accepts valid message', () => {
    const message = parseMessage(buildMessage(baseParams));
    expect(() => assertMessageAgainstEnv(message, env)).not.toThrow();
  });

  it('detects domain mismatch', () => {
    const message = { ...parseMessage(buildMessage(baseParams)), domain: 'wrong' };
    expect(() => assertMessageAgainstEnv(message, env)).toThrow(/Domain mismatch/);
  });

  it('detects expired message', () => {
    const expired = parseMessage(buildMessage({ ...baseParams, expiresAt: '2024-01-01T00:02:00.000Z' }));
    const now = new Date('2024-01-01T00:10:01.000Z');
    expect(() => assertMessageAgainstEnv(expired, { ...env, now, maxSkewSeconds: 0 })).toThrow(/expired/i);
  });

  it('detects not yet valid message', () => {
    const future = parseMessage(buildMessage(baseParams));
    const now = new Date('2023-12-31T23:59:00.000Z');
    expect(() => assertMessageAgainstEnv(future, { ...env, now, maxSkewSeconds: 0 })).toThrow(/not yet valid/i);
  });
});
