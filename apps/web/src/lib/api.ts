// Cliente HTTP para comunicação com a API
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

// Função base para fazer requisições
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new ApiError(response.status, `HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return await response.json();
    }

    return {} as T;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new ApiError(408, "Request timeout");
      }
      throw new ApiError(0, error.message);
    }
    
    throw new ApiError(0, "Unknown error");
  }
}

// Helper para GET com JSON
export async function getJSON<T>(path: string): Promise<T> {
  return apiFetch<T>(path, {
    method: "GET",
    headers: {
      "Accept": "application/json",
    },
  });
}

// Helper para POST com JSON
export async function postJSON<T>(path: string, data: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

// Helper para POST com multipart/form-data
export async function postMultipart<T>(path: string, form: FormData): Promise<T> {
  return apiFetch<T>(path, {
    method: "POST",
    headers: {
      "Accept": "application/json",
    },
    body: form,
  });
}