import { useCallback, useEffect, useRef, useState } from 'react';
import {
  cryptoWaitReady,
  mnemonicGenerate,
  mnemonicToMiniSecret,
  mnemonicValidate,
  sr25519PairFromSeed,
  encodeAddress,
  sr25519Sign,
} from '@polkadot/util-crypto';
import { stringToU8a, u8aToHex } from '@polkadot/util';

const DEFAULT_WORDS = 12;
const SS58_PREFIX = 42;

async function derivePair(mnemonic: string) {
  const miniSecret = mnemonicToMiniSecret(mnemonic);
  const pair = sr25519PairFromSeed(miniSecret);
  miniSecret.fill(0);
  return pair;
}

export function useKeyring() {
  const readyRef = useRef(false);
  const [isReady, setIsReady] = useState(false);

  const ensureReady = useCallback(async () => {
    if (!readyRef.current) {
      await cryptoWaitReady();
      readyRef.current = true;
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    void ensureReady();
  }, [ensureReady]);

  const generateMnemonic = useCallback(async () => {
    await ensureReady();
    return mnemonicGenerate(DEFAULT_WORDS);
  }, [ensureReady]);

  const validateMnemonic = useCallback(async (mnemonic: string) => {
    await ensureReady();
    return mnemonicValidate(mnemonic);
  }, [ensureReady]);

  const deriveAddress = useCallback(async (mnemonic: string) => {
    await ensureReady();
    const pair = await derivePair(mnemonic);
    return encodeAddress(pair.publicKey, SS58_PREFIX);
  }, [ensureReady]);

  const signMessage = useCallback(async (mnemonic: string, message: string) => {
    await ensureReady();
    const pair = await derivePair(mnemonic);
    const messageBytes = stringToU8a(message);
    const signature = sr25519Sign(messageBytes, pair);
    pair.publicKey.fill(0);
    pair.secretKey.fill(0);
    return u8aToHex(signature);
  }, [ensureReady]);

  return {
    isReady,
    generateMnemonic,
    validateMnemonic,
    deriveAddress,
    signMessage,
  };
}

export type UseKeyringReturn = ReturnType<typeof useKeyring>;
