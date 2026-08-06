'use client';

import { useState, useMemo } from 'react';
import { Search, Plus, Users, User, MessageCircle, ChevronRight, BookUser } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useChat } from './internal-chat-provider';
import { createIndividualConversation, createGroupConversation, type ChatUser } from '@/lib/chat-firebase';

interface SidebarProps {
  onSelectConv: (convId: string) => void;
  selectedConvId: string | null;
}

type Tab = 'chats' | 'contacts';

export function InternalChatSidebar({ onSelectConv, selectedConvId }: SidebarProps) {
  const { users, conversations, currentUserId, currentUserName, userConvs } = useChat();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('chats');
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupSelected, setGroupSelected] = useState<string[]>([]);

  // Filter conversations that involve current user
  const myConvs = useMemo(() => {
    if (!currentUserId) return [];
    return conversations
      .filter(c => c.participants[currentUserId])
      .sort((a, b) => {
        const tsA = a.lastMessage?.ts || a.createdAt;
        const tsB = b.lastMessage?.ts || b.createdAt;
        return tsB - tsA;
      });
  }, [conversations, currentUserId]);

  // All other users grouped by area
  const contactsByArea = useMemo(() => {
    if (!currentUserId) return [];
    const otherUsers = users.filter(u => u.id !== currentUserId);
    const grouped: { area: string; users: ChatUser[] }[] = [];
    const areaMap = new Map<string, ChatUser[]>();
    for (const u of otherUsers) {
      const area = u.area || 'Sin área';
      if (!areaMap.has(area)) areaMap.set(area, []);
      areaMap.get(area)!.push(u);
    }
    for (const [area, users] of areaMap) {
      grouped.push({ area, users });
    }
    grouped.sort((a, b) => a.area.localeCompare(b.area));
    return grouped;
  }, [users, currentUserId]);

  // Filtered contacts by search
  const filteredContacts = useMemo(() => {
    if (!search) return contactsByArea;
    const lower = search.toLowerCase();
    return contactsByArea
      .map(group => ({
        area: group.area,
        users: group.users.filter(u =>
          u.nombre.toLowerCase().includes(lower) || u.area.toLowerCase().includes(lower)
        ),
      }))
      .filter(g => g.users.length > 0);
  }, [contactsByArea, search]);

  // Filtered conversations by search
  const filteredConvs = useMemo(() => {
    if (!search) return myConvs;
    const lower = search.toLowerCase();
    return myConvs.filter(c => {
      if (c.type === 'group') return c.name.toLowerCase().includes(lower);
      if (!currentUserId) return false;
      const otherId = Object.keys(c.participants).find(id => id !== currentUserId);
      const other = users.find(u => u.id === otherId);
      return other?.nombre.toLowerCase().includes(lower) || other?.area.toLowerCase().includes(lower);
    });
  }, [myConvs, search, users, currentUserId]);

  const getInitials = (name: string) => {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleStartChat = async (targetUser: ChatUser) => {
    if (!currentUserId) return;
    const convId = await createIndividualConversation(
      currentUserId, currentUserName,
      targetUser.id, targetUser.nombre
    );
    onSelectConv(convId);
    setTab('chats');
    setSearch('');
  };

  const handleCreateGroup = async () => {
    if (!currentUserId || !groupName.trim() || groupSelected.length < 2) return;
    const convId = await createGroupConversation(
      currentUserId, groupName.trim(), groupSelected
    );
    onSelectConv(convId);
    setShowNewGroup(false);
    setGroupName('');
    setGroupSelected([]);
    setTab('chats');
  };

  const toggleGroupSelect = (uid: string) => {
    setGroupSelected(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const convName = (conv: typeof myConvs[0]) => {
    if (conv.type === 'group') return conv.name;
    if (!currentUserId) return conv.name;
    const otherId = Object.keys(conv.participants).find(id => id !== currentUserId);
    const other = users.find(u => u.id === otherId);
    return other?.nombre || conv.name;
  };

  const convPhoto = (conv: typeof myConvs[0]) => {
    if (conv.type === 'group') return undefined;
    if (!currentUserId) return undefined;
    const otherId = Object.keys(conv.participants).find(id => id !== currentUserId);
    const other = users.find(u => u.id === otherId);
    return other?.foto;
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
  };

  const unreadCount = (convId: string) => userConvs[convId]?.unread || 0;

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => { setTab('chats'); setShowNewGroup(false); setSearch(''); }}
          className={cn(
            'flex-1 py-2.5 text-xs font-medium transition-colors relative',
            tab === 'chats' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <MessageCircle className="h-3.5 w-3.5 inline mr-1.5" />
          Chats
          {tab === 'chats' && <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full" />}
        </button>
        <button
          onClick={() => { setTab('contacts'); setShowNewGroup(false); setSearch(''); }}
          className={cn(
            'flex-1 py-2.5 text-xs font-medium transition-colors relative',
            tab === 'contacts' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <BookUser className="h-3.5 w-3.5 inline mr-1.5" />
          Contactos
          {tab === 'contacts' && <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full" />}
        </button>
      </div>

      {/* Search */}
      <div className="border-b border-border p-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === 'contacts' ? 'Buscar contacto o área...' : 'Buscar conversación...'}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Header actions */}
      {tab === 'chats' && (
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border">
          <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => { setShowNewGroup(!showNewGroup); setTab('chats'); }} title="Crear grupo">
            <Users className="h-3.5 w-3.5 mr-1" />{showNewGroup ? 'Cancelar' : 'Nuevo grupo'}
          </Button>
          {showNewGroup && (
            <span className="text-[10px] text-muted-foreground ml-auto">Selecciona 2+ miembros</span>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {/* New group form */}
        {showNewGroup && tab === 'chats' && (
          <div className="border-b border-border p-3 space-y-2">
            <Input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Nombre del grupo"
              className="h-8 text-xs"
            />
            <div className="max-h-32 overflow-y-auto space-y-1">
              {users.filter(u => u.id !== currentUserId).map(user => (
                <label key={user.id} className="flex items-center gap-2 py-1 px-1 hover:bg-muted/50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={groupSelected.includes(user.id)}
                    onChange={() => toggleGroupSelect(user.id)}
                    className="rounded border-border"
                  />
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.foto} />
                    <AvatarFallback className="text-[8px]">{getInitials(user.nombre)}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs truncate">{user.nombre}</span>
                </label>
              ))}
            </div>
            <Button
              size="sm"
              className="w-full h-7 text-xs"
              disabled={!groupName.trim() || groupSelected.length < 2}
              onClick={handleCreateGroup}
            >
              <Plus className="h-3 w-3 mr-1" /> Crear Grupo
            </Button>
          </div>
        )}

        {/* ─── CONTACTS TAB ─── */}
        {tab === 'contacts' && (
          <div>
            {filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4 mt-8">
                <BookUser className="h-10 w-10 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {search ? 'Sin resultados' : 'No hay contactos disponibles'}
                </p>
              </div>
            ) : (
              filteredContacts.map(group => (
                <div key={group.area}>
                  <div className="sticky top-0 bg-card/95 backdrop-blur px-3 py-1.5 border-b border-border/50">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {group.area}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-2">({group.users.length})</span>
                  </div>
                  {group.users.map(user => (
                    <button
                      key={user.id}
                      onClick={() => handleStartChat(user)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.foto} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {getInitials(user.nombre)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user.nombre}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.codigo}</p>
                      </div>
                      <div className={`h-2 w-2 rounded-full shrink-0 ${user.online ? 'bg-green-500' : 'bg-gray-300'}`} />
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        )}

        {/* ─── CHATS TAB ─── */}
        {tab === 'chats' && !showNewGroup && (
          <>
            {filteredConvs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4 mt-8">
                <MessageCircle className="h-10 w-10 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {search ? 'Sin resultados' : 'Sin conversaciones'}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {search ? 'Prueba con otro termino' : 'Ve a Contactos para iniciar un chat'}
                </p>
              </div>
            ) : (
              filteredConvs.map(conv => {
                const unread = unreadCount(conv.id);
                return (
                  <button
                    key={conv.id}
                    onClick={() => onSelectConv(conv.id)}
                    className={cn(
                      'flex w-full items-center gap-3 px-3 py-2.5 transition-colors text-left border-b border-border/50',
                      selectedConvId === conv.id ? 'bg-primary/10' : 'hover:bg-muted/50'
                    )}
                  >
                    {conv.type === 'group' ? (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary shrink-0">
                        <Users className="h-5 w-5" />
                      </div>
                    ) : (
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={convPhoto(conv)} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {getInitials(convName(conv))}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">{convName(conv)}</p>
                        {conv.lastMessage && (
                          <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                            {formatTime(conv.lastMessage.ts)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.lastMessage
                            ? `${conv.lastMessage.senderName === currentUserName ? 'Tu: ' : ''}${conv.lastMessage.text}`
                            : 'Sin mensajes'}
                        </p>
                        {unread > 0 && (
                          <span className="ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground shrink-0">
                            {unread > 9 ? '9+' : unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
}
