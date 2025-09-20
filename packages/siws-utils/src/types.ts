export interface SiwsMessageFields {
  domain: string;
  address: string;
  uri: string;
  version?: string;
  chain?: string;
  genesisHash: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  resources?: string[];
  statement?: string;
}

export interface BuildMessageParams extends SiwsMessageFields {}

export interface AssertEnv {
  domain: string;
  uri: string;
  genesisHash: string;
  now?: Date;
  maxSkewSeconds?: number;
}

export class SiwsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SiwsError';
  }
}
