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
