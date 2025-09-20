import { buildMessage, type BuildMessageParams } from '@bazari/siws-utils';

export interface SiwsNoncePayload {
  domain: string;
  uri: string;
  genesisHash: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  statement?: string;
  version?: string;
  chain?: string;
  resources?: string[];
}

export function buildSiwsMessage(address: string, payload: SiwsNoncePayload) {
  const params: BuildMessageParams = {
    address,
    domain: payload.domain,
    uri: payload.uri,
    genesisHash: payload.genesisHash,
    nonce: payload.nonce,
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
    statement: payload.statement,
    version: payload.version,
    chain: payload.chain,
    resources: payload.resources,
  };

  return buildMessage(params);
}

export { buildMessage };
