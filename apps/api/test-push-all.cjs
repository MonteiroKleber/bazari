const webpush = require('/root/bazari/node_modules/.pnpm/web-push@3.6.7/node_modules/web-push');
const { PrismaClient } = require('/root/bazari/node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/.prisma/client');

async function main() {
  const prisma = new PrismaClient();

  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@bazari.com';

  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

  // Get ALL subscriptions
  const subs = await prisma.pushSubscription.findMany({
    where: { profileId: 'cmjd2zj61000310cvxd8w50ua' }
  });

  console.log('Found', subs.length, 'subscription(s)');
  
  for (const sub of subs) {
    console.log('\n--- Subscription:', sub.id);
    console.log('UserAgent:', sub.userAgent);
    console.log('Created:', sub.createdAt);
    
    const payload = JSON.stringify({
      title: 'TESTE PARA ' + sub.id.substring(0, 8),
      body: 'Push test timestamp: ' + Date.now(),
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: 'test-' + sub.id,
      data: { type: 'test' }
    });

    const subscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth }
    };

    try {
      const result = await webpush.sendNotification(subscription, payload);
      console.log('Status:', result.statusCode);
    } catch (err) {
      console.error('Error:', err.message);
      if (err.statusCode) console.error('HTTP Status:', err.statusCode);
    }
  }

  await prisma.$disconnect();
}

main();
