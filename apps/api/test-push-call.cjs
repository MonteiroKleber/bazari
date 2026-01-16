const webpush = require('/root/bazari/node_modules/.pnpm/web-push@3.6.7/node_modules/web-push');
const { PrismaClient } = require('/root/bazari/node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/.prisma/client');

async function main() {
  const prisma = new PrismaClient();

  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@bazari.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  // Buscar profile do user_5eju4yvw
  const profile = await prisma.profile.findFirst({
    where: { handle: 'user_5eju4yvw' }
  });

  if (!profile) {
    console.log('Profile nao encontrado');
    await prisma.$disconnect();
    return;
  }

  console.log('Profile encontrado:', profile.id, profile.handle);

  const subs = await prisma.pushSubscription.findMany({
    where: { profileId: profile.id }
  });

  if (subs.length === 0) {
    console.log('Nenhuma subscription encontrada para este usuario!');
    console.log('O usuario precisa abrir o site e permitir notificacoes primeiro.');
    await prisma.$disconnect();
    return;
  }

  console.log('Enviando notificacao de chamada para', subs.length, 'dispositivos...\n');

  const payload = JSON.stringify({
    type: 'incoming_call',
    title: 'Chamada de voz',
    body: 'Joao esta ligando...',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: 'call-test-' + Date.now(),
    data: {
      type: 'incoming_call',
      callId: 'test-call-' + Date.now(),
      threadId: 'test-thread',
      callType: 'VOICE',
      callerName: 'Joao Silva',
      callerAvatar: null,
      url: '/app/chat/test-thread'
    }
  });

  for (const sub of subs) {
    console.log('Enviando para:', sub.userAgent?.substring(0, 50));
    
    try {
      const result = await webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth }
      }, payload, {
        TTL: 60,
        urgency: 'high'
      });
      console.log('Status:', result.statusCode, '- OK!\n');
    } catch (err) {
      console.log('Erro:', err.statusCode, err.message, '\n');
    }
  }

  await prisma.$disconnect();
}

main();
