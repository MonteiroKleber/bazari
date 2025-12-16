import { WebSocket } from 'ws';
import { prisma } from '../../lib/prisma.js';
import { sendToProfile, getConnectionByProfileId } from './handlers.js';
import { sendIncomingCallPush } from '../../lib/web-push.js';
import type { CallType } from '@bazari/shared-types';

// Map de chamadas ativas: callId -> { callerId, calleeId, startedAt }
const activeCalls = new Map<string, {
  callerId: string;
  calleeId: string;
  startedAt?: Date;
}>();

// Timeout para chamada não atendida (30 segundos)
const RING_TIMEOUT = 30000;
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

  // Se callee está offline ou falhou envio WS, tentar push notification
  if (!calleeIsOnline || !sentToCallee) {
    console.log('[Call] Callee offline or WS failed, sending push notification');
    const callerName = caller?.displayName || caller?.handle || 'Alguém';
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
