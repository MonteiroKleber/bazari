/**
 * Google OAuth Login Service
 * Handles verification of Google ID tokens with backend
 */

export interface GoogleLoginResponse {
  success: boolean;
  isNewUser: boolean;
  user: {
    id: string;
    address: string;
    googleId: string;
  };
  accessToken: string;
  expiresIn: number;
  wallet?: {
    encryptedMnemonic: string;
    iv: string;
    salt: string;
    authTag: string;
  };
}

/**
 * Verifica Google ID token com o backend
 * @param idToken - Token JWT do Google (recebido do botão OAuth)
 * @returns Dados do usuário e wallet (se novo)
 */
export async function verifyGoogleToken(idToken: string, address?: string): Promise<GoogleLoginResponse> {
  const apiUrl = import.meta.env.VITE_API_URL || 'https://bazari.libervia.xyz';

  const response = await fetch(`${apiUrl}/api/auth/google/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Importante para receber cookies de refresh token
    body: JSON.stringify({ credential: idToken, address }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
    throw new Error(error.message || `Erro ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'Falha na verificação do token Google');
  }

  return data;
}

/**
 * Armazena access token no localStorage
 * @param token - JWT access token
 * @param expiresIn - Tempo de expiração em segundos
 */
export function storeAccessToken(token: string, expiresIn: number): void {
  const expiresAt = Date.now() + expiresIn * 1000;

  localStorage.setItem('access_token', token);
  localStorage.setItem('token_expires_at', expiresAt.toString());
}

/**
 * Recupera access token do localStorage
 * @returns Access token ou null se não existir/expirado
 */
export function getAccessToken(): string | null {
  const token = localStorage.getItem('access_token');
  const expiresAt = localStorage.getItem('token_expires_at');

  if (!token || !expiresAt) {
    return null;
  }

  // Verificar se expirou
  if (Date.now() >= parseInt(expiresAt, 10)) {
    clearAccessToken();
    return null;
  }

  return token;
}

/**
 * Remove access token do localStorage
 */
export function clearAccessToken(): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('token_expires_at');
}
