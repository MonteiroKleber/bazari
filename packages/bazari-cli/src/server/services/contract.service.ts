/**
 * Contract Service - Handles ink! smart contract compilation
 */

import { spawn, execSync } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { existsSync } from 'fs';

export interface ContractEnvironmentCheck {
  rust: { installed: boolean; version?: string };
  cargoContract: { installed: boolean; version?: string };
}

export interface CompilationResult {
  success: boolean;
  wasm?: number[];
  metadata?: unknown;
  hash?: string;
  output: string;
  error?: string;
}

/**
 * Check if Rust and cargo-contract are installed
 */
export async function checkContractEnvironment(): Promise<ContractEnvironmentCheck> {
  const result: ContractEnvironmentCheck = {
    rust: { installed: false },
    cargoContract: { installed: false },
  };

  // Check Rust
  try {
    const rustVersion = execSync('rustc --version', { encoding: 'utf-8' }).trim();
    result.rust = { installed: true, version: rustVersion };
  } catch {
    // Rust not installed
  }

  // Check cargo-contract
  try {
    const cargoContractVersion = execSync('cargo contract --version', { encoding: 'utf-8' }).trim();
    result.cargoContract = { installed: true, version: cargoContractVersion };
  } catch {
    // cargo-contract not installed
  }

  return result;
}

/**
 * Compile ink! contract using cargo-contract
 */
export async function compileContract(projectPath: string): Promise<CompilationResult> {
  const output: string[] = [];

  // Verify project exists
  if (!existsSync(projectPath)) {
    return {
      success: false,
      output: '',
      error: `Project directory not found: ${projectPath}`,
    };
  }

  // Verify Cargo.toml exists
  const cargoTomlPath = path.join(projectPath, 'Cargo.toml');
  if (!existsSync(cargoTomlPath)) {
    return {
      success: false,
      output: '',
      error: `Cargo.toml not found in ${projectPath}`,
    };
  }

  return new Promise((resolve) => {
    const process = spawn('cargo', ['contract', 'build', '--release'], {
      cwd: projectPath,
      env: { ...globalThis.process.env, CARGO_TERM_COLOR: 'never' },
    });

    process.stdout.on('data', (data) => {
      output.push(data.toString());
    });

    process.stderr.on('data', (data) => {
      output.push(data.toString());
    });

    process.on('close', async (code) => {
      const outputStr = output.join('');

      if (code !== 0) {
        resolve({
          success: false,
          output: outputStr,
          error: `Compilation failed with exit code ${code}`,
        });
        return;
      }

      try {
        // Find compiled artifacts
        const targetDir = path.join(projectPath, 'target', 'ink');

        if (!existsSync(targetDir)) {
          resolve({
            success: false,
            output: outputStr,
            error: 'Build succeeded but artifacts not found in target/ink',
          });
          return;
        }

        const files = await fs.readdir(targetDir);
        const wasmFile = files.find((f) => f.endsWith('.wasm'));
        const metadataFile = files.find((f) => f.endsWith('.json') && !f.endsWith('.contract'));

        if (!wasmFile) {
          resolve({
            success: false,
            output: outputStr,
            error: 'WASM file not found in build output',
          });
          return;
        }

        // Read WASM
        const wasmPath = path.join(targetDir, wasmFile);
        const wasmBuffer = await fs.readFile(wasmPath);
        const wasmArray = Array.from(wasmBuffer);

        // Read metadata
        let metadata: unknown = null;
        if (metadataFile) {
          const metadataPath = path.join(targetDir, metadataFile);
          const metadataContent = await fs.readFile(metadataPath, 'utf-8');
          metadata = JSON.parse(metadataContent);
        }

        // Calculate hash
        const hash = crypto.createHash('sha256').update(wasmBuffer).digest('hex');

        resolve({
          success: true,
          wasm: wasmArray,
          metadata,
          hash,
          output: outputStr,
        });
      } catch (err) {
        resolve({
          success: false,
          output: outputStr,
          error: err instanceof Error ? err.message : 'Failed to read artifacts',
        });
      }
    });

    process.on('error', (err) => {
      resolve({
        success: false,
        output: output.join(''),
        error: err.message,
      });
    });
  });
}

/**
 * Compile contract with streaming output callback
 */
