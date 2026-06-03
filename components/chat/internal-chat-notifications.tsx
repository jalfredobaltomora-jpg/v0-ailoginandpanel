'use client';

import { useEffect, useRef } from 'react';
import { useChat } from './internal-chat-provider';
import { listenMessages, type ChatUserConv } from '@/lib/chat-firebase';

export function InternalChatNotifications() {
  const { isOpen, currentUserId, conversations, userConvs } = useChat();
  const notifiedRef = useRef<Set<string>>(new Set());
  const prevUnreadRef = useRef<Record<string, ChatUserConv>>({});

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Listen for new messages in all user conversations and show notifications
  useEffect(() => {
    if (!currentUserId) return;

    const unsubs: (() => void)[] = [];

    for (const conv of conversations) {
      if (!conv.participants[currentUserId]) continue;

      const unsub = listenMessages(conv.id, (msgs) => {
        if (msgs.length === 0) return;

        const lastMsg = msgs[msgs.length - 1];
        if (!lastMsg || lastMsg.senderId === currentUserId) return;

        const msgKey = `${conv.id}_${lastMsg.id}`;
        if (notifiedRef.current.has(msgKey)) return;

        const prevUnread = prevUnreadRef.current[conv.id]?.unread || 0;
        const currUnread = userConvs[conv.id]?.unread || 0;

        // Only notify if unread count increased (new message arrived)
        if (currUnread > prevUnread && !isOpen) {
          notifiedRef.current.add(msgKey);

          if ('Notification' in window && Notification.permission === 'granted') {
            const convName = conv.type === 'group' ? conv.name : lastMsg.senderName;
            const body = lastMsg.type === 'text'
              ? lastMsg.text
              : lastMsg.type === 'image' ? '📷 Imagen'
              : lastMsg.type === 'audio' ? '🎤 Audio'
              : '📎 Archivo';

            try {
              const notification = new Notification(convName, {
                body,
                icon: '/JB%20-%20SCA.png',
                tag: conv.id,
                silent: false,
              });
              notification.onclick = () => {
                window.focus();
              };
            } catch {
              // Notification not supported
            }
          }
        }

        // Clean up old notified keys
        if (notifiedRef.current.size > 100) {
          const keys = Array.from(notifiedRef.current);
          notifiedRef.current = new Set(keys.slice(-50));
        }
      });

      unsubs.push(unsub);
    }

    return () => {
      unsubs.forEach(fn => fn());
    };
  }, [conversations, currentUserId, isOpen, userConvs]);

  // Track unread counts
  useEffect(() => {
    prevUnreadRef.current = { ...userConvs };
  }, [userConvs]);

  return null;
}
