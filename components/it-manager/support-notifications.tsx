'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { listenToSupportRequests, type SupportRequest } from '@/lib/firebase';

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.4);
  } catch {
    // Audio not available
  }
}

function sendBrowserNotification(request: SupportRequest) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    const notif = new Notification('Nueva Solicitud de Soporte', {
      body: `${request.username} necesita ayuda`,
      icon: '/icon-light-32x32.png',
      tag: `support-${request.id}`,
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
    };
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission();
  }
}

interface FloatingToast {
  id: string;
  username: string;
  timestamp: number;
}

export function SupportNotifications() {
  const [toasts, setToasts] = useState<FloatingToast[]>([]);
  const seenIds = useRef<Set<string>>(new Set());
  const toastsRef = useRef(toasts);
  toastsRef.current = toasts;

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const unsubscribe = listenToSupportRequests((requests) => {
      const pending = requests.filter((r) => r.status === 'pending');

      for (const req of pending) {
        if (!seenIds.current.has(req.id)) {
          seenIds.current.add(req.id);

          const toast: FloatingToast = { id: req.id, username: req.username, timestamp: Date.now() };
          setToasts((prev) => [toast, ...prev].slice(0, 3));

          playNotificationSound();
          sendBrowserNotification(req);
        }
      }
    });

    return unsubscribe;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-[9999] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex w-80 animate-in slide-in-from-right items-start gap-3 rounded-xl border border-primary/30 bg-card/95 p-4 shadow-[0_0_30px_rgba(0,242,255,0.15)] backdrop-blur-xl"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20">
            <MessageSquare className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Nueva solicitud</p>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-primary">{toast.username}</span> necesita ayuda
            </p>
          </div>
          <button
            onClick={() => dismissToast(toast.id)}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
