const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
export const API_BASE_URL = rawUrl.endsWith('/api/v1')
  ? rawUrl.replace(/\/+$/, '')
  : `${rawUrl.replace(/\/+$/, '')}/api/v1`;

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  organizationId?: string,
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('klyro_access_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (organizationId) {
    headers['x-organization-id'] = organizationId;
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const response = await fetch(`${API_BASE_URL}${cleanEndpoint}`, {
    ...options,
    headers,
  });

  const json = await response.json();

  if (!response.ok || !json.success) {
    const errorMsg = json?.error?.message || json?.message || 'An error occurred during request execution';
    throw new Error(errorMsg);
  }

  return json.data as T;
}
