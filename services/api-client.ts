import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { CustomResponse } from '@/types/domain';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ENV_API_URL = Constants.expoConfig?.extra?.apiUrl as string | undefined;
if (!ENV_API_URL && !__DEV__) {
  throw new Error('Falta API_URL en el build de producción');
}
const BASE_URL = ENV_API_URL || 'http://localhost:8080';

const ACCESS_TOKEN_KEY = 'agendaza_jwt';
const REFRESH_TOKEN_KEY = 'agendaza_refresh_token';

// Rutas que no necesitan token (se comparan sin query string).
const PUBLIC_PATHS = ['/login', '/register'];

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Si es true, no se envía el Authorization header ni se dispara onUnauthorized. */
    skipAuth?: boolean;
    _retry?: boolean;
    _accessToken?: string;
  }
}

type UnauthorizedHandler = () => void;
type OnboardingRequiredHandler = () => void;
type PasswordChangeRequiredHandler = () => void;

// ---------------------------------------------------------------------------
// Almacenamiento del token
// ---------------------------------------------------------------------------

// Cache en memoria para no leer SecureStore en cada request.
let cachedToken: string | null = null;
let tokenLoaded = false;
let cachedRefreshToken: string | null = null;
let refreshTokenLoaded = false;

const hasLocalStorage = () => Platform.OS === 'web' && typeof window !== 'undefined';

export async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  cachedToken = accessToken;
  tokenLoaded = true;
  cachedRefreshToken = refreshToken;
  refreshTokenLoaded = true;
  if (Platform.OS === 'web') {
    if (hasLocalStorage()) {
      window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
    return;
  }
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
  ]);
}

export async function getToken(): Promise<string | null> {
  if (tokenLoaded) return cachedToken;
  try {
    if (Platform.OS === 'web') {
      cachedToken = hasLocalStorage() ? window.localStorage.getItem(ACCESS_TOKEN_KEY) : null;
    } else {
      cachedToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    }
    tokenLoaded = true;
    return cachedToken;
  } catch {
    return null;
  }
}

export async function getRefreshToken(): Promise<string | null> {
  if (refreshTokenLoaded) return cachedRefreshToken;
  try {
    if (Platform.OS === 'web') {
      cachedRefreshToken = hasLocalStorage() ? window.localStorage.getItem(REFRESH_TOKEN_KEY) : null;
    } else {
      cachedRefreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    }
    refreshTokenLoaded = true;
    return cachedRefreshToken;
  } catch {
    return null;
  }
}

export async function clearToken(): Promise<void> {
  cachedToken = null;
  tokenLoaded = true;
  cachedRefreshToken = null;
  refreshTokenLoaded = true;
  try {
    if (Platform.OS === 'web') {
      if (hasLocalStorage()) {
        window.localStorage.removeItem(ACCESS_TOKEN_KEY);
        window.localStorage.removeItem(REFRESH_TOKEN_KEY);
      }
      return;
    }
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    ]);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Manejo de sesión expirada
// ---------------------------------------------------------------------------

let onUnauthorized: UnauthorizedHandler | null = null;
let onOnboardingRequired: OnboardingRequiredHandler | null = null;
let onPasswordChangeRequired: PasswordChangeRequiredHandler | null = null;

/** Registrar desde el AuthContext para redirigir al login cuando el backend responde 401. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler;
}

export function setOnboardingRequiredHandler(handler: OnboardingRequiredHandler | null): void {
  onOnboardingRequired = handler;
}

export function setPasswordChangeRequiredHandler(handler: PasswordChangeRequiredHandler | null): void {
  onPasswordChangeRequired = handler;
}

export function isOnboardingRequiredError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const response = 'response' in error ? error.response : undefined;
  if (!response || typeof response !== 'object') return false;
  const status = 'status' in response ? response.status : undefined;
  const data = 'data' in response ? response.data : undefined;
  return status === 403 && !!data && typeof data === 'object' && 'code' in data && data.code === 'ONBOARDING_REQUIRED';
}

export function isPasswordChangeRequiredError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const response = 'response' in error ? error.response : undefined;
  if (!response || typeof response !== 'object') return false;
  const status = 'status' in response ? response.status : undefined;
  const data = 'data' in response ? response.data : undefined;
  return status === 403 && !!data && typeof data === 'object' && 'code' in data && data.code === 'PASSWORD_CHANGE_REQUIRED';
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

function isAuthEndpoint(config: InternalAxiosRequestConfig): boolean {
  const path = getPathname(config.url);
  return path === '/login' || path.endsWith('/login') || path === '/v1/auth/refresh';
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
  config._accessToken = token ?? undefined;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config as InternalAxiosRequestConfig | undefined;
    const status = error?.response?.status;
    const code = error?.response?.data?.code;
    if (status === 403 && code === 'PASSWORD_CHANGE_REQUIRED') {
      onPasswordChangeRequired?.();
    }
    if (config && isSameOrigin(config.url) && !isPublicRequest(config) && !isAuthEndpoint(config)) {
      if (status === 401 && code === 'TOKEN_EXPIRED' && !config._retry) {
        config._retry = true;
        try {
          const tokens = await refreshForRequest(config._accessToken);
          if (getPathname(config.url) === '/v1/auth/logout') {
            config.data = JSON.stringify({ refreshToken: tokens.refreshToken });
          }
          return api.request(config);
        } catch (refreshError) {
          return Promise.reject(refreshError);
        }
      }
      if (status === 401 && code === 'UNAUTHENTICATED') {
        await clearToken();
        onUnauthorized?.();
      }
    }
    if (isOnboardingRequiredError(error)) {
      onOnboardingRequired?.();
    }
    return Promise.reject(error);
  },
);

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

let refreshInFlight: Promise<AuthTokens> | null = null;

async function performRefresh(): Promise<AuthTokens> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    await clearToken();
    onUnauthorized?.();
    throw new Error('La sesión terminó. Iniciá sesión nuevamente.');
  }

  try {
    const response = await api.post<{ data?: AuthTokens }>('/v1/auth/refresh', { refreshToken }, { skipAuth: true });
    const tokens = response.data?.data;
    if (!tokens?.accessToken || !tokens.refreshToken) {
      throw new Error('El backend no retornó tokens válidos.');
    }
    await saveTokens(tokens.accessToken, tokens.refreshToken);
    return tokens;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      await clearToken();
      onUnauthorized?.();
    }
    throw error;
  }
}

function refreshSession(): Promise<AuthTokens> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function refreshForRequest(requestToken?: string): Promise<AuthTokens> {
  if (refreshInFlight) return refreshInFlight;
  const currentToken = await getToken();
  if (refreshInFlight) return refreshInFlight;
  if (requestToken && currentToken && requestToken !== currentToken) {
    return {
      accessToken: currentToken,
      refreshToken: (await getRefreshToken()) ?? '',
    };
  }
  return refreshSession();
}

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