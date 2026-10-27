import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { CustomResponse } from '@/types/domain';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
export const USE_MOCK = (process.env.EXPO_PUBLIC_USE_MOCK ?? 'true') === 'true';

const TOKEN_KEY = 'agendaza_jwt';

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function clearToken(): Promise<void> {
  try {
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

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
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
  const res = await api.get<CustomResponse<T>>(url, config);
  return res.data.data ?? res.data;
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.post<CustomResponse<T>>(url, body);
  return res.data.data ?? res.data;
}

export async function apiPut<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.put<CustomResponse<T>>(url, body);
  return res.data.data ?? res.data;
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.patch<CustomResponse<T>>(url, body);
  return res.data.data ?? res.data;
}

export async function apiDelete<T>(url: string): Promise<T> {
  const res = await api.delete<CustomResponse<T>>(url);
  return res.data.data ?? res.data;
}

export async function apiGetBlob(url: string): Promise<Blob> {
  const res = await api.get(url, { responseType: 'blob' });
  return res.data as Blob;
}

export default api;
