// src/services/api.ts
// Generic fetch wrapper with solid error surfaces + token helpers

const API_URL = import.meta.env.VITE_API_URL as string;

export const STORAGE = {
  TOKEN: 'tc-token',
  TOKEN_EXP: 'tc-token-exp',
  USER: 'tc-user',
} as const;

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// ------------------------
// Auth token helpers
// ------------------------
export const getToken = () => localStorage.getItem(STORAGE.TOKEN) || null;

function parseJwt<T = any>(jwt: string): (T & { exp?: number }) | null {
  try {
    const [, b64] = jwt.split('.');
    const json = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}



export function setToken(token: string | null) {
  if (!token) {
    clearAuth();
    return;
  }
  localStorage.setItem(STORAGE.TOKEN, token);
  const payload = parseJwt(token);
  if (payload?.exp) {
    localStorage.setItem(STORAGE.TOKEN_EXP, String(payload.exp * 1000));
  } else {
    localStorage.removeItem(STORAGE.TOKEN_EXP);
  }
}
export function clearAuth() {
  localStorage.removeItem(STORAGE.TOKEN);
  localStorage.removeItem(STORAGE.TOKEN_EXP);
  localStorage.removeItem(STORAGE.USER);
}

function broadcastLogout() {
  // Clear locally
  clearAuth();
  // Cross-tab + same-tab notice
  localStorage.setItem("tc-auth-logout", String(Date.now()));
  window.dispatchEvent(new Event("tc-auth-logout"));
}

// ------------------------
// Error building
// ------------------------
function normalizeNestMessage(payload: any): string | null {
  // NestJS errors often look like:
  // { statusCode, message: "string" | ["a","b"], error: "Bad Request" }
  if (!payload) return null;
  const msg = payload.message;
  if (Array.isArray(msg)) {
    // class-validator array → join lines
    return msg.join('\n');
  }
  if (typeof msg === 'string' && msg.trim()) return msg;
  if (typeof payload.error === 'string' && payload.error.trim()) return payload.error;
  return null;
}

function buildError(res: Response, payload: any) {
  const specific = normalizeNestMessage(payload);
  const message =
    specific ||
    res.statusText ||
    (typeof payload === 'string' ? payload : '') ||
    `Request failed: ${res.status}`;
  const err: any = new Error(message);
  err.status = res.status;
  err.data = payload;
  return err;
}

// ------------------------
// Core fetchers
// ------------------------
const looksLikeJwt = (t: string | null) => !!t && t.split(".").length === 3;

export async function api<T = any>(path: string, options: { method?: HttpMethod; body?: any; headers?: Record<string, string> } = {}): Promise<T> {
  const token = getToken();
  const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(looksLikeJwt(token) ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };
  if (!isForm) headers['Content-Type'] = headers['Content-Type'] || 'application/json';

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: isForm ? options.body : options.body ? JSON.stringify(options.body) : undefined,
    credentials: 'include',
  });

  const ct = res.headers.get('content-type') || '';
  const isJson = ct.includes('application/json');
  const payload = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      broadcastLogout();
    }
    throw buildError(res, payload);
  }

  if (!res.ok) throw buildError(res, payload);
  return (payload as T) ?? (null as T);
}

export async function apiForm<T = any>(path: string, fd: FormData, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers || {});
  if (looksLikeJwt(token)) headers.set('Authorization', `Bearer ${token}`);
  console.log("API FORM TOKEN: ",token);

  // DO NOT set Content-Type for FormData

  const res = await fetch(`${API_URL}${path}`, {
    method: init.method || 'POST',
    headers,
    body: fd,
    credentials: 'include',
  });

  const ct = res.headers.get('content-type') || '';
  const isJson = ct.includes('application/json');
  const payload = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      broadcastLogout();
    }
    throw buildError(res, payload);
  }

  if (!res.ok) throw buildError(res, payload);
  return (payload as T) ?? (null as T);
}
