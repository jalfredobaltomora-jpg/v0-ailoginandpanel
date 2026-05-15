'use client';

import { SupportNotifications } from '@/components/it-manager/support-notifications';

export default function ITManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SupportNotifications />
    </>
  );
}
