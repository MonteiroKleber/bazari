import { useUserAppsStore } from '../store';
import type { PermissionId } from '../types';

/**
 * Tipos de mensagens do SDK
 */
type MessageType =
  | 'auth:getCurrentUser'
  | 'auth:getPermissions'
  | 'wallet:getBalance'
  | 'wallet:getHistory'
  | 'wallet:requestTransfer'
  | 'storage:get'
  | 'storage:set'
  | 'storage:remove'
  | 'storage:clear'
  | 'ui:showToast'
  | 'ui:showConfirm'
  | 'ui:showModal'
  | 'ui:closeModal'
  | 'navigation:goTo'
  | 'navigation:openApp'
  | 'navigation:goBack'
  | 'events:subscribe'
  | 'events:unsubscribe'
  | 'events:emit'
  | 'location:getCurrentPosition'
  | 'location:watchPosition'
  | 'location:clearWatch'
  | 'location:calculateDistance'
  | 'location:geocode'
  | 'location:reverseGeocode'
  | 'maps:create'
  | 'maps:setCenter'
  | 'maps:setZoom'
  | 'maps:addMarker'
  | 'maps:removeMarker'
  | 'maps:clearMarkers'
  | 'maps:drawRoute'
  | 'maps:clearRoutes'
  | 'maps:fitBounds'
  | 'maps:destroy'
  | 'maps:showFullscreen'
  | 'maps:pickLocation'
  | 'maps:openNavigation'
  | 'contracts:deployLoyalty'
  | 'contracts:deployEscrow'
  | 'contracts:deployRevenueSplit'
  | 'contracts:list'
  | 'contracts:escrow:create'
  | 'contracts:loyalty:issuePoints'
  | 'contracts:loyalty:redeem'
  | 'contracts:loyalty:transfer'
  | 'contracts:loyalty:balanceOf'
  | 'contracts:loyalty:tierOf'
  | 'contracts:loyalty:totalEarnedOf'
  | 'contracts:loyalty:getInfo'
  | 'contracts:loyalty:addOperator'
  | 'contracts:loyalty:removeOperator'
  | 'contracts:escrow:fund'
  | 'contracts:escrow:confirmDelivery'
  | 'contracts:escrow:openDispute'
  | 'contracts:escrow:refund'
  | 'contracts:escrow:release'
  | 'contracts:escrow:getStatus'
  | 'contracts:revenueSplit:withdraw'
  | 'contracts:revenueSplit:pendingBalance'
  | 'contracts:revenueSplit:getParticipants'
  | 'contracts:revenueSplit:getTotalDistributed'
  | 'contracts:revenueSplit:addParticipant'
  | 'contracts:revenueSplit:removeParticipant'
  | 'contracts:revenueSplit:updateShare';

/**
 * Estrutura de uma mensagem do SDK (v0.2.0+)
 */
interface SDKMessage<T = unknown> {
  id: string;
  type: MessageType;
  payload: T;
  timestamp: number;
  sdkVersion: string;
  apiKey?: string;
  signature?: string;
}

/**
 * Estrutura da resposta do Host
 */
interface HostResponse<T = unknown> {
  id: string;
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: number;
}

/**
 * Registro de app verificado
 */
interface VerifiedApp {
  id: string;
  apiKey: string;
  secretKey?: string;
  allowedOrigins: string[];
  permissions: PermissionId[];
  status: 'active' | 'suspended';
  rateLimitTokens: number;
  rateLimitLastRefill: number;
}

/**
 * Cache de apps verificados (em produção, buscar do backend)
 */
const verifiedAppsCache = new Map<string, VerifiedApp>();

/**
 * Nonces usados (para replay protection)
 */
const usedNonces = new Set<string>();

/**
 * Configurações de segurança
 */
const SECURITY_CONFIG = {
  /** Janela de tempo para mensagens (60s) */
  MESSAGE_TIME_WINDOW_MS: 60000,
  /** Tolerância de clock skew (5s) */
  CLOCK_SKEW_TOLERANCE_MS: 5000,
  /** Rate limit: tokens por app */
  RATE_LIMIT_CAPACITY: 100,
  /** Rate limit: refill por segundo */
  RATE_LIMIT_REFILL_PER_SECOND: 10,
  /** Tempo para limpar nonces antigos (2 min) */
  NONCE_CLEANUP_INTERVAL_MS: 120000,
};

type MessageHandler = (
  appId: string,
  payload: unknown
) => Promise<unknown>;

