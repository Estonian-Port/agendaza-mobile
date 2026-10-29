import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { CustomResponse } from '@/types/domain';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';

const TOKEN_KEY = 'agendaza_jwt';

export async function saveToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    window.localStorage.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return window.localStorage.getItem(TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function clearToken(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      window.localStorage.removeItem(TOKEN_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // ignore
  }
}

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

function unwrapResponse<T>(response: CustomResponse<T> | T): T {
  if (typeof response === 'object' && response !== null && 'data' in response) {
    return (response.data ?? response) as T;
  }
  return response as T;
}

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token && !config.url?.endsWith('/login')) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      void clearToken();
    }
    return Promise.reject(error);
  },
);

export async function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const config: AxiosRequestConfig = params ? { params } : {};
  const res = await api.get<CustomResponse<T> | T>(url, config);
  return unwrapResponse(res.data);
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.post<CustomResponse<T> | T>(url, body);
  return unwrapResponse(res.data);
}

export async function apiPut<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.put<CustomResponse<T> | T>(url, body);
  return unwrapResponse(res.data);
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.patch<CustomResponse<T> | T>(url, body);
  return unwrapResponse(res.data);
}

export async function apiDelete<T>(url: string): Promise<T> {
  const res = await api.delete<CustomResponse<T> | T>(url);
  return unwrapResponse(res.data);
}

export async function apiGetBlob(url: string): Promise<Blob> {
  const res = await api.get(url, { responseType: 'blob' });
  return res.data as Blob;
}

export default api;
