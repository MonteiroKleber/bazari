import { hasEncryptedSeed } from './crypto.store';
import { isSessionActive } from './session';

export enum UserState {
  NEW_USER = 'NEW_USER',           // Nunca criou conta neste dispositivo
  HAS_VAULT = 'HAS_VAULT',          // Tem vault (conta) mas sessão expirada
  AUTHENTICATED = 'AUTHENTICATED'   // Sessão ativa
}

/**
 * Detecta o estado atual do usuário para roteamento inteligente
 */
export async function detectUserState(): Promise<UserState> {
  const sessionActive = isSessionActive();

  if (sessionActive) {
    return UserState.AUTHENTICATED;
  }

  const hasVault = await hasEncryptedSeed();

  if (hasVault) {
    return UserState.HAS_VAULT;
  }

  return UserState.NEW_USER;
}
