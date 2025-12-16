/**
 * Language detection utilities for Monaco Editor
 */

// Extension to language mapping
const extensionMap: Record<string, string> = {
  // JavaScript/TypeScript
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.mts': 'typescript',
  '.cts': 'typescript',

  // Web
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'scss',
  '.less': 'less',

  // Data formats
  '.json': 'json',
  '.jsonc': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
  '.xml': 'xml',
  '.svg': 'xml',

  // Rust (for smart contracts)
  '.rs': 'rust',

  // Markdown
  '.md': 'markdown',
  '.mdx': 'markdown',

  // Config files
  '.env': 'plaintext',
  '.gitignore': 'plaintext',
  '.dockerignore': 'plaintext',

  // Shell
  '.sh': 'shell',
  '.bash': 'shell',
  '.zsh': 'shell',

  // GraphQL
  '.graphql': 'graphql',
  '.gql': 'graphql',

  // SQL
  '.sql': 'sql',

  // Solidity
  '.sol': 'sol',

  // Other
  '.txt': 'plaintext',
  '.log': 'plaintext',
};

// Filename to language mapping (for files without extensions)
const filenameMap: Record<string, string> = {
  Dockerfile: 'dockerfile',
  Makefile: 'makefile',
  Cargo: 'toml',
  'Cargo.toml': 'toml',
  'Cargo.lock': 'toml',
  'package.json': 'json',
  'package-lock.json': 'json',
  'tsconfig.json': 'json',
  'jsconfig.json': 'json',
  '.prettierrc': 'json',
  '.eslintrc': 'json',
  '.babelrc': 'json',
  '.editorconfig': 'ini',
  '.gitignore': 'plaintext',
  '.npmignore': 'plaintext',
  '.dockerignore': 'plaintext',
  '.env': 'plaintext',
  '.env.local': 'plaintext',
  '.env.development': 'plaintext',
  '.env.production': 'plaintext',
  README: 'markdown',
  LICENSE: 'plaintext',
  CHANGELOG: 'markdown',
};

/**
 * Detect language from file path
 */
export function detectLanguage(filePath: string): string {
  // Extract filename from path
  const parts = filePath.split('/');
  const filename = parts[parts.length - 1];

  // Check filename map first
  if (filenameMap[filename]) {
    return filenameMap[filename];
  }

  // Check extension
  const lastDot = filename.lastIndexOf('.');
  if (lastDot !== -1) {
    const ext = filename.substring(lastDot).toLowerCase();
    if (extensionMap[ext]) {
      return extensionMap[ext];
    }
  }

  // Default to plaintext
  return 'plaintext';
}

/**
 * Get file icon class based on file type
 */
export function getFileIconClass(filePath: string): string {
  const language = detectLanguage(filePath);

  const iconMap: Record<string, string> = {
    javascript: 'file-js',
    typescript: 'file-ts',
    html: 'file-html',
    css: 'file-css',
    scss: 'file-scss',
    json: 'file-json',
    yaml: 'file-yaml',
    rust: 'file-rust',
    markdown: 'file-markdown',
    dockerfile: 'file-docker',
    shell: 'file-shell',
    sql: 'file-sql',
    graphql: 'file-graphql',
    plaintext: 'file-text',
  };

  return iconMap[language] || 'file-text';
}

/**
 * Check if file is likely binary
 */
export function isBinaryFile(filePath: string): boolean {
  const binaryExtensions = [
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.ico',
    '.webp',
    '.bmp',
    '.tiff',
    '.pdf',
    '.zip',
    '.tar',
    '.gz',
    '.rar',
    '.7z',
    '.exe',
    '.dll',
    '.so',
    '.dylib',
    '.wasm',
    '.ttf',
    '.otf',
    '.woff',
    '.woff2',
    '.eot',
    '.mp3',
    '.mp4',
    '.avi',
    '.mov',
    '.wav',
    '.flac',
  ];

  const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
  return binaryExtensions.includes(ext);
}

/**
 * Get Monaco language ID from common language names
 */
export function normalizeLanguageId(language: string): string {
  const normalizations: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    yml: 'yaml',
    md: 'markdown',
    sh: 'shell',
    bash: 'shell',
    rs: 'rust',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    'c++': 'cpp',
    cs: 'csharp',
    'c#': 'csharp',
    php: 'php',
    swift: 'swift',
    kotlin: 'kotlin',
    kt: 'kotlin',
    scala: 'scala',
    docker: 'dockerfile',
  };

  return normalizations[language.toLowerCase()] || language.toLowerCase();
}
