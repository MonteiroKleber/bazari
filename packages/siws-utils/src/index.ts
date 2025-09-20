import { differenceInSeconds, parseISO } from 'date-fns';
import { AssertEnv, BuildMessageParams, SiwsError, SiwsMessageFields } from './types.js';

const HEADER_SUFFIX = ' wants you to sign in with your Substrate account:';

export function buildMessage(params: BuildMessageParams): string {
  const lines: string[] = [];
  lines.push(`${params.domain}${HEADER_SUFFIX}`);
  lines.push(params.address);
  lines.push('');

  if (params.statement) {
    lines.push(params.statement.trim());
    lines.push('');
  }

  lines.push(`URI: ${params.uri}`);
  if (params.version) {
    lines.push(`Version: ${params.version}`);
  }
  if (params.chain) {
    lines.push(`Chain: ${params.chain}`);
  }
  lines.push(`Genesis Hash: ${params.genesisHash}`);
  lines.push(`Nonce: ${params.nonce}`);
  lines.push(`Issued At: ${params.issuedAt}`);
  lines.push(`Expires At: ${params.expiresAt}`);

  if (params.resources?.length) {
    lines.push('Resources:');
    for (const resource of params.resources) {
      lines.push(`- ${resource}`);
    }
  }

  return lines.join('\n');
}

export function parseMessage(message: string): SiwsMessageFields {
  const lines = message.split('\n');
  if (lines.length < 6) {
    throw new SiwsError('Malformed SIWS message.');
  }

  const header = lines[0];
  if (!header.endsWith(HEADER_SUFFIX)) {
    throw new SiwsError('Invalid SIWS header.');
  }
  const domain = header.slice(0, header.length - HEADER_SUFFIX.length);
  if (!domain.trim()) {
    throw new SiwsError('Missing domain.');
  }

  const address = lines[1]?.trim();
  if (!address) {
    throw new SiwsError('Missing address.');
  }

  let index = 2;
  while (index < lines.length && lines[index].trim() === '') {
    index += 1;
  }

  const statementLines: string[] = [];
  while (index < lines.length && !lines[index].startsWith('URI:')) {
    statementLines.push(lines[index]);
    index += 1;
  }

  const readPrefixed = (prefix: string, required = true) => {
    const value = lines[index]?.trim();
    if (!value?.startsWith(prefix)) {
      if (!required) {
        return undefined;
      }
      throw new SiwsError(`Missing ${prefix}`);
    }
    const parsed = value.slice(prefix.length).trim();
    if (!parsed && required) {
      throw new SiwsError(`Empty ${prefix}`);
    }
    index += 1;
    return parsed || undefined;
  };

  const uri = readPrefixed('URI:');
  const version = readPrefixed('Version:', false);
  const chain = readPrefixed('Chain:', false);
  const genesisHash = readPrefixed('Genesis Hash:');
  const nonce = readPrefixed('Nonce:');
  const issuedAt = readPrefixed('Issued At:');
  const expiresAt = readPrefixed('Expires At:');

  const resources: string[] = [];
  if (lines[index]?.startsWith('Resources:')) {
    index += 1;
    while (index < lines.length) {
      const line = lines[index].trim();
      if (!line.startsWith('- ')) {
        break;
      }
      resources.push(line.slice(2).trim());
      index += 1;
    }
  }

  return {
    domain: domain.trim(),
    address,
    uri: uri!,
    version,
    chain,
    genesisHash: genesisHash!,
    nonce: nonce!,
    issuedAt: issuedAt!,
    expiresAt: expiresAt!,
    resources: resources.length ? resources : undefined,
    statement: statementLines.length ? statementLines.join('\n').trim() : undefined,
  };
}

export function assertMessageAgainstEnv(message: SiwsMessageFields, env: AssertEnv) {
  const now = env.now ?? new Date();
  const skew = env.maxSkewSeconds ?? 60;

  if (message.domain !== env.domain) {
    throw new SiwsError('Domain mismatch.');
  }
  if (message.uri !== env.uri) {
    throw new SiwsError('URI mismatch.');
  }
  if (message.genesisHash !== env.genesisHash) {
    throw new SiwsError('Genesis hash mismatch.');
  }

  const issuedDate = parseISO(message.issuedAt);
  const expirationDate = parseISO(message.expiresAt);
  if (Number.isNaN(issuedDate.getTime()) || Number.isNaN(expirationDate.getTime())) {
    throw new SiwsError('Invalid issuedAt/expiration.');
  }
  if (expirationDate.getTime() <= issuedDate.getTime()) {
    throw new SiwsError('Expiration must be after issuedAt.');
  }

  if (differenceInSeconds(issuedDate, now) > skew) {
    throw new SiwsError('Message not yet valid.');
  }

  if (differenceInSeconds(now, expirationDate) > skew) {
    throw new SiwsError('Message expired.');
  }
}

export * from './types.js';
