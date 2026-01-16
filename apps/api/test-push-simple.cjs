const webpush = require('/root/bazari/node_modules/.pnpm/web-push@3.6.7/node_modules/web-push');
const { PrismaClient } = require('/root/bazari/node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/.prisma/client');

async function main() {
  const prisma = new PrismaClient();

  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@bazari.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  // Pegar a subscription mais recente
  const sub = await prisma.pushSubscription.findFirst({
    where: { profileId: 'cmjd2zj61000310cvxd8w50ua' },
    orderBy: { createdAt: 'desc' }
  });

  if (!sub) {
    console.log('No subscription');
    return;
  }

  console.log('Endpoint:', sub.endpoint);
  console.log('Created:', sub.createdAt);

  // Payload muito simples
  const payload = JSON.stringify({
    title: 'TESTE SIMPLES',
    body: 'Hora: ' + new Date().toLocaleTimeString()
  });

  const subscription = {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth }
  };

  try {
    const result = await webpush.sendNotification(subscription, payload);
    console.log('Status:', result.statusCode);
    console.log('Enviado com sucesso!');
  } catch (err) {
    console.error('ERRO:', err.message);
    console.error('Status Code:', err.statusCode);
    console.error('Body:', err.body);
    
    // Se status 410, subscription expirou
    if (err.statusCode === 410) {
      console.log('\n>>> SUBSCRIPTION EXPIROU! Precisa registrar novamente.');
      // Deletar subscription inválida
      await prisma.pushSubscription.delete({ where: { id: sub.id } });
      console.log('Subscription deletada do banco.');
    }
  }

  await prisma.$disconnect();
}

main();
