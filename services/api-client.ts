import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { CustomResponse } from '@/types/domain';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ENV_API_URL = process.env.EXPO_PUBLIC_API_URL;
if (!ENV_API_URL && !__DEV__) {
  throw new Error('Falta EXPO_PUBLIC_API_URL en el build de producción');
}
const BASE_URL = ENV_API_URL || 'http://localhost:8080';

const TOKEN_KEY = 'agendaza_jwt';

// Rutas que no necesitan token (se comparan sin query string).
const PUBLIC_PATHS = ['/login', '/register'];

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Si es true, no se envía el Authorization header ni se dispara onUnauthorized. */
    skipAuth?: boolean;
  }
}

type UnauthorizedHandler = () => void;

// ---------------------------------------------------------------------------
// Almacenamiento del token
// ---------------------------------------------------------------------------

// Cache en memoria para no leer SecureStore en cada request.
let cachedToken: string | null = null;
let tokenLoaded = false;

const hasLocalStorage = () => Platform.OS === 'web' && typeof window !== 'undefined';

export async function saveToken(token: string): Promise<void> {
  cachedToken = token;
  tokenLoaded = true;
  if (Platform.OS === 'web') {
    if (hasLocalStorage()) window.localStorage.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  if (tokenLoaded) return cachedToken;
  try {
    if (Platform.OS === 'web') {
      cachedToken = hasLocalStorage() ? window.localStorage.getItem(TOKEN_KEY) : null;
    } else {
      cachedToken = await SecureStore.getItemAsync(TOKEN_KEY);
    }
    tokenLoaded = true;
    return cachedToken;
  } catch {
    return null;
  }
}

export async function clearToken(): Promise<void> {
  cachedToken = null;
  tokenLoaded = true;
  try {
    if (Platform.OS === 'web') {
      if (hasLocalStorage()) window.localStorage.removeItem(TOKEN_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Manejo de sesión expirada
// ---------------------------------------------------------------------------

let onUnauthorized: UnauthorizedHandler | null = null;

/** Registrar desde el AuthContext para redirigir al login cuando el backend responde 401. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler;
}

// ---------------------------------------------------------------------------
// Instancia de axios
// ---------------------------------------------------------------------------

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

function getPathname(url?: string): string {
  if (!url) return '';
  try {
    return new URL(url, BASE_URL).pathname.replace(/\/+$/, '');
  } catch {
    return url.split('?')[0].replace(/\/+$/, '');
  }
}

function isPublicRequest(config: InternalAxiosRequestConfig): boolean {
  if (config.skipAuth) return true;
  const path = getPathname(config.url);
  return PUBLIC_PATHS.some((p) => path === p || path.endsWith(p));
}

// Evita filtrar el token a otros hosts si alguien pasa una URL absoluta.
function isSameOrigin(url?: string): boolean {
  if (!url || !/^https?:\/\//i.test(url)) return true;
  try {
    return new URL(url).origin === new URL(BASE_URL).origin;
  } catch {
    return false;
  }
}

api.interceptors.request.use(async (config) => {
  if (isPublicRequest(config) || !isSameOrigin(config.url)) return config;
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config as InternalAxiosRequestConfig | undefined;
    const isUnauthorized = error?.response?.status === 401;
    // Un 401 en /login (credenciales incorrectas) no es una sesión vencida.
    if (isUnauthorized && config && !isPublicRequest(config)) {
      await clearToken();
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

// ---------------------------------------------------------------------------
// Unwrap de CustomResponse
// ---------------------------------------------------------------------------

// Si la respuesta trae campos extra (ej: { data, total } en paginación),
// NO se desenvuelve, para no perder esa información.
const WRAPPER_KEYS = new Set(['data', 'message', 'status', 'success', 'error', 'timestamp', 'code']);

function isCustomResponse<T>(value: unknown): value is CustomResponse<T> {
  if (typeof value !== 'object' || value === null || !('data' in value)) return false;
  return Object.keys(value).every((k) => WRAPPER_KEYS.has(k));
}

function unwrapResponse<T>(response: CustomResponse<T> | T): T {
  if (isCustomResponse<T>(response)) {
    return response.data as T;
  }
  return response as T;
}

// ---------------------------------------------------------------------------
// Helpers HTTP
// ---------------------------------------------------------------------------

export async function apiGet<T>(
  url: string,
  params?: Record<string, unknown>,
  options?: AxiosRequestConfig,
): Promise<T> {
  const res = await api.get<CustomResponse<T> | T>(url, { ...options, ...(params ? { params } : {}) });
  return unwrapResponse(res.data);
}

export async function apiPost<T>(url: string, body?: unknown, options?: AxiosRequestConfig): Promise<T> {
  const res = await api.post<CustomResponse<T> | T>(url, body, options);
  return unwrapResponse(res.data);
}

export async function apiPut<T>(url: string, body?: unknown, options?: AxiosRequestConfig): Promise<T> {
  const res = await api.put<CustomResponse<T> | T>(url, body, options);
  return unwrapResponse(res.data);
}

export async function apiPatch<T>(url: string, body?: unknown, options?: AxiosRequestConfig): Promise<T> {
  const res = await api.patch<CustomResponse<T> | T>(url, body, options);
  return unwrapResponse(res.data);
}

export async function apiDelete<T>(url: string, options?: AxiosRequestConfig): Promise<T> {
  const res = await api.delete<CustomResponse<T> | T>(url, options);
  return unwrapResponse(res.data);
}

/** Solo confiable en web. En nativo usa apiGetArrayBuffer. */
export async function apiGetBlob(url: string): Promise<Blob> {
  const res = await api.get(url, { responseType: 'blob' });
  return res.data as Blob;
}

/** Para descargas en nativo (luego se puede guardar con expo-file-system). */
export async function apiGetArrayBuffer(url: string): Promise<ArrayBuffer> {
  const res = await api.get(url, { responseType: 'arraybuffer' });
  return res.data as ArrayBuffer;
}

export default api;