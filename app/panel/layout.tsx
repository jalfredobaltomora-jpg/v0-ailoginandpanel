'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { ErrorBoundary } from '@/components/panel/error-boundary';
import { PageTranslator } from '@/components/panel/page-translator';
import { getStoredUser } from '@/lib/auth-store';
import { tienePermiso } from '@/lib/permisos';
import type { UsuarioIT } from '@/lib/firebase';
import { LangProvider } from '@/lib/lang-context';

const SupportNotifications = dynamic(
  () => import('@/components/it-manager/support-notifications').then(m => m.SupportNotifications),
  { ssr: false }
);

const AlarmMonitor = dynamic(
  () => import('@/components/panel/alarm-monitor').then(m => m.AlarmMonitor),
  { ssr: false }
);

const ChatShell = dynamic(
  () => import('@/components/chat/chat-shell'),
  { ssr: false }
);

const FloatingAI = dynamic(
  () => import('@/components/ai-agent/floating-ai').then(m => m.FloatingAI),
  { ssr: false }
);

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const [isITManager, setIsITManager] = useState(false);

  useEffect(() => {
    try {
      const user = getStoredUser();
      if (user) {
        setIsITManager(tienePermiso(user, 'itManager'));
      }
    } catch {
      // Not logged in
    }
  }, []);

  return (
    <ErrorBoundary>
      <LangProvider>
        {children}
        {isITManager && <SupportNotifications />}
        <AlarmMonitor />
        <ChatShell />
        <FloatingAI />
        <PageTranslator />
      </LangProvider>
    </ErrorBoundary>
  );
}