export function compileContractWithStream(
  projectPath: string,
  onOutput: (line: string) => void
): Promise<CompilationResult> {
  return new Promise((resolve) => {
    const output: string[] = [];

    // Verify project exists
    if (!existsSync(projectPath)) {
      resolve({
        success: false,
        output: '',
        error: `Project directory not found: ${projectPath}`,
      });
      return;
    }

    const process = spawn('cargo', ['contract', 'build', '--release'], {
      cwd: projectPath,
      env: { ...globalThis.process.env, CARGO_TERM_COLOR: 'never' },
    });

    const handleOutput = (data: Buffer) => {
      const lines = data.toString().split('\n');
      lines.forEach((line) => {
        if (line) {
          output.push(line);
          onOutput(line);
        }
      });
    };

    process.stdout.on('data', handleOutput);
    process.stderr.on('data', handleOutput);

    process.on('close', async (code) => {
      const outputStr = output.join('\n');

      if (code !== 0) {
        resolve({
          success: false,
          output: outputStr,
          error: `Compilation failed with exit code ${code}`,
        });
        return;
      }

      try {
        const targetDir = path.join(projectPath, 'target', 'ink');
        const files = await fs.readdir(targetDir);
        const wasmFile = files.find((f) => f.endsWith('.wasm'));
        const metadataFile = files.find((f) => f.endsWith('.json') && !f.endsWith('.contract'));

        if (!wasmFile) {
          resolve({
            success: false,
            output: outputStr,
            error: 'WASM file not found',
          });
          return;
        }

        const wasmPath = path.join(targetDir, wasmFile);
        const wasmBuffer = await fs.readFile(wasmPath);
        const wasmArray = Array.from(wasmBuffer);

        let metadata: unknown = null;
        if (metadataFile) {
          const metadataPath = path.join(targetDir, metadataFile);
          const metadataContent = await fs.readFile(metadataPath, 'utf-8');
          metadata = JSON.parse(metadataContent);
        }

        const hash = crypto.createHash('sha256').update(wasmBuffer).digest('hex');

        resolve({
          success: true,
          wasm: wasmArray,
          metadata,
          hash,
          output: outputStr,
        });
      } catch (err) {
        resolve({
          success: false,
          output: outputStr,
          error: err instanceof Error ? err.message : 'Failed to read artifacts',
        });
      }
    });

    process.on('error', (err) => {
      resolve({
        success: false,
        output: output.join('\n'),
        error: err.message,
      });
    });
  });
}

/**
 * Create new contract project from template
 */
export async function createContractProject(
  name: string,
  targetDir: string,
  template: string,
  files: Array<{ path: string; content: string }>
): Promise<{ projectPath: string }> {
  const projectPath = path.join(targetDir, name);

  // Create directory
  await fs.mkdir(projectPath, { recursive: true });

  // Write files
  for (const file of files) {
    const filePath = path.join(projectPath, file.path);
    const fileDir = path.dirname(filePath);

    await fs.mkdir(fileDir, { recursive: true });
    await fs.writeFile(filePath, file.content);
  }

  return { projectPath };
}

/**
 * Save contract files
 */
export async function saveContractFiles(
  projectPath: string,
  files: Array<{ path: string; content: string }>
): Promise<void> {
  for (const file of files) {
    const filePath = path.join(projectPath, file.path);
    const fileDir = path.dirname(filePath);

    await fs.mkdir(fileDir, { recursive: true });
    await fs.writeFile(filePath, file.content);
  }
}

/**
 * Load contract files
 */
export async function loadContractFiles(
  projectPath: string
): Promise<Array<{ path: string; content: string }>> {
  const files: Array<{ path: string; content: string }> = [];

  async function readDir(dir: string, relativePath: string = '') {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        // Skip target and .git directories
        if (entry.name !== 'target' && entry.name !== '.git' && entry.name !== 'node_modules') {
          await readDir(fullPath, relPath);
        }
      } else if (entry.isFile()) {
        // Only include relevant files
        if (
          entry.name.endsWith('.rs') ||
          entry.name.endsWith('.toml') ||
          entry.name === '.gitignore'
        ) {
          const content = await fs.readFile(fullPath, 'utf-8');
          files.push({ path: relPath, content });
        }
      }
    }
  }

  await readDir(projectPath);
  return files;
}

/**
 * Get compiled artifact
 */
export async function getContractArtifact(
  projectPath: string,
  type: 'wasm' | 'metadata' | 'contract'
): Promise<Buffer> {
  const targetDir = path.join(projectPath, 'target', 'ink');
  const files = await fs.readdir(targetDir);

  let filename: string | undefined;
  if (type === 'wasm') {
    filename = files.find((f) => f.endsWith('.wasm'));
  } else if (type === 'metadata') {
    filename = files.find((f) => f.endsWith('.json') && !f.endsWith('.contract'));
  } else {
    filename = files.find((f) => f.endsWith('.contract'));
  }

  if (!filename) {
    throw new Error(`Artifact of type '${type}' not found`);
  }

  return fs.readFile(path.join(targetDir, filename));
}
