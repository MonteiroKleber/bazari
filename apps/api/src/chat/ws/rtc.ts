import { WebSocket } from 'ws';

/**
 * WebRTC Signaling via WebSocket
 * Relays SDP offers, answers e ICE candidates entre peers
 */

interface RTCMessage {
  op: 'rtc:offer' | 'rtc:answer' | 'rtc:candidate' | 'rtc:call-start' | 'rtc:call-end';
  data: {
    callId: string;
    from: string;
    to: string;
    sdp?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit;
    type?: 'audio' | 'video';
  };
}

interface ConnectionInfo {
  ws: WebSocket;
  profileId: string;
}

// Mapa de profileId -> WebSocket
const connections = new Map<string, ConnectionInfo>();

/**
 * Registra conexão WebSocket para sinalização RTC
 */
export function registerRTCConnection(profileId: string, ws: WebSocket): void {
  connections.set(profileId, { ws, profileId });

  ws.on('close', () => {
    connections.delete(profileId);
  });
}

/**
 * Envia mensagem RTC para peer específico
 */
function sendToPeer(profileId: string, message: RTCMessage): boolean {
  const conn = connections.get(profileId);

  if (!conn || conn.ws.readyState !== WebSocket.OPEN) {
    console.warn(`[RTC] Peer ${profileId} not connected`);
    return false;
  }

  try {
    conn.ws.send(JSON.stringify(message));
    return true;
  } catch (error) {
    console.error(`[RTC] Failed to send to peer ${profileId}:`, error);
    return false;
  }
}

/**
 * Handler: Relay SDP offer para destinatário
 */
export function handleOffer(message: RTCMessage): void {
  const { callId, from, to, sdp, type } = message.data;

  console.log(`[RTC] Offer from ${from} to ${to} for call ${callId}`);

  const success = sendToPeer(to, {
    op: 'rtc:offer',
    data: {
      callId,
      from,
      to,
      sdp,
      type,
    },
  });

  if (!success) {
    // Notificar remetente que destinatário está offline
    sendToPeer(from, {
      op: 'rtc:call-end',
      data: {
        callId,
        from: 'system',
        to: from,
      },
    });
  }
}

/**
 * Handler: Relay SDP answer para chamador
 */
export function handleAnswer(message: RTCMessage): void {
  const { callId, from, to, sdp } = message.data;

  console.log(`[RTC] Answer from ${from} to ${to} for call ${callId}`);

  sendToPeer(to, {
    op: 'rtc:answer',
    data: {
      callId,
      from,
      to,
      sdp,
    },
  });
}

/**
 * Handler: Relay ICE candidate para peer
 */
export function handleIceCandidate(message: RTCMessage): void {
  const { callId, from, to, candidate } = message.data;

  console.log(`[RTC] ICE candidate from ${from} to ${to} for call ${callId}`);

  sendToPeer(to, {
    op: 'rtc:candidate',
    data: {
      callId,
      from,
      to,
      candidate,
    },
  });
}

/**
 * Handler: Notifica início de chamada
 */
export function handleCallStart(message: RTCMessage): void {
  const { callId, from, to, type } = message.data;

  console.log(`[RTC] Call start from ${from} to ${to}, type: ${type}`);

  sendToPeer(to, {
    op: 'rtc:call-start',
    data: {
      callId,
      from,
      to,
      type,
    },
  });
}

/**
 * Handler: Notifica encerramento de chamada
 */
export function handleCallEnd(message: RTCMessage): void {
  const { callId, from, to } = message.data;

  console.log(`[RTC] Call end from ${from} to ${to}`);

  // Notificar ambos os peers
  sendToPeer(to, {
    op: 'rtc:call-end',
    data: {
      callId,
      from,
      to,
    },
  });

  sendToPeer(from, {
    op: 'rtc:call-end',
    data: {
      callId,
      from: to,
      to: from,
    },
  });
}

/**
 * Router principal para mensagens RTC
 */
export function handleRTCMessage(message: RTCMessage): void {
  switch (message.op) {
    case 'rtc:offer':
      handleOffer(message);
      break;
    case 'rtc:answer':
      handleAnswer(message);
      break;
    case 'rtc:candidate':
      handleIceCandidate(message);
      break;
    case 'rtc:call-start':
      handleCallStart(message);
      break;
    case 'rtc:call-end':
      handleCallEnd(message);
      break;
    default:
      console.warn(`[RTC] Unknown message type:`, message.op);
  }
}

/**
 * Verifica se peer está online
 */
export function isPeerOnline(profileId: string): boolean {
  const conn = connections.get(profileId);
  return conn !== undefined && conn.ws.readyState === WebSocket.OPEN;
}

/**
 * Retorna lista de peers online
 */
export function getOnlinePeers(): string[] {
  return Array.from(connections.keys());
}
