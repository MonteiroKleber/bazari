/**
 * VR WebSocket Message Types
 * Mensagens trocadas entre client e server no mundo VR
 */

// ============ Client → Server Messages ============

export interface AvatarMoveMessage {
  op: 'avatar:move';
  data: {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    animation?: 'idle' | 'walk' | 'run' | 'jump';
    worldZone: 'plaza' | 'avenue' | 'auditorium' | 'building';
  };
}

export interface ChatSendMessage {
  op: 'chat:send';
  data: {
    message: string;
    worldZone: 'plaza' | 'avenue' | 'auditorium' | 'building';
  };
}

export interface VoiceStartMessage {
  op: 'voice:start';
  data: {
    worldZone: 'plaza' | 'avenue' | 'auditorium' | 'building';
  };
}

export interface VoiceStopMessage {
  op: 'voice:stop';
  data: {
    worldZone: 'plaza' | 'avenue' | 'auditorium' | 'building';
  };
}

export interface PresenceMessage {
  op: 'presence';
  data: {
    status: 'online' | 'away' | 'offline';
  };
}

export type VRClientMessage =
  | AvatarMoveMessage
  | ChatSendMessage
  | VoiceStartMessage
  | VoiceStopMessage
  | PresenceMessage;

// ============ Server → Client Messages ============

export interface AvatarUpdateMessage {
  op: 'avatar:update';
  data: {
    userId: string;
    userName: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    animation?: 'idle' | 'walk' | 'run' | 'jump';
    worldZone: string;
  };
}

export interface AvatarJoinMessage {
  op: 'avatar:join';
  data: {
    userId: string;
    userName: string;
    avatarUrl?: string;
    position: { x: number; y: number; z: number };
    worldZone: string;
  };
}

export interface AvatarLeaveMessage {
  op: 'avatar:leave';
  data: {
    userId: string;
  };
}

export interface ChatBroadcastMessage {
  op: 'chat:broadcast';
  data: {
    userId: string;
    userName: string;
    message: string;
    worldZone: string;
    timestamp: string;
  };
}

export interface VoiceUserStartedMessage {
  op: 'voice:user_started';
  data: {
    userId: string;
    userName: string;
  };
}

export interface VoiceUserStoppedMessage {
  op: 'voice:user_stopped';
  data: {
    userId: string;
  };
}

export interface ZoneStatsMessage {
  op: 'zone:stats';
  data: {
    worldZone: string;
    onlineCount: number;
    avatars: Array<{
      userId: string;
      userName: string;
      position: { x: number; y: number; z: number };
    }>;
  };
}

export interface ErrorMessage {
  op: 'error';
  data: {
    code: string;
    message: string;
  };
}

export type VRServerMessage =
  | AvatarUpdateMessage
  | AvatarJoinMessage
  | AvatarLeaveMessage
  | ChatBroadcastMessage
  | VoiceUserStartedMessage
  | VoiceUserStoppedMessage
  | ZoneStatsMessage
  | ErrorMessage;

// ============ Internal Types ============

export interface VRConnection {
  userId: string;
  userName: string;
  avatarUrl?: string;
  worldZone: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  isVoiceActive: boolean;
  connectedAt: Date;
}
