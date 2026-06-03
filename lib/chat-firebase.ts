import { db, ref, set, get, update, remove, push, onValue, type Empleado } from './firebase';

export interface ChatUser {
  id: string;
  codigo: string;
  nombre: string;
  area: string;
  foto?: string;
  online: boolean;
  lastSeen: number;
}

export interface ChatFile {
  name: string;
  type: string;
  size: number;
  data: string;
}

export interface ChatMessage {
  id: string;
  convId: string;
  senderId: string;
  senderName: string;
  text: string;
  type: 'text' | 'image' | 'file' | 'audio';
  file?: ChatFile;
  audioDuration?: number;
  ts: number;
}

export interface ChatConversation {
  id: string;
  type: 'individual' | 'group';
  name: string;
  participants: Record<string, boolean>;
  area?: string;
  createdBy: string;
  createdAt: number;
  lastMessage?: {
    text: string;
    senderId: string;
    senderName: string;
    ts: number;
  };
}

export interface ChatUserConv {
  lastRead: number;
  unread: number;
}

const CHAT_DB = 'chat';

function genId(): string {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function now(): number {
  return Date.now();
}

const THREE_MONTHS = 90 * 24 * 60 * 60 * 1000;

export function getChatUsersRef() {
  return ref(db, `${CHAT_DB}/users`);
}

export function getConversationsRef() {
  return ref(db, `${CHAT_DB}/conversations`);
}

export function getConversationRef(convId: string) {
  return ref(db, `${CHAT_DB}/conversations/${convId}`);
}

export function getMessagesRef(convId: string) {
  return ref(db, `${CHAT_DB}/messages/${convId}`);
}

export function getUserConvsRef(userId: string) {
  return ref(db, `${CHAT_DB}/user-conversations/${userId}`);
}

export function getUserConvRef(userId: string, convId: string) {
  return ref(db, `${CHAT_DB}/user-conversations/${userId}/${convId}`);
}

// ─── Users ───

export async function registerChatUser(empleado: Empleado, userId: string) {
  const chatUser: ChatUser = {
    id: userId,
    codigo: empleado.code,
    nombre: `${empleado.nombres} ${empleado.apellidos}`,
    area: empleado.area,
    foto: empleado.foto,
    online: true,
    lastSeen: now(),
  };
  await set(ref(db, `${CHAT_DB}/users/${userId}`), chatUser);
  return chatUser;
}

export function listenChatUsers(callback: (users: ChatUser[]) => void): () => void {
  return onValue(getChatUsersRef(), (snap) => {
    const raw = snap.val();
    callback(raw ? Object.values(raw) : []);
  });
}

export function listenChatUser(userId: string, callback: (user: ChatUser | null) => void): () => void {
  return onValue(ref(db, `${CHAT_DB}/users/${userId}`), (snap) => {
    callback(snap.val());
  });
}

export async function updateUserOnline(userId: string, online: boolean) {
  const userRef = ref(db, `${CHAT_DB}/users/${userId}`);
  const data = { online, lastSeen: now() };
  await update(userRef, data);
  if (online) {
    // Use Firebase onDisconnect: when the connection drops (crash, tab close, network),
    // Firebase automatically marks the user as offline
    try { userRef.onDisconnect().update({ online: false }); } catch {}
  }
}

// ─── Conversations ───

export async function createIndividualConversation(
  currentUserId: string,
  currentUserName: string,
  targetUserId: string,
  targetUserName: string
): Promise<string> {
  const existing = await findExistingConversation(currentUserId, targetUserId);
  if (existing) return existing;

  const convId = genId();
  const conv: ChatConversation = {
    id: convId,
    type: 'individual',
    name: targetUserName,
    participants: { [currentUserId]: true, [targetUserId]: true },
    createdBy: currentUserId,
    createdAt: now(),
  };
  await set(getConversationRef(convId), conv);
  await set(getUserConvRef(currentUserId, convId), { lastRead: now(), unread: 0 });
  await set(getUserConvRef(targetUserId, convId), { lastRead: now(), unread: 0 });
  return convId;
}

export async function createGroupConversation(
  currentUserId: string,
  groupName: string,
  participantIds: string[],
  area?: string
): Promise<string> {
  const convId = genId();
  const participants: Record<string, boolean> = {};
  participantIds.forEach(id => { participants[id] = true; });
  participants[currentUserId] = true;

  const conv: ChatConversation = {
    id: convId,
    type: 'group',
    name: groupName,
    participants,
    area,
    createdBy: currentUserId,
    createdAt: now(),
  };
  await set(getConversationRef(convId), conv);
  const allIds = [...new Set([...participantIds, currentUserId])];
  for (const id of allIds) {
    await set(getUserConvRef(id, convId), { lastRead: now(), unread: 0 });
  }
  return convId;
}

async function findExistingConversation(userA: string, userB: string): Promise<string | null> {
  const snap = await get(getConversationsRef());
  const convs: Record<string, ChatConversation> = snap.val() || {};
  for (const [id, conv] of Object.entries(convs)) {
    if (conv.type !== 'individual') continue;
    const p = conv.participants;
    if (p[userA] && p[userB] && Object.keys(p).length === 2) return id;
  }
  return null;
}

export function listenConversations(callback: (convs: ChatConversation[]) => void): () => void {
  return onValue(getConversationsRef(), (snap) => {
    const raw = snap.val();
    callback(raw ? Object.values(raw) : []);
  });
}

export function listenUserConversations(userId: string, callback: (convs: Record<string, ChatUserConv>) => void): () => void {
  return onValue(getUserConvsRef(userId), (snap) => {
    callback(snap.val() || {});
  });
}

// ─── Messages ───

export async function sendMessage(
  convId: string,
  senderId: string,
  senderName: string,
  text: string,
  type: 'text' | 'image' | 'file' | 'audio' = 'text',
  file?: ChatFile,
  audioDuration?: number
): Promise<string> {
  const msgId = genId();
  const ts = now();
  const msg: ChatMessage = {
    id: msgId,
    convId,
    senderId,
    senderName,
    text,
    type,
    ts,
    ...(file && { file }),
    ...(audioDuration !== undefined && { audioDuration }),
  };
  await set(ref(db, `${CHAT_DB}/messages/${convId}/${msgId}`), msg);
  await update(getConversationRef(convId), {
    lastMessage: { text, senderId, senderName, ts },
  });
  // Increment unread for all participants except sender
  const convSnap = await get(getConversationRef(convId));
  const conv = convSnap.val() as ChatConversation;
  if (conv) {
    for (const pid of Object.keys(conv.participants)) {
      if (pid !== senderId) {
        const uRef = getUserConvRef(pid, convId);
        const uSnap = await get(uRef);
        const uData = uSnap.val() as ChatUserConv | null;
        await set(uRef, {
          lastRead: uData?.lastRead || 0,
          unread: (uData?.unread || 0) + 1,
        });
      }
    }
  }
  return msgId;
}

export function listenMessages(convId: string, callback: (msgs: ChatMessage[]) => void): () => void {
  const msgsRef = ref(db, `${CHAT_DB}/messages/${convId}`);
  return onValue(msgsRef, (snap) => {
    const raw = snap.val();
    if (!raw) { callback([]); return; }
    const msgs: ChatMessage[] = Object.values(raw);
    msgs.sort((a, b) => a.ts - b.ts);
    callback(msgs);
  });
}

export async function markConversationRead(userId: string, convId: string) {
  await set(getUserConvRef(userId, convId), { lastRead: now(), unread: 0 });
}

// ─── Auto-delete old conversations ───

export async function cleanupOldConversations() {
  const cutoff = now() - THREE_MONTHS;
  const convSnap = await get(getConversationsRef());
  const convs: Record<string, ChatConversation> = convSnap.val() || {};
  for (const [id, conv] of Object.entries(convs)) {
    if (conv.lastMessage?.ts && conv.lastMessage.ts < cutoff) {
      // Delete all messages
      const msgsSnap = await get(getMessagesRef(id));
      if (msgsSnap.val()) {
        await remove(getMessagesRef(id));
      }
      // Remove from user conversations
      for (const pid of Object.keys(conv.participants)) {
        await remove(getUserConvRef(pid, id));
      }
      await remove(getConversationRef(id));
    }
  }
}

// ─── File to base64 ───

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function base64ToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mime });
}

export function downloadFile(dataUrl: string, fileName: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
