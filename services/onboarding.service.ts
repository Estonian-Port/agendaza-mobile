import { apiGet, apiPut } from './api-client';

export interface TerminosVigentes {
  version: string | number;
  texto: string;
  hash: string;
}

export interface PerfilOnboarding {
  id?: number;
  username?: string;
  email?: string;
  nombre?: string;
  apellido?: string;
  celular?: string | number;
  fechaNacimiento?: string;
}

export interface CompletarPerfilDTO {
  nombre: string;
  apellido: string;
  celular: string;
  fechaNacimiento: string;
  username: string;
  email: string;
  password: string;
  aceptoTerminos: true;
  versionTerminos: string | number;
}

function readAvailability(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (!value || typeof value !== 'object') return null;
  if ('available' in value && typeof value.available === 'boolean') return value.available;
  if ('disponible' in value && typeof value.disponible === 'boolean') return value.disponible;
  if ('data' in value) return readAvailability(value.data);
  return null;
}

export const onboardingService = {
  getCurrentTerms(): Promise<TerminosVigentes> {
    return apiGet<TerminosVigentes>('/v1/terminos/vigente');
  },

  getProfile(): Promise<PerfilOnboarding> {
    return apiGet<PerfilOnboarding>('/v1/usuarios/me');
  },

  async checkUsername(username: string): Promise<boolean> {
    const response = await apiGet<unknown>('/v1/usuarios/check-username', { username });
    const available = readAvailability(response);
    if (available === null) throw new Error('El servidor devolvió una respuesta de validación no reconocida.');
    return available;
  },

  async completeProfile(profile: CompletarPerfilDTO): Promise<void> {
    await apiPut<void>('/v1/usuarios/me/completar-datos', profile);
  },
};