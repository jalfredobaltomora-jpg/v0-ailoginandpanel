'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoginCard } from '@/components/login/login-card';
import { SupportChat } from '@/components/chat/support-chat';
import { setStoredUser } from '@/lib/auth-store';
import { createSupportRequest, type UsuarioIT } from '@/lib/firebase';

export default function LoginPage() {
  const router = useRouter();
  const [showChat, setShowChat] = useState(false);
  const [chatRequestId, setChatRequestId] = useState<string | null>(null);
  const [chatUsername, setChatUsername] = useState('');

  const handleLoginSuccess = (user: UsuarioIT) => {
    setStoredUser(user);
    router.push('/panel/welcome');
  };

  const handleRequestSupport = async (username: string, similarUser: string | null) => {
    // Create support request in Firebase
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

      {/* Rotating JB Logo */}
      <style>{`
@keyframes rotateJB {
  0% { transform: perspective(800px) rotateY(-18deg); }
  50% { transform: perspective(800px) rotateY(18deg); }
  100% { transform: perspective(800px) rotateY(-18deg); }
}
.logo-jb {
  animation: rotateJB 4s ease-in-out infinite;
  transform-style: preserve-3d;
}
`}</style>
      <div className="fixed left-4 top-4 z-10 flex h-16 w-16 items-center justify-center overflow-visible rounded-xl border border-primary/20 bg-background/80 shadow-lg backdrop-blur-sm">
        <img
          src="/v0-ailoginandpanel/logo.png"
          alt="JB"
          className="logo-jb h-12 w-auto"
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
