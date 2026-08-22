export function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    if (envUrl) {
      const isEnvLocalhost = envUrl.includes('localhost') || envUrl.includes('127.0.0.1');
      const isClientLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

      if (!isEnvLocalhost || isClientLocalhost) {
        const clean = envUrl.replace(/\/+$/, '');
        return clean.endsWith('/api/v1') ? clean : `${clean}/api/v1`;
      }
    }

    // Dynamic browser fallback: match current server hostname/IP on API port 4000
    return `${protocol}//${hostname}:4000/api/v1`;
  }

  const clean = (envUrl || 'http://localhost:4000/api/v1').replace(/\/+$/, '');
  return clean.endsWith('/api/v1') ? clean : `${clean}/api/v1`;
}

export const API_BASE_URL = getApiBaseUrl();

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  organizationId?: string,
): Promise<T> {
  const baseUrl = getApiBaseUrl();
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
    headers['x-tenant-id'] = organizationId;
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const response = await fetch(`${baseUrl}${cleanEndpoint}`, {
    ...options,
    headers,
  });

  const json = await response.json();

  if (!response.ok || !json.success) {
    const errorMsg = json?.error?.message || json?.message || 'An error occurred during request execution';
    const errorCode = json?.error?.code || json?.code;

    if (
      (errorCode === 'SUBSCRIPTION_ENTITLEMENT_REQUIRED' || response.status === 402) &&
      typeof window !== 'undefined' &&
      window.location.pathname !== '/setup/subscription' &&
      window.location.pathname !== '/login'
    ) {
      window.location.href = '/setup/subscription';
    }

    throw new Error(errorMsg);
  }

  return json.data as T;
}
