import '@polkadot/api-augment';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { Keyring } from '@polkadot/keyring';
import type { KeyringPair } from '@polkadot/keyring/types';
import { env } from '../env.js';

const WS_ENDPOINT = env.BAZARICHAIN_WS ?? 'ws://127.0.0.1:9944';
const SUDO_SEED = env.BAZARICHAIN_SUDO_SEED ?? '//Alice';

let apiPromise: Promise<ApiPromise> | null = null;
let cryptoReady: Promise<boolean> | null = null;
let sudoAccountCache: KeyringPair | null = null;

async function ensureCryptoReady() {
  if (!cryptoReady) {
    cryptoReady = cryptoWaitReady();
  }
  await cryptoReady;
}

async function getApi(): Promise<ApiPromise> {
  await ensureCryptoReady();
  if (!apiPromise) {
    console.log('[ProfilesChain] Creating API connection to:', WS_ENDPOINT);

    try {
      // Criar WsProvider SEM autoConnect, e conectar manualmente
      console.log('[ProfilesChain] Creating WsProvider...');
      const provider = new WsProvider(WS_ENDPOINT, false);

      // Conectar manualmente com timeout
      console.log('[ProfilesChain] Connecting to WebSocket...');
      await Promise.race([
        provider.connect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('WebSocket connection timeout')), 10000))
      ]);

      console.log('[ProfilesChain] WebSocket connected, creating ApiPromise...');

      provider.on('disconnected', () => {
        console.log('[ProfilesChain] WebSocket disconnected');
        apiPromise = null;
      });

      provider.on('error', (err) => {
        console.error('[ProfilesChain] WebSocket error:', err);
      });

      apiPromise = ApiPromise.create({ provider }).then((api) => {
        console.log('[ProfilesChain] API connected successfully');
        api.on('error', (err) => {
          console.error('[ProfilesChain] API error:', err);
          apiPromise = null;
        });
        return api;
      }).catch((err) => {
        console.error('[ProfilesChain] Failed to create API:', err);
        apiPromise = null;
        throw err;
      });
    } catch (err) {
      console.error('[ProfilesChain] Exception creating provider:', err);
      apiPromise = null;
      throw err;
    }
  }
  return apiPromise;
}

export async function getProfilesApi(): Promise<ApiPromise> {
  return getApi();
}

async function getSudoAccount(): Promise<KeyringPair> {
  await ensureCryptoReady();

  if (!sudoAccountCache) {
    const keyring = new Keyring({ type: 'sr25519' });
    sudoAccountCache = keyring.addFromUri(SUDO_SEED);
  }

  return sudoAccountCache;
}

async function getAccountFromAddress(address: string): Promise<KeyringPair> {
  await ensureCryptoReady();

  const keyring = new Keyring({ type: 'sr25519' });
  // Em produção, isso seria uma conta gerenciada de forma segura
  // Por enquanto, usamos a conta sudo para simplificar
  return keyring.addFromUri(SUDO_SEED);
}

/**
 * Minta um perfil NFT on-chain
 */
