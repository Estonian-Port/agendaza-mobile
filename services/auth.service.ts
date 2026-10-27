import { apiGet, USE_MOCK, saveToken, clearToken, getToken } from './api-client';
import { AuthSession, Cliente, Usuario } from '@/types/domain';
import { mockClientes, mockUsuarios } from './mock-data';

const BASE = '/v1/auth';

export const authService = {
  async login(email: string, password: string): Promise<AuthSession> {
    if (USE_MOCK) {
      const user = mockUsuarios.find((u) => u.email === email && u.password === password);
      if (!user) throw new Error('Credenciales inválidas');
      const { password: _pw, ...usuario } = user;
      const token = `mock-token-${user.id}-${Date.now()}`;
      await saveToken(token);
      return { token, usuario };
    }
    const res = await apiGet<AuthSession>(`${BASE}/login`, { email, password });
    await saveToken(res.token);
    return res;
  },

  async logout(): Promise<void> {
    await clearToken();
  },

  async isSessionValid(): Promise<boolean> {
    const t = await getToken();
    return !!t;
  },

  async buscarClientePorCelular(celular: string): Promise<Cliente | null> {
    if (USE_MOCK) {
      const found = mockClientes.find((c) => c.celular === celular);
      return found ?? null;
    }
    try {
      return await apiGet<Cliente>(`${BASE}/cliente/celular`, { celular });
    } catch {
      return null;
    }
  },

  async buscarClientePorEmail(email: string): Promise<Cliente | null> {
    if (USE_MOCK) {
      const found = mockClientes.find((c) => c.email === email);
      return found ?? null;
    }
    try {
      return await apiGet<Cliente>(`${BASE}/cliente/email`, { email });
    } catch {
      return null;
    }
  },
};
