import { getApiBase } from './apiBase';

const API_URL = getApiBase();

// Get token from localStorage
function getAuthToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem('token') : null;
}

// Fetch wrapper with auth header
export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const normalizedEndpoint = endpoint.startsWith('/api')
    ? endpoint
    : `/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  // Browser should use same-origin Next.js API routes to avoid cross-host/network issues.
  // Server-side can still use direct backend URL.
  const isBrowser = typeof window !== 'undefined';
  const url = isBrowser ? normalizedEndpoint : `${API_URL}${normalizedEndpoint}`;
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  console.log(`[API FETCH] ${options.method || 'GET'} ${url} (token: ${!!token}) → START`);
  
  try {
    const response = await fetch(url, config);
    console.log(`[API FETCH] ${options.method || 'GET'} ${url} → ${response.status} ${response.statusText}`);
    if (!response.ok) {
      const text = await response.text();
      console.error(`[API ERROR] ${response.status} ${text}`);
      throw new Error(text || `HTTP ${response.status}`);
    }
    return response;
  } catch (err) {
    console.error(`[API NETWORK ERROR] ${url}:`, err);
    throw err;
  }
}

// GET helper
export async function apiGet(endpoint: string): Promise<any> {
  const res = await apiFetch(endpoint);
  if (!res.ok) {
    const err = await res.text();
    console.error(`API GET ${endpoint} failed: ${res.status} ${err}`);
    throw new Error(err || `HTTP ${res.status}`);
  }
  return res.json();
}

// POST helper
export async function apiPost(endpoint: string, data?: any): Promise<any> {
  const res = await apiFetch(endpoint, { method: 'POST', body: data ? JSON.stringify(data) : undefined });
  if (!res.ok) {
    const err = await res.text();
    console.error(`API POST ${endpoint} failed: ${res.status} ${err}`);
    throw new Error(err || `HTTP ${res.status}`);
  }
  return res.json();
}

// DELETE helper
export async function apiDelete(endpoint: string): Promise<void> {
  const res = await apiFetch(endpoint, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.text();
    console.error(`API DELETE ${endpoint} failed: ${res.status} ${err}`);
    throw new Error(err || `HTTP ${res.status}`);
  }
}