export async function mintProfileOnChain(
  address: string,
  handle: string,
  cid: string
): Promise<bigint> {
  try {
    console.log('[ProfilesChain] Starting mintProfileOnChain:', { address, handle, cid: cid.substring(0, 20) + '...' });

    const api = await getApi();
    console.log('[ProfilesChain] API connected');

    const sudoAccount = await getSudoAccount();
    console.log('[ProfilesChain] Sudo account loaded:', sudoAccount.address);

    // Verificar se o pallet existe
    if (!(api.tx as any).bazariIdentity) {
      throw new Error('Pallet bazariIdentity not found in runtime. Is the node running with the correct runtime?');
    }

    return new Promise((resolve, reject) => {
      const tx = (api.tx as any).bazariIdentity.mintProfile(address, handle, cid);
      console.log('[ProfilesChain] Transaction created, signing and sending...');

      let profileId: bigint | null = null;

      tx.signAndSend(sudoAccount, ({ status, events, dispatchError }: any) => {
        console.log('[ProfilesChain] Transaction status:', status.type);

        if (dispatchError) {
          console.error('[ProfilesChain] Dispatch error occurred');
          if (dispatchError.isModule) {
            const decoded = api.registry.findMetaError(dispatchError.asModule);
            const { docs, name, section } = decoded;
            const errorMsg = `${section}.${name}: ${docs.join(' ')}`;
            console.error('[ProfilesChain] Module error:', errorMsg);
            reject(new Error(errorMsg));
          } else {
            const errorMsg = dispatchError.toString();
            console.error('[ProfilesChain] Generic error:', errorMsg);
            reject(new Error(errorMsg));
          }
          return;
        }

        if (status.isInBlock || status.isFinalized) {
          console.log('[ProfilesChain] Transaction in block, processing events...');

          events.forEach(({ event }: any) => {
            console.log('[ProfilesChain] Event:', event.section, event.method);

            if (api.events.bazariIdentity?.ProfileMinted?.is(event)) {
              const [profileIdRaw] = event.data;
              profileId = BigInt(profileIdRaw.toString());
              console.log('[ProfilesChain] ProfileMinted event found, profileId:', profileId);
            }
          });

          if (profileId !== null) {
            console.log('[ProfilesChain] Success! Profile minted with ID:', profileId);
            resolve(profileId);
          } else {
            const errorMsg = 'ProfileMinted event not found in transaction events';
            console.error('[ProfilesChain]', errorMsg);
            console.error('[ProfilesChain] Available events:', events.map((e: any) => `${e.event.section}.${e.event.method}`).join(', '));
            reject(new Error(errorMsg));
          }
        }
      }).catch((error: any) => {
        console.error('[ProfilesChain] Transaction failed:', error);
        reject(error);
      });
    });
  } catch (error) {
    console.error('[ProfilesChain] mintProfileOnChain failed:', error);
    throw error;
  }
}

/**
 * Obter ProfileId de uma conta
 */
export async function getProfileByAccount(
  address: string
): Promise<bigint | null> {
  const api = await getApi();

  try {
    const result = await (api.query as any).bazariIdentity.ownerProfile(address);
    if (!result || result.isNone) return null;
    return BigInt(result.unwrap().toString());
  } catch (error) {
    console.error('Error getting profile by account:', error);
    return null;
  }
}

/**
 * Obter ProfileId de um handle
 */
export async function getProfileByHandle(
  handle: string
): Promise<bigint | null> {
  const api = await getApi();

  try {
    const result = await (api.query as any).bazariIdentity.handleToProfile(handle);
    if (!result || result.isNone) return null;
    return BigInt(result.unwrap().toString());
  } catch (error) {
    console.error('Error getting profile by handle:', error);
    return null;
  }
}

/**
 * Obter reputação de um perfil
 */
export async function getReputation(
  profileId: bigint
): Promise<number> {
  const api = await getApi();

  try {
    const result = await (api.query as any).bazariIdentity.reputation(profileId.toString());
    return Number(result.toString());
  } catch (error) {
    console.error('Error getting reputation:', error);
    return 0;
  }
}

/**
 * Obter handle de um perfil
 */
export async function getHandle(
  profileId: bigint
): Promise<string | null> {
  const api = await getApi();

  try {
    const result = await (api.query as any).bazariIdentity.handle(profileId.toString());
    if (!result || result.isNone) return null;

    // Handle é BoundedVec<u8>, converter para string
    const bytes = result.unwrap();
    return Buffer.from(bytes).toString('utf8');
  } catch (error) {
    console.error('Error getting handle:', error);
    return null;
  }
}

/**
 * Obter CID de metadados de um perfil
 */
export async function getMetadataCid(
  profileId: bigint
): Promise<string | null> {
  const api = await getApi();

  try {
    const result = await (api.query as any).bazariIdentity.profileCid(profileId.toString());
    if (!result || result.isNone) return null;

    // CID é BoundedVec<u8>, converter para string
    const bytes = result.unwrap();
    return Buffer.from(bytes).toString('utf8');
  } catch (error) {
    console.error('Error getting metadata CID:', error);
    return null;
  }
}

/**
 * Atualizar CID de metadados (como owner)
 */
export async function updateMetadataCid(
  profileId: bigint,
  cid: string,
  signerAddress: string
): Promise<void> {
  const api = await getApi();
  const account = await getAccountFromAddress(signerAddress);

  const tx = (api.tx as any).bazariIdentity.updateMetadataCid(profileId.toString(), cid);

  return new Promise((resolve, reject) => {
    tx.signAndSend(account, ({ status, dispatchError }: any) => {
      if (dispatchError) {
        if (dispatchError.isModule) {
          const decoded = api.registry.findMetaError(dispatchError.asModule);
          const { docs, name, section } = decoded;
          reject(new Error(`${section}.${name}: ${docs.join(' ')}`));
        } else {
          reject(new Error(dispatchError.toString()));
        }
        return;
      }

      if (status.isInBlock || status.isFinalized) {
        resolve();
      }
    });
  });
}

