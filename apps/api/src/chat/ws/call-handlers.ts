import { WebSocket } from 'ws';
import { prisma } from '../../lib/prisma.js';
import { sendToProfile, getConnectionByProfileId } from './handlers.js';
import { sendIncomingCallPush } from '../../lib/web-push.js';
import {
  savePendingCall,
  getPendingCall,
  deletePendingCall,
  type PendingCallData,
} from './call-redis.js';
import type { CallType } from '@bazari/shared-types';

// Map de chamadas ativas: callId -> { callerId, calleeId, startedAt }
const activeCalls = new Map<string, {
  callerId: string;
  calleeId: string;
  startedAt?: Date;
}>();

// Timeout para chamada não atendida (90 segundos - extended for offline users)
const RING_TIMEOUT = 90000;
const ringTimeouts = new Map<string, NodeJS.Timeout>();

export async function handleCallOffer(
  socket: WebSocket,
  profileId: string,
  data: { threadId: string; calleeId: string; type: CallType; sdp: string }
) {
  const callerId = profileId;
  const { threadId, calleeId, type, sdp } = data;

  console.log('[Call] Offer received:', { callerId, calleeId, type, threadId });

  // Verificar se callee está online
  const calleeConn = getConnectionByProfileId(calleeId);
  const calleeIsOnline = !!calleeConn;

  // Verificar se caller já está em chamada
  for (const [, call] of activeCalls) {
    if (call.callerId === callerId || call.calleeId === callerId) {
      console.log('[Call] Caller already in call');
      socket.send(JSON.stringify({
        op: 'call:ended',
        data: { callId: '', reason: 'busy' },
      }));
      return;
    }
  }

  // Verificar se callee já está em chamada
  for (const [, call] of activeCalls) {
    if (call.callerId === calleeId || call.calleeId === calleeId) {
      console.log('[Call] Callee is busy');
      socket.send(JSON.stringify({
        op: 'call:ended',
        data: { callId: '', reason: 'busy' },
      }));
      return;
    }
  }

  // Criar registro da chamada
  const call = await prisma.call.create({
    data: {
      threadId,
      callerId,
      calleeId,
      type,
      status: 'RINGING',
    },
  });

  console.log('[Call] Created call:', call.id);

  // Rastrear chamada ativa
  activeCalls.set(call.id, { callerId, calleeId });

  // Buscar dados do caller
  const caller = await prisma.profile.findUnique({
    where: { id: callerId },
    select: { id: true, handle: true, displayName: true, avatarUrl: true },
  });

  // Notificar callee via WebSocket se online
  let sentToCallee = false;
  if (calleeIsOnline) {
    sentToCallee = sendToProfile(calleeId, {
      op: 'call:incoming',
      data: {
        callId: call.id,
        threadId,
        caller,
        type,
        sdp,
      },
    });
    console.log('[Call] Sent incoming call to callee via WS:', { calleeId, sent: sentToCallee });
  }

  // Se callee está offline ou falhou envio WS, tentar push notification e salvar no Redis
  if (!calleeIsOnline || !sentToCallee) {
    console.log('[Call] Callee offline or WS failed, sending push notification and saving to Redis');
    const callerName = caller?.displayName || caller?.handle || 'Alguém';

    // Salvar chamada pendente no Redis para recuperação quando callee reconectar
    const pendingCallData: PendingCallData = {
      callId: call.id,
      threadId,
      callerId,
      calleeId,
      type,
      sdp,
      caller: {
        id: caller?.id || callerId,
        handle: caller?.handle || '',
        displayName: caller?.displayName || null,
        avatarUrl: caller?.avatarUrl || null,
      },
      createdAt: Date.now(),
    };

    await savePendingCall(calleeId, pendingCallData);

    const pushSent = await sendIncomingCallPush(
      calleeId,
      callerName,
      caller?.avatarUrl || null,
      type,
      threadId,
      call.id
    );
    console.log('[Call] Push notification sent:', { calleeId, pushSent });
  }

  // Notificar caller que está chamando
  socket.send(JSON.stringify({
    op: 'call:ringing',
    data: { callId: call.id },
  }));

  // Timeout para chamada perdida
  const timeout = setTimeout(async () => {
    const activeCall = activeCalls.get(call.id);
    if (activeCall && !activeCall.startedAt) {
      console.log('[Call] Timeout - missed call:', call.id);
      await endCall(call.id, 'missed');
    }
  }, RING_TIMEOUT);

  ringTimeouts.set(call.id, timeout);
}

export async function handleCallAnswer(
  socket: WebSocket,
  profileId: string,
  data: { callId: string; sdp: string }
) {
  const { callId, sdp } = data;

  console.log('[Call] Answer received:', { callId, profileId });

  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call || call.calleeId !== profileId) {
    console.log('[Call] Invalid call answer');
    return;
  }

  // Limpar timeout
  const timeout = ringTimeouts.get(callId);
  if (timeout) {
    clearTimeout(timeout);
    ringTimeouts.delete(callId);
  }

  // Limpar chamada pendente do Redis
  await deletePendingCall(profileId);

  // Atualizar status
  const startedAt = new Date();
  await prisma.call.update({
    where: { id: callId },
    data: { status: 'ONGOING', startedAt },
  });

  // Atualizar tracking
  const activeCall = activeCalls.get(callId);
  if (activeCall) {
    activeCall.startedAt = startedAt;
  }

  console.log('[Call] Call answered:', callId);

  // Notificar caller
  sendToProfile(call.callerId, {
    op: 'call:answered',
    data: { callId, sdp },
  });
}

