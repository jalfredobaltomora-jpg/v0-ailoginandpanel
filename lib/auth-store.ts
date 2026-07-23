'use client';

import type { UsuarioIT } from '@/lib/firebase';

const KEY = 'sca_auth_token';
const USER_KEY = 'sca_user_safe';

export interface SafeUser {
  codigo: string;
  username: string;
  rol: 'admin' | 'user' | 'it-manager';
  activo: boolean;
  permisos?: Record<string, boolean>;
  pin?: string;
  createdAt?: string;
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(KEY);
}

export function setAuthToken(token: string) {
  localStorage.setItem(KEY, token);
}

export function removeAuthToken() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): SafeUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) return JSON.parse(raw);
    return null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: SafeUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function removeStoredUser() {
  localStorage.removeItem(USER_KEY);
}

// Legacy compat — returns null if old format with PIN detected
export function getStoredUserSafe(): SafeUser | null {
  const user = getStoredUser();
  if (!user) return null;
  // Remove any legacy PIN field
  if ('pin' in user) {
    const { pin: _, ...safe } = user as any;
    setStoredUser(safe);
    return safe;
  }
  return user;
}

// Authenticated fetch helper
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(url, { ...options, headers });
}
