/**
 * Social Wallet Handler
 * Manages encrypted wallet data from social login
 */

import { saveAccount } from '@/modules/auth/crypto.store';

export interface SocialWalletData {
  encryptedMnemonic: string;
  iv: string;
  salt: string;
  authTag: string;
}

/**
 * Salva wallet social no IndexedDB local
 *
 * IMPORTANTE: O mnemonic já vem criptografado do servidor.
 * Aqui apenas salvamos localmente para que o usuário possa
 * acessar posteriormente com PIN.
 *
 * @param address - Address SR25519 da wallet
 * @param walletData - Dados criptografados do mnemonic
 * @param pin - PIN do usuário para re-criptografar localmente
 * @param name - Nome opcional da conta
 */
export async function saveSocialWallet(
  address: string,
  walletData: SocialWalletData,
  _pin: string,
  name?: string
): Promise<void> {
  // Nota MVP: Por enquanto salvamos direto o mnemonic criptografado do servidor
  // Na Fase 2 (MPC), isso será substituído por shares Shamir

  // O formato esperado pelo saveAccount é compatível
  await saveAccount({
    address,
    name,
    cipher: walletData.encryptedMnemonic,
    iv: walletData.iv,
    salt: walletData.salt,
    authTag: walletData.authTag, // CRÍTICO: authTag é necessário para AES-GCM
    iterations: 150000, // Matching backend encryptMnemonicWithPin
  });
}

/**
 * Verifica se já existe uma wallet social salva
 * @returns true se existe wallet configurada
 */
export async function hasSocialWallet(): Promise<boolean> {
  // Reusa função existente
  const { hasEncryptedSeed } = await import('@/modules/auth');
  return hasEncryptedSeed();
}

/**
 * Armazena dados de wallet pendente (antes de criar PIN)
 * @param address - Address da wallet
 * @param walletData - Dados criptografados
 * @param googleId - Google ID do usuário (necessário para re-criptografia)
 */
export function storePendingSocialWallet(address: string, walletData: SocialWalletData, googleId: string): void {
  const pending = {
    address,
    wallet: walletData,
    googleId,
    timestamp: Date.now(),
  };

  sessionStorage.setItem('pending_social_wallet', JSON.stringify(pending));
}

/**
 * Recupera dados de wallet pendente
 * @returns Dados pendentes ou null
 */
export function getPendingSocialWallet(): { address: string; wallet: SocialWalletData; googleId: string } | null {
  const stored = sessionStorage.getItem('pending_social_wallet');

  if (!stored) {
    return null;
  }

  try {
    const pending = JSON.parse(stored);

    // Expirar após 10 minutos
    if (Date.now() - pending.timestamp > 10 * 60 * 1000) {
      clearPendingSocialWallet();
      return null;
    }

    return {
      address: pending.address,
      wallet: pending.wallet,
      googleId: pending.googleId,
    };
  } catch (error) {
    console.error('Erro ao recuperar wallet pendente:', error);
    clearPendingSocialWallet();
    return null;
  }
}

/**
 * Limpa dados de wallet pendente
 */
export function clearPendingSocialWallet(): void {
  sessionStorage.removeItem('pending_social_wallet');
}

/**
 * Valida se a wallet local pertence ao googleId autenticado
 * @param googleId - Google ID (sub) do usuário autenticado
 * @param expectedAddress - Address que deveria estar no device
 * @returns true se a validação passar, false se houver mismatch
 */
export async function validateWalletOwnership(googleId: string, expectedAddress: string): Promise<boolean> {
  // Verificar se há googleId salvo localmente
  const storedGoogleId = localStorage.getItem('social_google_id');
  const storedAddress = localStorage.getItem('wallet_address');

  console.log('🔍 [Ownership Check] Validando ownership...');
  console.log('📧 Google ID autenticado:', googleId);
  console.log('📧 Google ID armazenado:', storedGoogleId);
  console.log('💼 Address esperado:', expectedAddress);
  console.log('💼 Address armazenado:', storedAddress);

  // Se não há nada armazenado, é um device limpo - OK
  if (!storedGoogleId && !storedAddress) {
    console.log('✅ [Ownership Check] Device limpo - OK');
    return true;
  }

  // Se há googleId armazenado, deve bater com o autenticado
  if (storedGoogleId && storedGoogleId !== googleId) {
    console.warn('⚠️ [Ownership Check] Google ID mismatch!');
    console.warn('   Esperado:', googleId);
    console.warn('   Encontrado:', storedGoogleId);
    return false;
  }

  // Se há address armazenado, deve bater com o esperado
  if (storedAddress && storedAddress !== expectedAddress) {
    console.warn('⚠️ [Ownership Check] Address mismatch!');
    console.warn('   Esperado:', expectedAddress);
    console.warn('   Encontrado:', storedAddress);
    return false;
  }

  console.log('✅ [Ownership Check] Ownership validado - OK');
  return true;
}

/**
 * Limpa TODOS os dados de wallet e autenticação local
 * CUIDADO: Esta função apaga permanentemente dados locais
 */
export async function clearAllWalletData(): Promise<void> {
  console.log('🧹 [Cleanup] Limpando todos os dados de wallet...');

  // Clear localStorage
  localStorage.removeItem('social_google_id');
  localStorage.removeItem('wallet_address');
  localStorage.removeItem('bazari_access_token');

  // Clear sessionStorage
  sessionStorage.clear();

  // Clear IndexedDB (wallet encrypted seed)
  try {
    const { clearAllAccounts } = await import('@/modules/auth');
    await clearAllAccounts();
    console.log('✅ [Cleanup] IndexedDB limpo');
  } catch (error) {
    console.error('❌ [Cleanup] Erro ao limpar IndexedDB:', error);
  }

  console.log('✅ [Cleanup] Todos os dados locais foram limpos');
}

/**
 * Salva o Google ID para validação futura
 * @param googleId - Google ID (sub) do usuário
 * @param address - Address da wallet
 */
export function saveGoogleIdBinding(googleId: string, address: string): void {
  localStorage.setItem('social_google_id', googleId);
  localStorage.setItem('wallet_address', address);
  console.log('💾 [Binding] Google ID e address salvos:', { googleId: googleId.substring(0, 10) + '...', address });
}