/**
 * Incrementar reputação (como root/sudo)
 */
export async function incrementReputation(
  profileId: bigint,
  points: number,
  reasonCode: string
): Promise<void> {
  const api = await getApi();
  const sudoAccount = await getSudoAccount();

  const tx = (api.tx as any).bazariIdentity.incrementReputation(
    profileId.toString(),
    points,
    reasonCode
  );

  return new Promise((resolve, reject) => {
    // Executar como sudo
    const sudoTx = (api.tx as any).sudo.sudo(tx);

    sudoTx.signAndSend(sudoAccount, ({ status, dispatchError }: any) => {
      if (dispatchError) {
        if (dispatchError.isModule) {
          const decoded = api.registry.findMetaError(dispatchError.asModule);
          const { docs, name, section } = decoded;
          reject(new Error(`${section}.${name}: ${docs.join(' ')}`));
        } else {
          reject(new Error(dispatchError.toString()));
        }
        return;
      }

      if (status.isInBlock || status.isFinalized) {
        resolve();
      }
    });
  });
}

/**
 * Decrementar reputação (como root/sudo)
 */
export async function decrementReputation(
  profileId: bigint,
  points: number,
  reasonCode: string
): Promise<void> {
  const api = await getApi();
  const sudoAccount = await getSudoAccount();

  const tx = (api.tx as any).bazariIdentity.decrementReputation(
    profileId.toString(),
    points,
    reasonCode
  );

  return new Promise((resolve, reject) => {
    // Executar como sudo
    const sudoTx = (api.tx as any).sudo.sudo(tx);

    sudoTx.signAndSend(sudoAccount, ({ status, dispatchError }: any) => {
      if (dispatchError) {
        if (dispatchError.isModule) {
          const decoded = api.registry.findMetaError(dispatchError.asModule);
          const { docs, name, section } = decoded;
          reject(new Error(`${section}.${name}: ${docs.join(' ')}`));
        } else {
          reject(new Error(dispatchError.toString()));
        }
        return;
      }

      if (status.isInBlock || status.isFinalized) {
        resolve();
      }
    });
  });
}

/**
 * Conceder badge (como root/sudo)
 */
export async function awardBadge(
  profileId: bigint,
  code: string,
  issuer: number
): Promise<void> {
  const api = await getApi();
  const sudoAccount = await getSudoAccount();

  const tx = (api.tx as any).bazariIdentity.awardBadge(
    profileId.toString(),
    code,
    issuer
  );

  return new Promise((resolve, reject) => {
    // Executar como sudo
    const sudoTx = (api.tx as any).sudo.sudo(tx);

    sudoTx.signAndSend(sudoAccount, ({ status, dispatchError }: any) => {
      if (dispatchError) {
        if (dispatchError.isModule) {
          const decoded = api.registry.findMetaError(dispatchError.asModule);
          const { docs, name, section } = decoded;
          reject(new Error(`${section}.${name}: ${docs.join(' ')}`));
        } else {
          reject(new Error(dispatchError.toString()));
        }
        return;
      }

      if (status.isInBlock || status.isFinalized) {
        resolve();
      }
    });
  });
}

/**
 * Obter badges de um perfil
 */
export async function getBadges(
  profileId: bigint
): Promise<Array<{ code: string; issuer: number; issuedAt: number; revokedAt: number | null }>> {
  const api = await getApi();

  try {
    const result = await (api.query as any).bazariIdentity.badges(profileId.toString());

    if (!result) return [];

    // Badges é BoundedVec<Badge>
    const badges = [];
    for (const badge of result) {
      const code = Buffer.from(badge.code).toString('utf8');
      const issuer = Number(badge.issuer.toString());
      const issuedAt = Number(badge.issued_at.toString());
      const revokedAt = badge.revoked_at.isSome
        ? Number(badge.revoked_at.unwrap().toString())
        : null;

      badges.push({ code, issuer, issuedAt, revokedAt });
    }

    return badges;
  } catch (error) {
    console.error('Error getting badges:', error);
    return [];
  }
}
