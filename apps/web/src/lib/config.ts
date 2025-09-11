// V-1: API configuration with correct port - 2025-09-11
// Development port is 3000, not 3333
// path: apps/web/src/lib/config.ts

// API base URL - usa porta 3000 em desenvolvimento
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Outras configurações podem ser adicionadas aqui
export const DEFAULT_PAGE_SIZE = 20;
export const DEBOUNCE_DELAY = 300;