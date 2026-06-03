'use client';

import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import {
  registerChatUser,
  listenChatUsers,
  updateUserOnline,
  listenConversations,
  listenUserConversations,
  cleanupOldConversations,
  type ChatUser,
  type ChatConversation,
  type ChatUserConv,
} from '@/lib/chat-firebase';
import { getStoredUser } from '@/lib/auth-store';
import { getEmpleadoByCodigo, type Empleado } from '@/lib/firebase';

interface ChatContextType {
  isOpen: boolean;
  setOpen: (v: boolean) => void;
  currentUserId: string | null;
  currentUserName: string;
  currentUser: ChatUser | null;
  users: ChatUser[];
  conversations: ChatConversation[];
  userConvs: Record<string, ChatUserConv>;
  totalUnread: number;
}

const ChatContext = createContext<ChatContextType>({
  isOpen: false,
  setOpen: () => {},
  currentUserId: null,
  currentUserName: '',
  currentUser: null,
  users: [],
  conversations: [],
  userConvs: {},
  totalUnread: 0,
});

export function useChat() {
  return useContext(ChatContext);
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState('');
  const [currentUser, setCurrentUser] = useState<ChatUser | null>(null);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [userConvs, setUserConvs] = useState<Record<string, ChatUserConv>>({});
  const [totalUnread, setTotalUnread] = useState(0);
  const initialized = useRef(false);

  // Initialize
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const storedUser = getStoredUser();
    if (!storedUser) return;

    const uid = storedUser.codigo || storedUser.username;
    setCurrentUserId(uid);
    setCurrentUserName(storedUser.username);

    getEmpleadoByCodigo(storedUser.codigo).then((emp: Empleado | null) => {
      if (emp) {
        registerChatUser(emp, uid).then((u) => {
          setCurrentUser(u);
          updateUserOnline(uid, true);
        });
      }
    });

    // Cleanup old conversations
    cleanupOldConversations();

    // Listen for page visibility changes
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && uid) {
        updateUserOnline(uid, true);
        cleanupOldConversations();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Listen for users
  useEffect(() => {
    const unsub = listenChatUsers(setUsers);
    return unsub;
  }, []);

  // Listen for conversations
  useEffect(() => {
    const unsub = listenConversations(setConversations);
    return unsub;
  }, []);

  // Listen for user's conversation metadata
  useEffect(() => {
    if (!currentUserId) return;
    const unsub = listenUserConversations(currentUserId, (uc) => {
      setUserConvs(uc);
      const total = Object.values(uc).reduce((sum, c) => sum + (c.unread || 0), 0);
      setTotalUnread(total);
    });
    return unsub;
  }, [currentUserId]);

  return (
    <ChatContext.Provider value={{
      isOpen, setOpen,
      currentUserId, currentUserName, currentUser,
      users, conversations, userConvs, totalUnread,
    }}>
      {children}
    </ChatContext.Provider>
  );
}
