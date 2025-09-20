import { describe, it, expect, beforeAll } from 'vitest';
import { decodeAddress, encodeAddress, cryptoWaitReady } from '@polkadot/util-crypto';
import { formatBalance, parseAmountToPlanck, shortenAddress, normaliseAddress } from './format';

beforeAll(async () => {
  await cryptoWaitReady();
});

describe('wallet format utilities', () => {
  it('formats and parses balances with decimals', () => {
    const planck = parseAmountToPlanck('12.3456', 4);
    expect(planck).toBe(BigInt(123456));

    const formatted = formatBalance(planck, 4);
    expect(formatted).toBe('12.3456');
  });

  it('truncates repeated decimals when formatting', () => {
    const formatted = formatBalance(BigInt(1234000), 5);
    expect(formatted).toBe('12.34');
  });

  it('shortens addresses with ellipsis', () => {
    const short = shortenAddress('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', 4);
    expect(short).toBe('5Grw…utQY');
  });

  it('normalises addresses to target prefix', () => {
    const original = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
    const decoded = decodeAddress(original);
    const prefix2 = encodeAddress(decoded, 2);

    const normalised = normaliseAddress(prefix2, 42);
    expect(normalised).toBe(original);
  });
});
