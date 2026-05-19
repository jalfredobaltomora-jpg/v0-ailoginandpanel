'use client';

import type { UsuarioIT } from '@/lib/firebase';

const KEY = 'currentUser';

export function getStoredUser(): UsuarioIT | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: UsuarioIT) {
  localStorage.setItem(KEY, JSON.stringify(user));
}

export function removeStoredUser() {
  localStorage.removeItem(KEY);
}
