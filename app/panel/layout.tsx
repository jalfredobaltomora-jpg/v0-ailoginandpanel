'use client';

import { useEffect, useState } from 'react';
import { SupportNotifications } from '@/components/it-manager/support-notifications';
import { AlarmMonitor } from '@/components/panel/alarm-monitor';
import { getStoredUser } from '@/lib/auth-store';
import type { UsuarioIT } from '@/lib/firebase';

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const [isITManager, setIsITManager] = useState(false);

  useEffect(() => {
    try {
      const user = getStoredUser();
      if (user) {
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
      <AlarmMonitor />
    </>
  );
}
