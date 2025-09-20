import { describe, it, expect, beforeAll } from 'vitest';
import { buildMessage as buildSiwsMessage } from '@bazari/siws-utils';
import {
  cryptoWaitReady,
  sr25519PairFromSeed,
  sr25519Sign,
  encodeAddress,
} from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import { verifySiws } from '../verifySiws.js';

const seed = new Uint8Array(32).fill(7);

let address: string;
let pair: ReturnType<typeof sr25519PairFromSeed>;

beforeAll(async () => {
  await cryptoWaitReady();
  pair = sr25519PairFromSeed(seed);
  address = encodeAddress(pair.publicKey, 42);
});

function buildFixture(overrides: Partial<Record<string, string>> = {}) {
  const issuedAt = overrides.issuedAt ?? new Date('2024-01-01T00:00:00.000Z').toISOString();
  const expiresAt = overrides.expiresAt ?? new Date('2024-01-01T00:10:00.000Z').toISOString();

  const payload = {
    domain: overrides.domain ?? 'auth.localhost',
    address,
    uri: overrides.uri ?? 'https://auth.localhost/login',
    genesisHash: overrides.genesisHash ?? '0x1234567890abcdef',
    nonce: overrides.nonce ?? 'test-nonce',
    issuedAt,
    expiresAt,
  };

  const message = buildSiwsMessage(payload);
  const signature = u8aToHex(
    sr25519Sign(message, { publicKey: pair.publicKey, secretKey: pair.secretKey })
  );

  const nonceRecord = {
    nonce: payload.nonce,
    domain: payload.domain,
    uri: payload.uri,
    genesis: payload.genesisHash,
    issuedAt: new Date(payload.issuedAt),
    expiresAt: new Date(payload.expiresAt),
    usedAt: null as Date | null,
  };

  return { message, signature, nonceRecord, payload };
}

describe('verifySiws', () => {
  it('falha quando a nonce já foi utilizada', async () => {
    const { message, signature, nonceRecord } = buildFixture();
    nonceRecord.usedAt = new Date();

    await expect(
      verifySiws({
        message,
        signature,
        address,
        nonceRecord,
        expectedDomain: nonceRecord.domain,
        expectedUri: nonceRecord.uri,
        expectedGenesisHash: nonceRecord.genesis,
      })
    ).rejects.toThrow(/Nonce já utilizado/);
  });

  it('falha quando o domain da mensagem diverge', async () => {
    const { message, signature, nonceRecord } = buildFixture({ domain: 'wrong.localhost' });

    await expect(
      verifySiws({
        message,
        signature,
        address,
        nonceRecord,
        expectedDomain: 'auth.localhost',
        expectedUri: nonceRecord.uri,
        expectedGenesisHash: nonceRecord.genesis,
      })
    ).rejects.toThrow(/Domain mismatch/);
  });

  it('falha quando o nonce expirou', async () => {
    const { message, signature, nonceRecord } = buildFixture({
      issuedAt: '2023-01-01T00:00:00.000Z',
      expiresAt: '2023-01-01T00:05:00.000Z',
    });

    await expect(
      verifySiws({
        message,
        signature,
        address,
        nonceRecord,
        expectedDomain: nonceRecord.domain,
        expectedUri: nonceRecord.uri,
        expectedGenesisHash: nonceRecord.genesis,
      })
    ).rejects.toThrow(/expired/);
  });
});
