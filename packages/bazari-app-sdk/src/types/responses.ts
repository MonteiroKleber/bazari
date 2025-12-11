/**
 * Usuário retornado pelo SDK
 */
export interface SDKUser {
  id: string;
  handle: string;
  displayName: string;
  avatar?: string;
  roles: string[];
}

/**
 * Saldo retornado pelo SDK
 */
export interface SDKBalance {
  bzr: string;
  zari: string;
  formatted: {
    bzr: string;
    zari: string;
  };
}

/**
 * Transação no histórico
 */
export interface SDKTransaction {
  id: string;
  type: 'transfer' | 'reward' | 'purchase' | 'sale';
  amount: string;
  token: 'BZR' | 'ZARI';
  from?: string;
  to?: string;
  memo?: string;
  timestamp: string;
  status: 'pending' | 'confirmed' | 'failed';
}

/**
 * Resultado de transferência
 */
export interface SDKTransferResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

/**
 * Resultado de confirmação UI
 */
export interface SDKConfirmResult {
  confirmed: boolean;
}

/**
 * Permissões do app
 */
export interface SDKPermissions {
  granted: string[];
  denied: string[];
}

/**
 * Contrato deployado
 */
export interface SDKDeployedContract {
  type: 'loyalty' | 'escrow' | 'revenue-split';
  address: string;
  deployedAt: string;
}

/**
 * Info de programa de fidelidade
 */
export interface SDKLoyaltyInfo {
  name: string;
  symbol: string;
  totalSupply: string;
  bzrToPointsRatio: number;
  pointsToBzrRatio: number;
}

/**
 * Info de escrow
 */
export interface SDKEscrowInfo {
  id: string;
  buyer: string;
  seller: string;
  amount: string;
  status: 'Pending' | 'Funded' | 'Delivered' | 'Released' | 'Refunded' | 'Disputed';
  description: string;
  createdAt: string;
  deadline: string;
}

/**
 * Info de participante revenue split
 */
export interface SDKParticipantInfo {
  address: string;
  shareBps: number;
  pendingBalance: string;
}

/**
 * Coordenadas geográficas
 */
export interface SDKCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
}

/**
 * Posição geográfica
 */
export interface SDKPosition {
  coords: SDKCoordinates;
  timestamp: number;
}

/**
 * Resultado de cálculo de distância
 */
export interface SDKDistanceResult {
  distanceKm: number;
  distanceMeters: number;
  durationMinutes?: number;
  durationSeconds?: number;
}

/**
 * Resultado de rota
 */
export interface SDKRouteResult {
  distanceKm: number;
  durationMinutes: number;
  polyline: SDKCoordinates[];
  steps?: {
    instruction: string;
    distance: number;
    duration: number;
  }[];
}

/**
 * Respostas por tipo de mensagem
 */
export interface ResponseTypes {
  'auth:getCurrentUser': SDKUser;
  'auth:getPermissions': SDKPermissions;
  'wallet:getBalance': SDKBalance;
  'wallet:getHistory': SDKTransaction[];
  'wallet:requestTransfer': SDKTransferResult;
  'storage:get': unknown;
  'storage:set': void;
  'storage:remove': void;
  'storage:clear': void;
  'ui:showToast': void;
  'ui:showConfirm': SDKConfirmResult;
  'ui:showModal': void;
  'ui:closeModal': void;
  'navigation:goTo': void;
  'navigation:openApp': void;
  'navigation:goBack': void;
  'events:subscribe': void;
  'events:unsubscribe': void;
  // Location
  'location:getCurrentPosition': SDKPosition;
  'location:watchPosition': void;
  'location:clearWatch': void;
  'location:calculateDistance': SDKDistanceResult;
  'location:geocode': SDKCoordinates | null;
  'location:reverseGeocode': string | null;
  // Maps
  'maps:create': void;
  'maps:setCenter': void;
  'maps:setZoom': void;
  'maps:addMarker': void;
  'maps:removeMarker': void;
  'maps:clearMarkers': void;
  'maps:drawRoute': SDKRouteResult;
  'maps:clearRoutes': void;
  'maps:fitBounds': void;
  'maps:destroy': void;
  'maps:showFullscreen': void;
  'maps:pickLocation': SDKCoordinates | null;
  'maps:openNavigation': void;
  // Contracts - Deploy
  'contracts:deployLoyalty': SDKDeployedContract;
  'contracts:deployEscrow': SDKDeployedContract;
  'contracts:deployRevenueSplit': SDKDeployedContract;
  'contracts:list': SDKDeployedContract[];
  // Contracts - Loyalty
  'contracts:loyalty:issuePoints': void;
  'contracts:loyalty:redeem': { bzrValue: string };
  'contracts:loyalty:transfer': void;
  'contracts:loyalty:balanceOf': string;
  'contracts:loyalty:tierOf': 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  'contracts:loyalty:totalEarnedOf': string;
  'contracts:loyalty:getInfo': SDKLoyaltyInfo;
  'contracts:loyalty:addOperator': void;
  'contracts:loyalty:removeOperator': void;
  // Contracts - Escrow
  'contracts:escrow:create': { id: string };
  'contracts:escrow:fund': void;
  'contracts:escrow:confirmDelivery': void;
  'contracts:escrow:openDispute': void;
  'contracts:escrow:refund': void;
  'contracts:escrow:release': void;
  'contracts:escrow:getStatus': SDKEscrowInfo;
  // Contracts - Revenue Split
  'contracts:revenueSplit:withdraw': { amount: string };
  'contracts:revenueSplit:pendingBalance': string;
  'contracts:revenueSplit:getParticipants': SDKParticipantInfo[];
  'contracts:revenueSplit:getTotalDistributed': string;
  'contracts:revenueSplit:addParticipant': void;
  'contracts:revenueSplit:removeParticipant': void;
  'contracts:revenueSplit:updateShare': void;
}
