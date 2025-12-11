import fs from 'fs-extra';
import { loadConfig, getToken } from './config.js';
import { Blob } from 'node:buffer';

interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  status: number;
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const config = await loadConfig();
  const token = await getToken();

  const url = `${config.apiUrl}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => null);

    return {
      data: data as T,
      status: response.status,
      error: response.ok ? undefined : data?.error || `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      status: 0,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

export async function uploadBundle(
  appId: string,
  bundlePath: string,
  bundleHash: string
): Promise<ApiResponse<{ bundleUrl: string; cid: string; hash: string; size: number }>> {
  const config = await loadConfig();
  const token = await getToken();

  const url = `${config.apiUrl}/developer/apps/${appId}/bundle`;

  try {
    // Read file as buffer and create native FormData
    const fileBuffer = await fs.readFile(bundlePath);
    const fileName = bundlePath.split('/').pop() || 'bundle.tar.gz';

    // Create a Blob from the buffer
    const blob = new Blob([fileBuffer], { type: 'application/gzip' });

    // Use native FormData
    const form = new FormData();
    form.append('file', blob, fileName);
    form.append('hash', bundleHash);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: form,
    });

    const data = await response.json().catch(() => null);

    return {
      data: data as { bundleUrl: string; cid: string; hash: string; size: number },
      status: response.status,
      error: response.ok ? undefined : data?.error || `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      status: 0,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

export async function submitForReview(
  appId: string,
  version: string,
  bundleUrl: string,
  bundleHash: string,
  changelog?: string
): Promise<ApiResponse> {
  return apiRequest(`/developer/apps/${appId}/submit`, {
    method: 'POST',
    body: JSON.stringify({
      version,
      bundleUrl,
      bundleHash,
      changelog,
    }),
  });
}

export async function getDeveloperApps(): Promise<ApiResponse<{ apps: unknown[] }>> {
  return apiRequest('/developer/apps');
}

export async function createApp(manifest: Record<string, unknown>): Promise<ApiResponse> {
  return apiRequest('/developer/apps', {
    method: 'POST',
    body: JSON.stringify(manifest),
  });
}