const handlers: Partial<Record<MessageType, MessageHandler>> = {};

/**
 * Registra um handler para um tipo de mensagem
 */
export function registerHandler(
  type: MessageType,
  handler: MessageHandler
): void {
  handlers[type] = handler;
}

/**
 * Log de evento de segurança
 */
function logSecurityEvent(event: {
  type: 'invalid_origin' | 'invalid_api_key' | 'invalid_signature' | 'replay_attack' | 'rate_limit' | 'permission_denied' | 'message_processed';
  appId?: string;
  apiKey?: string;
  messageType?: string;
  origin?: string;
  details?: string;
}) {
  const logEntry = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  // Em produção, enviar para SIEM/logging system
  if (event.type !== 'message_processed') {
    console.warn('[HOST-BRIDGE SECURITY]', logEntry);
  }

  // TODO: Enviar para API de audit logs
  // await fetch('/api/security/audit', { method: 'POST', body: JSON.stringify(logEntry) });
}

/**
 * Verifica HMAC signature
 */
async function verifySignature(
  message: SDKMessage,
  secretKey: string
): Promise<boolean> {
  if (!message.signature) {
    return false;
  }

  try {
    const dataToVerify = JSON.stringify({
      id: message.id,
      type: message.type,
      payload: message.payload,
      timestamp: message.timestamp,
    });

    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const messageData = encoder.encode(dataToVerify);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureBuffer = Uint8Array.from(atob(message.signature), c => c.charCodeAt(0));
    return await crypto.subtle.verify('HMAC', key, signatureBuffer, messageData);
  } catch {
    return false;
  }
}

/**
 * Verifica replay protection (nonce + timestamp)
 */
function checkReplayProtection(message: SDKMessage): { valid: boolean; reason?: string } {
  const now = Date.now();
  const messageAge = now - message.timestamp;

  // Verificar se mensagem está dentro da janela de tempo
  if (messageAge > SECURITY_CONFIG.MESSAGE_TIME_WINDOW_MS) {
    return { valid: false, reason: 'Message too old' };
  }

  // Verificar clock skew (mensagem do futuro)
  if (messageAge < -SECURITY_CONFIG.CLOCK_SKEW_TOLERANCE_MS) {
    return { valid: false, reason: 'Message from future' };
  }

  // Verificar nonce único
  if (usedNonces.has(message.id)) {
    return { valid: false, reason: 'Nonce already used' };
  }

  // Registrar nonce
  usedNonces.add(message.id);

  // Limpar nonce após tempo
  setTimeout(() => {
    usedNonces.delete(message.id);
  }, SECURITY_CONFIG.NONCE_CLEANUP_INTERVAL_MS);

  return { valid: true };
}

/**
 * Verifica rate limit usando token bucket
 */
function checkRateLimit(app: VerifiedApp): boolean {
  const now = Date.now();
  const elapsed = (now - app.rateLimitLastRefill) / 1000;
  const tokensToAdd = elapsed * SECURITY_CONFIG.RATE_LIMIT_REFILL_PER_SECOND;

  // Refill tokens
  app.rateLimitTokens = Math.min(
    SECURITY_CONFIG.RATE_LIMIT_CAPACITY,
    app.rateLimitTokens + tokensToAdd
  );
  app.rateLimitLastRefill = now;

  // Consumir token
  if (app.rateLimitTokens >= 1) {
    app.rateLimitTokens -= 1;
    return true;
  }

  return false;
}

/**
 * Cache TTL em ms (5 minutos)
 */
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Cache de apps com TTL
 */
interface CachedApp {
  app: VerifiedApp;
  cachedAt: number;
}

const appCacheWithTTL = new Map<string, CachedApp>();

/**
 * Busca app verificado pelo API Key
 * Verifica cache local primeiro, depois busca do backend
 */
