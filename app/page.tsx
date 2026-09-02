'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser, setStoredUser } from '@/lib/auth-store';
import type { UsuarioIT } from '@/lib/firebase';

const LoginCard = dynamic(() => import('@/components/login/login-card').then(m => m.LoginCard), { ssr: false });
const SupportChat = dynamic(() => import('@/components/chat/support-chat').then(m => m.SupportChat), { ssr: false });

export default function LoginPage() {
  const router = useRouter();
  const [showChat, setShowChat] = useState(false);
  const [chatRequestId, setChatRequestId] = useState<string | null>(null);
  const [chatUsername, setChatUsername] = useState('');

  // Auto-redirect if already logged in
  useEffect(() => {
    const user = getStoredUser();
    if (user) {
      router.replace('/panel/welcome');
    }
  }, [router]);

  const handleLoginSuccess = (user: UsuarioIT) => {
    setStoredUser(user);
    router.push('/panel/welcome');
  };

  const handleRequestSupport = async (username: string, similarUser: string | null) => {
    // Create support request in Firebase
    const { createSupportRequest } = await import('@/lib/firebase');
    const requestId = await createSupportRequest({
      userId: username,
      username: username,
      status: 'pending',
      createdAt: Date.now(),
      messages: [{
        id: 'initial',
        sender: 'user',
        text: similarUser 
          ? `Necesito ayuda para acceder. Mi usuario podría ser "${similarUser}" pero no estoy seguro.`
          : 'Necesito ayuda para acceder al sistema.',
        ts: Date.now(),
      }],
    });

    setChatRequestId(requestId);
    setChatUsername(username);
    setShowChat(true);
  };

  const handleCloseChat = () => {
    setShowChat(false);
    setChatRequestId(null);
    setChatUsername('');
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background p-4">
      {/* Background gradient effect */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      </div>

      {/* Watermark JB Logo */}
      <style>{`
@keyframes watermarkFloat {
  0% { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 0.04; }
  25% { transform: translate(-48%, -52%) scale(1.02) rotate(1deg); opacity: 0.06; }
  50% { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 0.04; }
  75% { transform: translate(-52%, -48%) scale(1.02) rotate(-1deg); opacity: 0.06; }
  100% { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 0.04; }
}
.watermark-jb {
  animation: watermarkFloat 8s ease-in-out infinite;
  will-change: transform, opacity;
}
`}</style>
      <div className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center">
        <img
          src="/logo.png"
          alt=""
          className="watermark-jb w-[60vw] max-w-[500px] h-auto object-contain mix-blend-screen"
          style={{ filter: 'grayscale(1) brightness(2) contrast(0.8)', imageRendering: 'auto' }}
        />
      </div>

      {/* Login Card */}
      {!showChat && (
        <LoginCard
          onLoginSuccess={handleLoginSuccess}
          onRequestSupport={handleRequestSupport}
        />
      )}

      {/* Support Chat */}
      {showChat && chatRequestId && (
        <SupportChat
          requestId={chatRequestId}
          username={chatUsername}
          onClose={handleCloseChat}
        />
      )}
    </main>
  );
}
