'use client';

import { useState, useEffect } from 'react';
import { X, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChat } from './internal-chat-provider';
import { InternalChatSidebar } from './internal-chat-sidebar';
import { InternalChatMessages } from './internal-chat-messages';
import { getConversationRef, type ChatConversation } from '@/lib/chat-firebase';
import { get } from '@/lib/firebase';

export function InternalChatWindow() {
  const { setOpen, conversations } = useChat();
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [selectedConv, setSelectedConv] = useState<ChatConversation | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);

  // Load conversation data when selected
  useEffect(() => {
    if (!selectedConvId) {
      setSelectedConv(null);
      setShowSidebar(true);
      return;
    }
    const conv = conversations.find(c => c.id === selectedConvId);
    if (conv) {
      setSelectedConv(conv);
      setShowSidebar(false);
    } else {
      // Fetch directly
      get(getConversationRef(selectedConvId)).then(snap => {
        setSelectedConv(snap.val());
      });
    }
  }, [selectedConvId, conversations]);

  const handleBack = () => {
    setShowSidebar(true);
    setSelectedConvId(null);
  };

  return (
    <div className="fixed bottom-24 right-6 z-50 flex h-[600px] w-[420px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl max-w-[calc(100vw-32px)] max-h-[calc(100vh-160px)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card p-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">
            {showSidebar || !selectedConv ? 'Chat Interno' : selectedConv.name}
          </span>
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          className={`w-full md:w-[280px] shrink-0 border-r border-border transition-all ${
            showSidebar ? 'block' : 'hidden md:block'
          }`}
          style={showSidebar ? undefined : { display: 'none' }}
        >
          {showSidebar && (
            <InternalChatSidebar onSelectConv={setSelectedConvId} selectedConvId={selectedConvId} />
          )}
        </div>

        {/* Messages */}
        {selectedConv && (
          <div className={`flex-1 min-w-0 ${showSidebar ? 'hidden md:flex' : 'flex'}`}>
            <InternalChatMessages conversation={selectedConv} onBack={handleBack} />
          </div>
        )}

        {/* Empty state when no conversation selected and sidebar is visible */}
        {!selectedConv && !showSidebar && (
          <div className="hidden md:flex flex-1 items-center justify-center text-center p-6 bg-background">
            <div>
              <MessageCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Selecciona una conversación</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Elige un chat de la lista para empezar
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