export async function handleCallReject(
  _socket: WebSocket,
  _profileId: string,
  data: { callId: string }
) {
  const { callId } = data;
  console.log('[Call] Reject received:', callId);
  await endCall(callId, 'rejected');
}

export async function handleCallEnd(
  _socket: WebSocket,
  _profileId: string,
  data: { callId: string }
) {
  const { callId } = data;
  console.log('[Call] End received:', callId);
  await endCall(callId, 'ended');
}

export async function handleIceCandidate(
  _socket: WebSocket,
  profileId: string,
  data: { callId: string; candidate: RTCIceCandidateInit }
) {
  const { callId, candidate } = data;

  console.log('[Call] ICE candidate received:', { callId, profileId, candidateType: candidate?.candidate?.substring(0, 50) });

  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call) {
    console.log('[Call] ICE candidate for unknown call:', callId);
    return;
  }

  // Encaminhar para o outro participante
  const targetId = call.callerId === profileId ? call.calleeId : call.callerId;
  const sent = sendToProfile(targetId, {
    op: 'ice:candidate',
    data: { callId, candidate },
  });
  console.log('[Call] ICE candidate forwarded to:', { targetId, sent });
}

async function endCall(callId: string, reason: 'ended' | 'missed' | 'rejected' | 'busy') {
  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call) return;

  // Limpar timeout
  const timeout = ringTimeouts.get(callId);
  if (timeout) {
    clearTimeout(timeout);
    ringTimeouts.delete(callId);
  }

  // Limpar chamada pendente do Redis
  await deletePendingCall(call.calleeId);

  // Calcular duração
  const activeCall = activeCalls.get(callId);
  const duration = activeCall?.startedAt
    ? Math.floor((Date.now() - activeCall.startedAt.getTime()) / 1000)
    : undefined;

  // Atualizar banco
  const status = reason === 'ended' ? 'ENDED'
    : reason === 'missed' ? 'MISSED'
    : reason === 'rejected' ? 'REJECTED'
    : 'BUSY';

  await prisma.call.update({
    where: { id: callId },
    data: {
      status,
      endedAt: new Date(),
      duration,
    },
  });

  // Remover do tracking
  activeCalls.delete(callId);

  console.log('[Call] Call ended:', { callId, reason, duration });

  // Notificar ambos participantes
  const endData = { callId, reason, duration };
  sendToProfile(call.callerId, { op: 'call:ended', data: endData });
  sendToProfile(call.calleeId, { op: 'call:ended', data: endData });
}

// Limpar chamada quando usuário desconecta
export function handleCallDisconnect(profileId: string) {
  for (const [callId, call] of activeCalls) {
    if (call.callerId === profileId || call.calleeId === profileId) {
      console.log('[Call] User disconnected during call:', { profileId, callId });
      endCall(callId, 'ended');
    }
  }
}

// Verificar se um profile está em chamada
export function isInCall(profileId: string): boolean {
  for (const [, call] of activeCalls) {
    if (call.callerId === profileId || call.calleeId === profileId) {
      return true;
    }
  }
  return false;
}

/**
 * Verifica se há chamada pendente para um usuário que acabou de reconectar.
 * Se houver, envia a chamada para o usuário imediatamente.
 * Esta função deve ser chamada quando um usuário conecta ao WebSocket.
 */
export async function checkPendingCallOnConnect(
  profileId: string,
  sendToSocket: (msg: any) => void
): Promise<boolean> {
  try {
    const pendingCall = await getPendingCall(profileId);

    if (!pendingCall) {
      return false;
    }

    // Verificar se a chamada ainda está ativa no banco
    const call = await prisma.call.findUnique({
      where: { id: pendingCall.callId },
    });

    if (!call || call.status !== 'RINGING') {
      // Chamada não existe mais ou não está mais tocando
      await deletePendingCall(profileId);
      console.log('[Call] Pending call no longer valid:', pendingCall.callId);
      return false;
    }

    // Verificar se o caller ainda está online
    const callerConn = getConnectionByProfileId(pendingCall.callerId);
    if (!callerConn) {
      // Caller desconectou, chamada não é mais válida
      await deletePendingCall(profileId);
      console.log('[Call] Caller disconnected, pending call invalid:', pendingCall.callId);
      return false;
    }

    console.log('[Call] Delivering pending call to reconnected user:', {
      calleeId: profileId,
      callId: pendingCall.callId,
    });

    // Rastrear chamada ativa se ainda não estiver rastreada
    if (!activeCalls.has(pendingCall.callId)) {
      activeCalls.set(pendingCall.callId, {
        callerId: pendingCall.callerId,
        calleeId: pendingCall.calleeId,
      });
    }

    // Enviar chamada para o usuário reconectado
    sendToSocket({
      op: 'call:incoming',
      data: {
        callId: pendingCall.callId,
        threadId: pendingCall.threadId,
        caller: pendingCall.caller,
        type: pendingCall.type,
        sdp: pendingCall.sdp,
      },
    });

    return true;
  } catch (error) {
    console.error('[Call] Error checking pending call:', error);
    return false;
  }
}
