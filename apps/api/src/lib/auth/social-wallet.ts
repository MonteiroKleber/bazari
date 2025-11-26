import { Keyring } from '@polkadot/keyring';
import { mnemonicGenerate } from '@polkadot/util-crypto';
import { cryptoWaitReady } from '@polkadot/util-crypto';

let cryptoReady: Promise<boolean> | null = null;

async function ensureCryptoReady() {
  if (!cryptoReady) {
    cryptoReady = cryptoWaitReady().catch(() => false);
  }
  await cryptoReady;
}

export interface WalletData {
  mnemonic: string;
  address: string;
  publicKey: string;
}

/**
 * Gera uma nova wallet SR25519 com mnemonic BIP39
 * @returns Dados da wallet (mnemonic, address, publicKey)
 */
export async function generateSocialWallet(): Promise<WalletData> {
  await ensureCryptoReady();

  // Gerar mnemonic BIP39 (12 palavras)
  const mnemonic = mnemonicGenerate(12);

  // Derivar keypair SR25519
  const keyring = new Keyring({ type: 'sr25519', ss58Format: 42 });
  const pair = keyring.createFromUri(mnemonic);

  return {
    mnemonic,
    address: pair.address,
    publicKey: Buffer.from(pair.publicKey).toString('hex'),
  };
}

/**
 * Deriva um address SR25519 a partir de um mnemonic
 * @param mnemonic - Mnemonic BIP39 (12 palavras)
 * @returns Address SS58
 */
export async function deriveAddressFromMnemonic(mnemonic: string): Promise<string> {
  await ensureCryptoReady();

  const keyring = new Keyring({ type: 'sr25519', ss58Format: 42 });
  const pair = keyring.createFromUri(mnemonic);

  return pair.address;
}

/**
 * Deriva um keypair completo a partir de um mnemonic
 * @param mnemonic - Mnemonic BIP39 (12 palavras)
 * @returns Keypair com address e publicKey
 */
export async function deriveKeypairFromMnemonic(mnemonic: string): Promise<{ address: string; publicKey: string }> {
  await ensureCryptoReady();

  const keyring = new Keyring({ type: 'sr25519', ss58Format: 42 });
  const pair = keyring.createFromUri(mnemonic);

  return {
    address: pair.address,
    publicKey: Buffer.from(pair.publicKey).toString('hex'),
  };
}
