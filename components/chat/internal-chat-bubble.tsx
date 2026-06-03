'use client';

import { MessageCircle, X } from 'lucide-react';
import { useChat } from './internal-chat-provider';

export function InternalChatBubble() {
  const { isOpen, setOpen, totalUnread } = useChat();

  return (
    <button
      onClick={() => setOpen(!isOpen)}
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:scale-110 hover:shadow-xl active:scale-95"
      title="Chat Interno"
    >
      {isOpen ? (
        <X className="h-6 w-6" />
      ) : (
        <MessageCircle className="h-6 w-6" />
      )}
      {totalUnread > 0 && !isOpen && (
        <span className="absolute -right-1 -top-1 flex h-6 min-w-[24px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white shadow-lg ring-2 ring-background">
          {totalUnread > 99 ? '99+' : totalUnread}
        </span>
      )}
    </button>
  );
}
