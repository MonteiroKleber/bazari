// Use pnpm hoisted modules
const webpush = require('/root/bazari/node_modules/.pnpm/web-push@3.6.7/node_modules/web-push');
const { PrismaClient } = require('/root/bazari/node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/.prisma/client');

async function main() {
  const prisma = new PrismaClient();

  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@bazari.com';

  console.log('VAPID Public Key:', vapidPublicKey ? vapidPublicKey.substring(0, 20) + '...' : 'NOT SET');
  console.log('VAPID Private Key:', vapidPrivateKey ? '[SET]' : 'NOT SET');

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.log('VAPID keys not set');
    process.exit(1);
  }

  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

  // Get the most recent subscription for user_5dbsrc7k (profile cmjd2zj61000310cvxd8w50ua)
  const subs = await prisma.pushSubscription.findMany({
    where: { profileId: 'cmjd2zj61000310cvxd8w50ua' },
    orderBy: { createdAt: 'desc' }
  });

  if (subs.length === 0) {
    console.log('No subscription found');
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log('Found', subs.length, 'subscription(s)');
  
  // Use the most recent one
  const sub = subs[0];
  console.log('Using subscription:', sub.endpoint.substring(0, 80) + '...');

  const payload = JSON.stringify({
    title: 'TESTE DIRETO',
    body: 'Se voce ver isso, o push esta funcionando!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: 'test-notification-' + Date.now(),
    data: {
      type: 'test',
      timestamp: Date.now()
    }
  });

  const subscription = {
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.p256dh,
      auth: sub.auth
    }
  };

  try {
    console.log('Sending push...');
    const result = await webpush.sendNotification(subscription, payload);
    console.log('Push sent! Status:', result.statusCode);
    console.log('Headers:', JSON.stringify(result.headers, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
    if (err.statusCode) console.error('Status:', err.statusCode);
    if (err.body) console.error('Body:', err.body);
  }

  await prisma.$disconnect();
}

main();