async function getVerifiedApp(apiKey: string): Promise<VerifiedApp | null> {
  // 1. Verificar cache com TTL
  const cached = appCacheWithTTL.get(apiKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.app;
  }

  // 2. Verificar cache legado (para apps nativos registrados via registerNativeApp)
  if (verifiedAppsCache.has(apiKey)) {
    return verifiedAppsCache.get(apiKey)!;
  }

  // 3. Apps nativos da plataforma (não precisam de validação externa)
  if (apiKey.startsWith('baz_native_')) {
    const app: VerifiedApp = {
      id: apiKey.replace('baz_native_', ''),
      apiKey,
      allowedOrigins: ['*'], // Apps nativos têm acesso amplo
      permissions: [], // Verificar via store
      status: 'active',
      rateLimitTokens: SECURITY_CONFIG.RATE_LIMIT_CAPACITY,
      rateLimitLastRefill: Date.now(),
    };
    verifiedAppsCache.set(apiKey, app);
    return app;
  }

  // 4. Apps de teste em desenvolvimento (aceitar sempre baz_test_*)
  if (apiKey.startsWith('baz_test_')) {
    const app: VerifiedApp = {
      id: apiKey.replace('baz_test_', ''),
      apiKey,
      allowedOrigins: ['*'],
      permissions: [], // Permissões são verificadas via user store
      status: 'active',
      rateLimitTokens: SECURITY_CONFIG.RATE_LIMIT_CAPACITY,
      rateLimitLastRefill: Date.now(),
    };
    verifiedAppsCache.set(apiKey, app);
    return app;
  }

  // 4.5 Apps em modo de preview de desenvolvimento (sem apiKey)
  // Criar app temporário para desenvolvimento local
  if (!apiKey || apiKey === 'undefined' || apiKey === '') {
    const devApp: VerifiedApp = {
      id: 'dev-preview',
      apiKey: 'baz_dev_preview',
      allowedOrigins: ['*'], // Permitir qualquer origem em dev
      permissions: [], // Permissões são verificadas via user store
      status: 'active',
      rateLimitTokens: SECURITY_CONFIG.RATE_LIMIT_CAPACITY,
      rateLimitLastRefill: Date.now(),
    };
    return devApp;
  }

  // 5. Apps externos - validar via API backend
  if (apiKey.startsWith('baz_app_') || apiKey.startsWith('baz_test_')) {
    try {
      const response = await fetch('/api/developer/internal/validate-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });

      const result = await response.json();

      if (!result.valid) {
        console.warn('[HOST-BRIDGE] Invalid API key:', result.error);
        return null;
      }

      const app: VerifiedApp = {
        id: result.app.id,
        apiKey,
        allowedOrigins: result.app.allowedOrigins || [],
        permissions: result.app.permissions || [],
        status: 'active',
        rateLimitTokens: result.app.rateLimitCapacity || SECURITY_CONFIG.RATE_LIMIT_CAPACITY,
        rateLimitLastRefill: Date.now(),
      };

      // Armazenar no cache com TTL
      appCacheWithTTL.set(apiKey, { app, cachedAt: Date.now() });
      return app;
    } catch (error) {
      console.error('[HOST-BRIDGE] Failed to validate API key:', error);
      return null;
    }
  }

  return null;
}

/**
 * Registra um app no cache (para apps nativos)
 */
export function registerNativeApp(appId: string, permissions: PermissionId[]): void {
  const apiKey = `baz_native_${appId}`;
  const app: VerifiedApp = {
    id: appId,
    apiKey,
    allowedOrigins: [window.location.origin],
    permissions,
    status: 'active',
    rateLimitTokens: SECURITY_CONFIG.RATE_LIMIT_CAPACITY,
    rateLimitLastRefill: Date.now(),
  };
  verifiedAppsCache.set(apiKey, app);
}

/**
 * Cria resposta de erro
 */
function createErrorResponse(
  messageId: string,
  code: string,
  message: string
): HostResponse {
  return {
    id: messageId,
    success: false,
    error: { code, message },
    timestamp: Date.now(),
  };
}

/**
 * Envia resposta para o iframe com origem específica
 */
function sendResponse(
  iframe: HTMLIFrameElement,
  response: HostResponse,
  targetOrigin: string
): void {
  iframe.contentWindow?.postMessage(response, targetOrigin);
}

/**
 * Processa mensagem recebida de um app com todas as validações de segurança
 */
export async function handleAppMessage(
  appId: string,
  message: SDKMessage,
  iframe: HTMLIFrameElement,
  sourceOrigin: string
): Promise<void> {
  // PREVIEW MODE: Se appId é 'dev-preview', ignorar validação de API Key
  // O Preview é um ambiente controlado onde o desenvolvedor está testando seu app
  const isDevPreview = appId === 'dev-preview';

  // 1. SEGURANÇA: Verificar API Key (apenas para apps não-preview)
  const apiKey = message.apiKey;
  if (!apiKey && !isDevPreview) {
    // Para retrocompatibilidade, permitir apps sem apiKey mas logar warning
    console.warn('[HOST-BRIDGE] Message without API Key from app:', appId);
  }

  // 2. Buscar app verificado (pular para dev-preview)
  let verifiedApp: VerifiedApp | null = null;

  if (isDevPreview) {
    // Dev Preview: criar app virtual com permissões de leitura
    verifiedApp = {
      id: 'dev-preview',
      apiKey: 'baz_dev_preview',
      allowedOrigins: ['*'], // Permitir qualquer origem em dev
      permissions: [],
      status: 'active',
      rateLimitTokens: SECURITY_CONFIG.RATE_LIMIT_CAPACITY,
      rateLimitLastRefill: Date.now(),
    };
  } else if (apiKey) {
    verifiedApp = await getVerifiedApp(apiKey);
    if (!verifiedApp) {
      logSecurityEvent({
        type: 'invalid_api_key',
        appId,
        apiKey: apiKey.substring(0, 12) + '...',
        messageType: message.type,
        origin: sourceOrigin,
      });
      sendResponse(
        iframe,
        createErrorResponse(message.id, 'INVALID_API_KEY', 'Invalid or expired API Key'),
        sourceOrigin
      );
      return;
    }

    // 3. SEGURANÇA: Verificar status do app
    if (verifiedApp.status !== 'active') {
      logSecurityEvent({
        type: 'invalid_api_key',
        appId,
        details: 'App suspended',
        messageType: message.type,
      });
      sendResponse(
        iframe,
        createErrorResponse(message.id, 'APP_SUSPENDED', 'App is suspended'),
        sourceOrigin
      );
      return;
    }

    // 4. SEGURANÇA: Verificar origem
    if (!verifiedApp.allowedOrigins.includes('*') && !verifiedApp.allowedOrigins.includes(sourceOrigin)) {
      logSecurityEvent({
        type: 'invalid_origin',
        appId,
        origin: sourceOrigin,
        messageType: message.type,
        details: `Expected: ${verifiedApp.allowedOrigins.join(', ')}`,
      });
      sendResponse(
        iframe,
        createErrorResponse(message.id, 'ORIGIN_MISMATCH', 'Origin not allowed for this app'),
        sourceOrigin
      );
      return;
    }

    // 5. SEGURANÇA: Verificar signature (se secretKey configurado)
    if (verifiedApp.secretKey) {
      const isValidSignature = await verifySignature(message, verifiedApp.secretKey);
      if (!isValidSignature) {
        logSecurityEvent({
          type: 'invalid_signature',
          appId,
          messageType: message.type,
        });
        sendResponse(
          iframe,
          createErrorResponse(message.id, 'INVALID_SIGNATURE', 'Message signature verification failed'),
          sourceOrigin
        );
        return;
      }
    }

    // 6. SEGURANÇA: Verificar replay protection
    const replayCheck = checkReplayProtection(message);
    if (!replayCheck.valid) {
      logSecurityEvent({
        type: 'replay_attack',
        appId,
        messageType: message.type,
        details: replayCheck.reason,
      });
      sendResponse(
        iframe,
        createErrorResponse(message.id, 'REPLAY_DETECTED', replayCheck.reason || 'Replay attack detected'),
        sourceOrigin
      );
      return;
    }

    // 7. SEGURANÇA: Verificar rate limit
    if (!checkRateLimit(verifiedApp)) {
      logSecurityEvent({
        type: 'rate_limit',
        appId,
        messageType: message.type,
      });
      sendResponse(
        iframe,
        createErrorResponse(message.id, 'RATE_LIMIT_EXCEEDED', 'Too many requests. Please slow down.'),
        sourceOrigin
      );
      return;
    }
  }

  // 8. Buscar handler
  const handler = handlers[message.type];

  let response: HostResponse;

  if (!handler) {
    response = createErrorResponse(
      message.id,
      'UNKNOWN_MESSAGE_TYPE',
      `Unknown message type: ${message.type}`
    );
  } else {
    try {
      // 9. SEGURANÇA: Verificar permissão
      const hasPermission = await checkPermission(appId, message.type);

      if (!hasPermission) {
        logSecurityEvent({
          type: 'permission_denied',
          appId,
          messageType: message.type,
        });
        response = createErrorResponse(
          message.id,
          'PERMISSION_DENIED',
          `App does not have permission for: ${message.type}`
        );
      } else {
        // 10. Executar handler
        const data = await handler(appId, message.payload);
        response = {
          id: message.id,
          success: true,
          data,
          timestamp: Date.now(),
        };

        logSecurityEvent({
          type: 'message_processed',
          appId,
          messageType: message.type,
        });
      }
    } catch (error) {
      response = createErrorResponse(
        message.id,
        'HANDLER_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  // 11. SEGURANÇA: Enviar resposta com origem específica
  sendResponse(iframe, response, sourceOrigin);
}

/**
 * Mapa de tipo de mensagem para permissão necessária
 * Formato: messageType -> permissionId (novo formato auth:read ou legado user.profile.read)
 */
const permissionMap: Record<string, string> = {
  // ============ AUTH ============
  // auth:getCurrentUser e auth:getPermissions são públicos para apps instalados
  // Não exigem permissão explícita pois:
  // 1. O usuário já está autenticado
  // 2. O app já foi instalado pelo usuário
  // 3. Saber quem é o usuário não é sensível (padrão de mercado iOS/Android)

  // ============ WALLET ============
  'wallet:getBalance': 'wallet:read',
  'wallet:getHistory': 'wallet:read',
  'wallet:requestTransfer': 'wallet:transfer',

  // ============ STORAGE ============
  'storage:get': 'storage:read',
  'storage:set': 'storage:write',
  'storage:remove': 'storage:write',
  'storage:clear': 'storage:write',

  // ============ UI ============
  'ui:showToast': 'ui:toast',
  'ui:showConfirm': 'ui:modal',
  'ui:showModal': 'ui:modal',
  'ui:closeModal': 'ui:modal',

  // ============ NAVIGATION ============
  // Navigation doesn't require special permissions
  // 'navigation:goTo': null,
  // 'navigation:openApp': null,
  // 'navigation:goBack': null,

  // ============ EVENTS ============
  'events:subscribe': 'events:subscribe',
  'events:unsubscribe': 'events:subscribe',
  'events:emit': 'events:emit',

  // ============ LOCATION ============
  'location:getCurrentPosition': 'location:read',
  'location:watchPosition': 'location:read',
  'location:clearWatch': 'location:read',
  'location:calculateDistance': 'location:read',
  'location:geocode': 'location:geocode',
  'location:reverseGeocode': 'location:geocode',

  // ============ MAPS ============
  'maps:create': 'maps:display',
  'maps:setCenter': 'maps:display',
  'maps:setZoom': 'maps:display',
  'maps:addMarker': 'maps:display',
  'maps:removeMarker': 'maps:display',
  'maps:clearMarkers': 'maps:display',
  'maps:drawRoute': 'maps:directions',
  'maps:clearRoutes': 'maps:directions',
  'maps:fitBounds': 'maps:display',
  'maps:destroy': 'maps:display',
  'maps:showFullscreen': 'maps:display',
  'maps:pickLocation': 'maps:display',
  'maps:openNavigation': 'maps:directions',

  // ============ CONTRACTS - Deploy ============
  'contracts:deployLoyalty': 'contracts:deploy',
  'contracts:deployEscrow': 'contracts:deploy',
  'contracts:deployRevenueSplit': 'contracts:deploy',
  'contracts:list': 'contracts:read',

  // ============ CONTRACTS - Escrow ============
  'contracts:escrow:create': 'contracts:execute',
  'contracts:escrow:fund': 'contracts:execute',
  'contracts:escrow:confirmDelivery': 'contracts:execute',
  'contracts:escrow:openDispute': 'contracts:execute',
  'contracts:escrow:refund': 'contracts:execute',
  'contracts:escrow:release': 'contracts:execute',
  'contracts:escrow:getStatus': 'contracts:read',

  // ============ CONTRACTS - Loyalty ============
  'contracts:loyalty:issuePoints': 'contracts:execute',
  'contracts:loyalty:redeem': 'contracts:execute',
  'contracts:loyalty:transfer': 'contracts:execute',
  'contracts:loyalty:balanceOf': 'contracts:read',
  'contracts:loyalty:tierOf': 'contracts:read',
  'contracts:loyalty:totalEarnedOf': 'contracts:read',
  'contracts:loyalty:getInfo': 'contracts:read',
  'contracts:loyalty:addOperator': 'contracts:execute',
  'contracts:loyalty:removeOperator': 'contracts:execute',

  // ============ CONTRACTS - RevenueSplit ============
  'contracts:revenueSplit:withdraw': 'contracts:execute',
  'contracts:revenueSplit:pendingBalance': 'contracts:read',
  'contracts:revenueSplit:getParticipants': 'contracts:read',
  'contracts:revenueSplit:getTotalDistributed': 'contracts:read',
  'contracts:revenueSplit:addParticipant': 'contracts:execute',
  'contracts:revenueSplit:removeParticipant': 'contracts:execute',
  'contracts:revenueSplit:updateShare': 'contracts:execute',
};

/**
 * Mapa de permissões legadas para o novo formato
 */
const legacyPermissionMap: Record<string, string> = {
  'user.profile.read': 'auth:read',
  'user.profile.write': 'auth:write',
  'wallet.balance.read': 'wallet:read',
  'wallet.history.read': 'wallet:read',
  'wallet.transfer.request': 'wallet:transfer',
  'storage.app': 'storage:read', // Implica também storage:write
  'notifications.send': 'ui:toast',
  'blockchain.read': 'contracts:read',
  'blockchain.sign': 'contracts:execute',
  'location': 'location:read',
};

/**
 * Normaliza permissão para o novo formato
 */
function normalizePermission(permission: string): string {
  return legacyPermissionMap[permission] || permission;
}

/**
 * Verifica se o app tem permissão para executar a ação
 */
async function checkPermission(
  appId: string,
  messageType: MessageType
): Promise<boolean> {
  const requiredPermission = permissionMap[messageType];

  // Algumas operações não precisam de permissão especial
  if (!requiredPermission) {
    return true;
  }

  // Apps em modo de preview de desenvolvimento têm acesso total
  // O Preview é um ambiente controlado onde o desenvolvedor está testando
  if (appId === 'dev-preview') {
    console.log(`[HostBridge] Dev preview: auto-allowing ${messageType}`);
    return true;
  }

  // Normalizar permissão para comparação
  const normalizedRequired = normalizePermission(requiredPermission);

  // Verificar se é um app externo (tem apiKey começando com baz_app_)
  // Apps externos são verificados via getVerifiedApp que já carrega permissões
  const verifiedApp = await getVerifiedAppByAppId(appId);
  if (verifiedApp && verifiedApp.permissions.length > 0) {
    // App externo - verificar permissões do DeveloperApp
    const hasPermission = verifiedApp.permissions.some(
      (p) => normalizePermission(p) === normalizedRequired
    );

    if (!hasPermission) {
      console.warn(`[HostBridge] External app ${appId} does not have permission: ${requiredPermission}`);
      return false;
    }
    return true;
  }

  // App da App Store - verificar localStorage (grantedPermissions)
  const store = useUserAppsStore.getState();

  // Verificar se app está instalado
  if (!store.isInstalled(appId)) {
    console.warn(`[HostBridge] App not installed: ${appId}`);
    return false;
  }

  // Verificar se permissão foi concedida pelo usuário
  const grantedPermissions = store.getAppPermissions(appId);

  // Verificar com normalização (aceita tanto formato novo quanto legado)
  const hasPermission = grantedPermissions.some(
    (p) => normalizePermission(p) === normalizedRequired
  );

  // Verificar também formato legado direto
  const hasLegacyPermission = grantedPermissions.includes(requiredPermission as PermissionId);

  if (!hasPermission && !hasLegacyPermission) {
    console.warn(`[HostBridge] Permission not granted for app ${appId}: ${requiredPermission}`);
    return false;
  }

  return true;
}

/**
 * Busca app verificado pelo appId (para apps externos)
 * Usa cache se disponível
 */
async function getVerifiedAppByAppId(appId: string): Promise<VerifiedApp | null> {
  // Verificar se já temos o app no cache pelo ID
  for (const [, cached] of appCacheWithTTL) {
    if (cached.app.id === appId) {
      return cached.app;
    }
  }

  // Verificar cache legado
  for (const [, app] of verifiedAppsCache) {
    if (app.id === appId) {
      return app;
    }
  }

  return null;
}

/**
 * Envia evento para um app específico com origem específica
 */
export function sendEventToApp(
  iframe: HTMLIFrameElement,
  eventType: string,
  data: unknown,
  targetOrigin: string = '*'
): void {
  iframe.contentWindow?.postMessage(
    {
      type: `event:${eventType}`,
      data,
      timestamp: Date.now(),
    },
    targetOrigin
  );
}

/**
 * Limpa cache de apps (para testes)
 */
export function clearAppsCache(): void {
  verifiedAppsCache.clear();
}

/**
 * Obtém estatísticas de segurança (para monitoramento)
 */
export function getSecurityStats(): {
  cachedApps: number;
  activeNonces: number;
} {
  return {
    cachedApps: verifiedAppsCache.size,
    activeNonces: usedNonces.size,
  };
}
