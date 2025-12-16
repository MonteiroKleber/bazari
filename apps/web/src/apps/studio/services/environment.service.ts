/**
 * Servico para verificacao de ambiente de desenvolvimento
 */

import { localServer } from './localServer.client';
import type { EnvironmentStatus } from '../types/studio.types';

export interface EnvironmentCheckResult {
  status: EnvironmentStatus;
  isReady: boolean;
  isFullyReady: boolean;
  missingRequired: string[];
  missingOptional: string[];
}

/**
 * Verifica o ambiente de desenvolvimento
 */
export async function checkEnvironment(): Promise<EnvironmentCheckResult> {
  const status = await localServer.getToolsStatus();

  const missingRequired: string[] = [];
  const missingOptional: string[] = [];

  // Node e npm sao obrigatorios
  if (!status.node.installed) {
    missingRequired.push('Node.js');
  }
  if (!status.npm.installed) {
    missingRequired.push('npm');
  }

  // Rust e cargo-contract sao opcionais (para smart contracts)
  if (!status.rust.installed) {
    missingOptional.push('Rust');
  }
  if (!status.cargoContract.installed) {
    missingOptional.push('cargo-contract');
  }

  const isReady = missingRequired.length === 0;
  const isFullyReady = isReady && missingOptional.length === 0;

  return {
    status,
    isReady,
    isFullyReady,
    missingRequired,
    missingOptional,
  };
}

/**
 * Instrucoes de instalacao para cada ferramenta
 */
export const installInstructions: Record<string, string> = {
  'Node.js': `
# macOS (usando Homebrew)
brew install node

# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Windows
Baixe o instalador em: https://nodejs.org/
`,

  npm: `
npm vem instalado com Node.js.
Se estiver faltando, reinstale o Node.js.
`,

  Rust: `
# macOS / Linux
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Windows
Baixe o instalador em: https://rustup.rs/
`,

  'cargo-contract': `
# Apos instalar Rust:
cargo install cargo-contract --force

# Pode precisar de dependencias:
# macOS: brew install openssl
# Ubuntu: sudo apt install libssl-dev pkg-config
`,
};

/**
 * Retorna instrucoes de instalacao para ferramentas faltando
 */
export function getInstallInstructions(tools: string[]): string {
  return tools
    .map((tool) => {
      const instructions = installInstructions[tool];
      return `## ${tool}\n${instructions || 'Consulte a documentacao oficial.'}`;
    })
    .join('\n\n');
}
