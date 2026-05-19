'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WelcomeScreen } from '@/components/panel/welcome-screen';
import { getStoredUser, removeStoredUser } from '@/lib/auth-store';
import type { UsuarioIT } from '@/lib/firebase';

export default function WelcomePage() {
  const router = useRouter();
  const [user, setUser] = useState<UsuarioIT | null>(null);
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
