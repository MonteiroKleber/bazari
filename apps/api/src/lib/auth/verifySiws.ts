import { parseMessage, assertMessageAgainstEnv, type SiwsMessageFields } from '@bazari/siws-utils';
import { isHex } from '@polkadot/util';
import { signatureVerify, cryptoWaitReady } from '@polkadot/util-crypto';

export interface NonceRecord {
  nonce: string;
  domain: string;
  uri: string;
  genesis: string;
  issuedAt: Date;
  expiresAt: Date;
  usedAt: Date | null;
}

export interface VerifySiwsParams {
  message: string;
  signature: string;
  address: string;
  nonceRecord: NonceRecord;
  expectedDomain: string;
  expectedUri: string;
  expectedGenesisHash: string;
  now?: Date;
}

export interface VerifySiwsResult {
  payload: SiwsMessageFields;
}

let cryptoReady: Promise<boolean> | null = null;

async function ensureCryptoReady() {
  if (!cryptoReady) {
    cryptoReady = cryptoWaitReady().catch(() => false);
  }

  await cryptoReady;
}

export function normalizeSignature(signature: string) {
  const trimmed = signature.trim();
  const prefixed = trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`;

  if (!isHex(prefixed)) {
    throw new Error('Assinatura SIWS inválida: formato não é hex.');
  }

  return prefixed;
}

export async function verifySiws(params: VerifySiwsParams): Promise<VerifySiwsResult> {
  const {
    message,
    signature,
    address,
    nonceRecord,
    expectedDomain,
    expectedUri,
    expectedGenesisHash,
    now = new Date(),
  } = params;

  if (nonceRecord.usedAt) {
    throw new Error('Nonce já utilizado.');
  }

  const payload = parseMessage(message);

  if (payload.address !== address) {
    throw new Error('Endereço na mensagem diverge do informado.');
  }

  assertMessageAgainstEnv(payload, {
    domain: expectedDomain,
    uri: expectedUri,
    genesisHash: expectedGenesisHash,
    now,
    maxSkewSeconds: 0,
  });

  if (nonceRecord.domain !== expectedDomain) {
    throw new Error('Domain inválido na mensagem SIWS.');
  }

  if (nonceRecord.uri !== expectedUri) {
    throw new Error('URI inválida na mensagem SIWS.');
  }

  if (nonceRecord.genesis !== expectedGenesisHash) {
    throw new Error('Genesis hash inválido na mensagem SIWS.');
  }

  if (payload.nonce !== nonceRecord.nonce) {
    throw new Error('Nonce da mensagem não corresponde ao nonce emitido.');
  }

  const issuedAtMs = Date.parse(payload.issuedAt);
  const expiresAtMs = Date.parse(payload.expiresAt);

  if (Number.isNaN(issuedAtMs) || Number.isNaN(expiresAtMs)) {
    throw new Error('Datas issuedAt/expiresAt inválidas.');
  }

  if (expiresAtMs <= issuedAtMs) {
    throw new Error('Expiração deve ser posterior ao issuedAt.');
  }

  if (nonceRecord.issuedAt.getTime() !== issuedAtMs) {
    throw new Error('issuedAt divergente do nonce emitido.');
  }

  if (nonceRecord.expiresAt.getTime() !== expiresAtMs) {
    throw new Error('expiresAt divergente do nonce emitido.');
  }

  if (now.getTime() < issuedAtMs) {
    throw new Error('Nonce SIWS ainda não é válido.');
  }

  if (now.getTime() > expiresAtMs) {
    throw new Error('Nonce SIWS expirado.');
  }

  const normalizedSignature = normalizeSignature(signature);

  await ensureCryptoReady();

  const verification = signatureVerify(message, normalizedSignature, address);

  if (!verification.isValid) {
    throw new Error('Assinatura SIWS inválida.');
  }

  return { payload };
}
