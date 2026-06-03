'use client';

import { ChatProvider, useChat } from './internal-chat-provider';
import { InternalChatBubble } from './internal-chat-bubble';
import { InternalChatWindow } from './internal-chat-window';
import { InternalChatNotifications } from './internal-chat-notifications';

function ChatUI() {
  const { isOpen } = useChat();
  return (
    <>
      <InternalChatBubble />
      {isOpen && <InternalChatWindow />}
      <InternalChatNotifications />
    </>
  );
}

export default function ChatShell() {
  return (
    <ChatProvider>
      <ChatUI />
    </ChatProvider>
  );
}
