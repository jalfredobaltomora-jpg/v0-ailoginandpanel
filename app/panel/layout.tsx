'use client';

import { useEffect, useState } from 'react';
import { SupportNotifications } from '@/components/it-manager/support-notifications';
import type { UsuarioIT } from '@/lib/firebase';

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const [isITManager, setIsITManager] = useState(false);

  useEffect(() => {
    try {
      const userStr = sessionStorage.getItem('currentUser');
      if (userStr) {
        const user: UsuarioIT = JSON.parse(userStr);
        setIsITManager(user.rol === 'it-manager' || user.rol === 'admin');
      }
    } catch {
      // Not logged in
    }
  }, []);

  return (
    <>
      {children}
      {isITManager && <SupportNotifications />}
    </>
  );
}
