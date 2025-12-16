import { Command } from 'commander';
import { startServer } from '../server/index.js';
import open from 'open';

export const studioCommand = new Command('studio')
  .description('Start Bazari Studio development environment')
  .option('-p, --port <port>', 'Server port', '4444')
  .option('--serve', 'Start CLI server only (headless mode)')
  .option('--no-browser', 'Do not open browser automatically')
  .action(async (options) => {
    const port = parseInt(options.port, 10);

    try {
      // Inicia o servidor
      await startServer({ port });

      if (options.serve) {
        // Modo headless - apenas server
        console.log('\nCLI Server running in headless mode.');
        console.log('Connect from Bazari Studio UI at:');
        console.log('  https://bazari.libervia.xyz/app/studio');
        console.log('\nPress Ctrl+C to stop.\n');
      } else {
        // Modo normal - abre browser
        const studioUrl = 'https://bazari.libervia.xyz/app/studio';

        console.log('\nOpening Bazari Studio...');
        console.log(`URL: ${studioUrl}`);

        if (options.browser !== false) {
          try {
            await open(studioUrl);
          } catch {
            console.log('\nCould not open browser automatically.');
            console.log(`Please open ${studioUrl} manually.`);
          }
        }

        console.log('\nPress Ctrl+C to stop the server.\n');
      }

      // Mantém o processo rodando
      process.on('SIGINT', () => {
        console.log('\nShutting down CLI Server...');
        process.exit(0);
      });

      process.on('SIGTERM', () => {
        console.log('\nShutting down CLI Server...');
        process.exit(0);
      });
    } catch (error) {
      if (error instanceof Error) {
        console.error(`\nError: ${error.message}`);

        if (error.message.includes('already in use')) {
          console.log('\nTips:');
          console.log(`  1. Check if another instance is running on port ${port}`);
          console.log(`  2. Use --port <number> to specify a different port`);
          console.log(`  3. Run 'lsof -i :${port}' to see what's using the port`);
        }
      } else {
        console.error('\nFailed to start CLI Server');
      }
      process.exit(1);
    }
  });
