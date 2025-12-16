import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';

export interface CommandResult {
  success: boolean;
  output: string;
  exitCode: number;
}

export interface BuildInfo {
  hash: string;
  size: number;
  timestamp: string;
  files: string[];
}

// Gerencia processos de dev server ativos
const activeDevServers = new Map<string, ChildProcess>();

export class BuildService {
  /**
   * Executa um comando e retorna o resultado
   */
  async runCommand(
    cmd: string,
    args: string[],
    cwd: string
  ): Promise<CommandResult> {
    return new Promise((resolve) => {
      const output: string[] = [];
      const proc = spawn(cmd, args, {
        cwd,
        shell: true,
        env: { ...process.env, FORCE_COLOR: '1' },
      });

      proc.stdout?.on('data', (data) => output.push(data.toString()));
      proc.stderr?.on('data', (data) => output.push(data.toString()));

      proc.on('close', (code) => {
        resolve({
          success: code === 0,
          output: output.join(''),
          exitCode: code ?? 1,
        });
      });

      proc.on('error', (error) => {
        resolve({
          success: false,
          output: error.message,
          exitCode: 1,
        });
      });
    });
  }

  /**
   * Executa npm install
   */
  async npmInstall(projectPath: string): Promise<CommandResult> {
    return this.runCommand('npm', ['install'], projectPath);
  }

  /**
   * Executa npm run build
   */
  async npmBuild(projectPath: string): Promise<CommandResult> {
    const result = await this.runCommand('npm', ['run', 'build'], projectPath);

    if (result.success) {
      // Gera build info apos build bem-sucedido
      await this.generateBuildInfo(projectPath);
    }

    return result;
  }

  /**
   * Inicia dev server
   */
  async startDevServer(
    projectPath: string,
    port = 3333
  ): Promise<{ success: boolean; pid?: number; url?: string; error?: string }> {
    // Verifica se ja tem um server rodando para este projeto
    const existing = activeDevServers.get(projectPath);
    if (existing && !existing.killed) {
      return {
        success: true,
        pid: existing.pid,
        url: `http://localhost:${port}`,
      };
    }

    // Verifica se o projeto existe
    try {
      await fs.access(projectPath);
    } catch {
      return {
        success: false,
        error: `Project path not found: ${projectPath}`,
      };
    }

    // Verifica se tem package.json
    const packageJsonPath = path.join(projectPath, 'package.json');
    try {
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);

      if (!packageJson.scripts?.dev) {
        return {
          success: false,
          error: 'No "dev" script found in package.json. Add a "dev" script to run the dev server.',
        };
      }
    } catch (err) {
      return {
        success: false,
        error: `Cannot read package.json: ${err instanceof Error ? err.message : 'Unknown error'}`,
      };
    }

    // Verifica se node_modules existe
    const nodeModulesPath = path.join(projectPath, 'node_modules');
    try {
      await fs.access(nodeModulesPath);
    } catch {
      return {
        success: false,
        error: 'node_modules not found. Run "npm install" first.',
      };
    }

    try {
      // Usa pipe para capturar erros iniciais
      const proc = spawn('npm', ['run', 'dev', '--', '--port', String(port)], {
        cwd: projectPath,
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
      });

      // Captura erros iniciais (primeiros 3 segundos)
      let startupError = '';
      proc.stderr?.on('data', (data) => {
        startupError += data.toString();
      });

      // Espera um pouco para ver se o processo morre imediatamente
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          resolve();
        }, 2000);

        proc.on('error', (err) => {
          startupError = err.message;
          clearTimeout(timeout);
          resolve();
        });

        proc.on('exit', (code) => {
          if (code !== 0 && code !== null) {
            startupError = `Process exited with code ${code}`;
          }
          clearTimeout(timeout);
          resolve();
        });
      });

      // Se o processo morreu ou teve erro, retorna falha
      if (proc.killed || proc.exitCode !== null) {
        return {
          success: false,
          error: startupError || `Dev server failed to start (exit code: ${proc.exitCode})`,
        };
      }

      // Desconecta os streams e deixa rodar em background
      proc.stdout?.destroy();
      proc.stderr?.destroy();
      proc.unref();
      activeDevServers.set(projectPath, proc);

      return {
        success: true,
        pid: proc.pid,
        url: `http://localhost:${port}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Para dev server
   */
  async stopDevServer(
    projectPath: string
  ): Promise<{ success: boolean; error?: string }> {
    const proc = activeDevServers.get(projectPath);

    if (!proc) {
      return { success: true }; // Ja parado
    }

    try {
      proc.kill('SIGTERM');
      activeDevServers.delete(projectPath);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Para dev server por PID
   */
  async stopDevServerByPid(pid: number): Promise<{ success: boolean }> {
    try {
      process.kill(pid, 'SIGTERM');
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  /**
   * Gera informacoes do build
   */
  async generateBuildInfo(projectPath: string): Promise<BuildInfo> {
    const distPath = path.join(projectPath, 'dist');
    const files: string[] = [];
    let totalSize = 0;

    // Lista todos os arquivos no dist
    async function walkDir(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walkDir(fullPath);
        } else {
          const stats = await fs.stat(fullPath);
          files.push(path.relative(distPath, fullPath));
          totalSize += stats.size;
        }
      }
    }

    await walkDir(distPath);

    // Calcula hash do conteudo
    const hash = await this.calculateDistHash(distPath);

    const buildInfo: BuildInfo = {
      hash,
      size: totalSize,
      timestamp: new Date().toISOString(),
      files,
    };

    // Salva build info
    await fs.writeFile(
      path.join(projectPath, '.build-info.json'),
      JSON.stringify(buildInfo, null, 2),
      'utf-8'
    );

    return buildInfo;
  }

  /**
   * Calcula hash do diretorio dist
   */
  async calculateDistHash(distPath: string): Promise<string> {
    const hash = crypto.createHash('sha256');

    async function processDir(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      entries.sort((a, b) => a.name.localeCompare(b.name));

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await processDir(fullPath);
        } else {
          const content = await fs.readFile(fullPath);
          hash.update(entry.name);
          hash.update(content);
        }
      }
    }

    await processDir(distPath);
    return hash.digest('hex').substring(0, 16);
  }

  /**
   * Executa type check (tsc --noEmit)
   */
  async typeCheck(projectPath: string): Promise<CommandResult> {
    return this.runCommand('npx', ['tsc', '--noEmit'], projectPath);
  }

  /**
   * Executa lint
   */
  async lint(projectPath: string): Promise<CommandResult> {
    return this.runCommand('npm', ['run', 'lint'], projectPath);
  }

  /**
   * Executa testes
   */
  async test(projectPath: string): Promise<CommandResult> {
    return this.runCommand('npm', ['test'], projectPath);
  }
}

export const buildService = new BuildService();
