import { indexerWorker } from './indexerWorker.js';
import { verifierWorker } from './verifierWorker.js';
import { verifyQueue } from '../lib/queue.js';

console.log('[workers] Iniciando workers...');

// Agendar job de verificação a cada hora
await verifyQueue.add(
  'verify-all',
  {},
  {
    repeat: {
      pattern: '0 * * * *', // A cada hora
    },
  }
);

console.log('[workers] Job de verificação agendado (a cada hora)');

process.on('SIGTERM', async () => {
  console.log('[workers] Encerrando...');
  await indexerWorker.close();
  await verifierWorker.close();
  process.exit(0);
});
