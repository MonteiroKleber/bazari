import { sendMessage } from '../utils/bridge';
import type { SDKUser, SDKPermissions } from '../types/responses';

/**
 * API de autenticação do SDK
 */
export class AuthClient {
  /**
   * Obtém o usuário atualmente logado
   */
  async getCurrentUser(): Promise<SDKUser> {
    return sendMessage('auth:getCurrentUser', undefined);
  }

  /**
   * Obtém as permissões concedidas ao app
   */
  async getPermissions(): Promise<SDKPermissions> {
    return sendMessage('auth:getPermissions', undefined);
  }

  /**
   * Verifica se o app tem uma permissão específica
   */
  async hasPermission(permissionId: string): Promise<boolean> {
    const permissions = await this.getPermissions();
    return permissions.granted.includes(permissionId);
  }
}
