import * as fs from 'fs/promises';
import * as path from 'path';

export interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  modified?: string;
}

export class FileService {
  /**
   * Le conteudo de um arquivo
   */
  async readFile(filePath: string): Promise<string> {
    return fs.readFile(filePath, 'utf-8');
  }

  /**
   * Escreve conteudo em um arquivo
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    // Garante que o diretorio pai existe
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Lista arquivos de um diretorio
   */
  async listDirectory(dirPath: string): Promise<FileInfo[]> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    const files: FileInfo[] = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(dirPath, entry.name);
        const info: FileInfo = {
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory(),
        };

        // Obter stats para arquivos (nao diretorios)
        if (!entry.isDirectory()) {
          try {
            const stats = await fs.stat(fullPath);
            info.size = stats.size;
            info.modified = stats.mtime.toISOString();
          } catch {
            // Ignora erros de stat
          }
        }

        return info;
      })
    );

    // Ordena: diretorios primeiro, depois por nome
    return files.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Cria um diretorio
   */
  async createDirectory(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }

  /**
   * Deleta um arquivo ou diretorio
   */
  async delete(targetPath: string, recursive = false): Promise<void> {
    await fs.rm(targetPath, { recursive });
  }

  /**
   * Renomeia/move um arquivo ou diretorio
   */
  async rename(oldPath: string, newPath: string): Promise<void> {
    await fs.rename(oldPath, newPath);
  }

  /**
   * Copia um arquivo
   */
  async copy(srcPath: string, destPath: string): Promise<void> {
    await fs.copyFile(srcPath, destPath);
  }

  /**
   * Verifica se um caminho existe
   */
  async exists(targetPath: string): Promise<boolean> {
    try {
      await fs.access(targetPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtem informacoes de um arquivo
   */
  async getFileInfo(filePath: string): Promise<FileInfo | null> {
    try {
      const stats = await fs.stat(filePath);
      return {
        name: path.basename(filePath),
        path: filePath,
        isDirectory: stats.isDirectory(),
        size: stats.size,
        modified: stats.mtime.toISOString(),
      };
    } catch {
      return null;
    }
  }
}

export const fileService = new FileService();
