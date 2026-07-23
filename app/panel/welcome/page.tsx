'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser, removeStoredUser, type SafeUser } from '@/lib/auth-store';

const WelcomeScreen = dynamic(() => import('@/components/panel/welcome-screen').then(m => m.WelcomeScreen), { ssr: false });

export default function WelcomePage() {
  const router = useRouter();
  const [user, setUser] = useState<SafeUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const u = getStoredUser();
    if (!u) {
      router.push('/');
      return;
    }
    setUser(u);
    setChecking(false);
  }, [router]);

  const handleEnter = () => {
    router.push('/panel');
  };

  if (checking || !user) return null;

  return <WelcomeScreen user={user} onEnter={handleEnter} />;
}
