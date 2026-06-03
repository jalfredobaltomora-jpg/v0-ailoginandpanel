'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Image as ImageIcon, FileText, X, ChevronLeft, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useChat } from './internal-chat-provider';
import {
  listenMessages,
  sendMessage,
  markConversationRead,
  fileToBase64,
  downloadFile,
  type ChatMessage,
  type ChatConversation,
} from '@/lib/chat-firebase';
import { AudioRecorder, AudioPlayer } from './internal-chat-audio';

interface MessagesViewProps {
  conversation: ChatConversation;
  onBack: () => void;
}

export function InternalChatMessages({ conversation, onBack }: MessagesViewProps) {
  const { currentUserId, currentUserName, users } = useChat();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ file: File; dataUrl: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = listenMessages(conversation.id, (msgs) => {
      setMessages(msgs);
    });
    return unsub;
  }, [conversation.id]);

  // Mark as read
  useEffect(() => {
    if (currentUserId) {
      markConversationRead(currentUserId, conversation.id);
    }
  }, [conversation.id, currentUserId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const convName = () => {
    if (conversation.type === 'group') return conversation.name;
    if (!currentUserId) return conversation.name;
    const otherId = Object.keys(conversation.participants).find(id => id !== currentUserId);
    const other = users.find(u => u.id === otherId);
    return other?.nombre || conversation.name;
  };

  const convPhoto = () => {
    if (conversation.type === 'group') return undefined;
    if (!currentUserId) return undefined;
    const otherId = Object.keys(conversation.participants).find(id => id !== currentUserId);
    const other = users.find(u => u.id === otherId);
    return other?.foto;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return 'Hoy';
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
    return d.toLocaleDateString('es', { day: 'numeric', month: 'long' });
  };

  const groupByDate = () => {
    const groups: { label: string; msgs: ChatMessage[] }[] = [];
    let currentLabel = '';
    for (const msg of messages) {
      const label = formatDate(msg.ts);
      if (label !== currentLabel) {
        currentLabel = label;
        groups.push({ label, msgs: [msg] });
      } else {
        groups[groups.length - 1].msgs.push(msg);
      }
    }
    return groups;
  };

  const handleSend = async () => {
    if ((!input.trim() && !attachedFile) || !currentUserId) return;
    setSending(true);

    try {
      if (attachedFile) {
        const isImage = attachedFile.file.type.startsWith('image/');
        await sendMessage(
          conversation.id,
          currentUserId,
          currentUserName,
          attachedFile.file.name,
          isImage ? 'image' : 'file',
          {
            name: attachedFile.file.name,
            type: attachedFile.file.type,
            size: attachedFile.file.size,
            data: attachedFile.dataUrl,
          }
        );
        setAttachedFile(null);
      }
      if (input.trim()) {
        await sendMessage(conversation.id, currentUserId, currentUserName, input.trim());
        setInput('');
      }
    } catch {
      // Error sending
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, isImage: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToBase64(file);
    setAttachedFile({ file, dataUrl });
    e.target.value = '';
  };

  const handleAudioCapture = async (blob: Blob, duration: number) => {
    if (!currentUserId) return;
    setSending(true);
    try {
      const file = new File([blob], 'audio.webm', { type: 'audio/webm' });
      const dataUrl = await fileToBase64(file);
      await sendMessage(
        conversation.id,
        currentUserId,
        currentUserName,
        'Audio',
        'audio',
        { name: 'audio.webm', type: 'audio/webm', size: blob.size, data: dataUrl },
        duration
      );
    } catch (e) {
      console.error('Error sending audio:', e);
    } finally {
      setSending(false);
    }
  };

  const handleDownloadAttachment = (msg: ChatMessage) => {
    if (msg.file?.data) {
      downloadFile(msg.file.data, msg.file.name);
    }
  };

  const isMyMessage = (msg: ChatMessage) => msg.senderId === currentUserId;
  const grouped = groupByDate();

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-card p-3">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 md:hidden" onClick={onBack}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-9 w-9">
          <AvatarImage src={convPhoto()} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {getInitials(convName())}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{convName()}</p>
          <p className="text-[11px] text-muted-foreground">
            {conversation.type === 'group' ? `${Object.keys(conversation.participants).length} participantes` : ''}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-1">
        {grouped.map(group => (
          <div key={group.label}>
            <div className="flex justify-center my-3">
              <span className="rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground">
                {group.label}
              </span>
            </div>
            {group.msgs.map((msg, idx) => {
              const showSender = conversation.type === 'group' && !isMyMessage(msg);
              const prevMsg = idx > 0 ? group.msgs[idx - 1] : null;
              const showAvatar = showSender && (!prevMsg || prevMsg.senderId !== msg.senderId);
              return (
                <div
                  key={msg.id}
                  className={cn('flex mb-1', isMyMessage(msg) ? 'justify-end' : 'justify-start')}
                >
                  <div className={cn('flex gap-2 max-w-[80%]', isMyMessage(msg) && 'flex-row-reverse')}>
                    {showAvatar && (
                      <Avatar className="h-7 w-7 mt-1 shrink-0">
                        <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                          {getInitials(msg.senderName)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    {!showAvatar && showSender && <div className="w-7 shrink-0" />}
                    <div>
                      {showSender && (
                        <p className="text-[10px] text-muted-foreground mb-0.5 ml-1">
                          {msg.senderName}
                        </p>
                      )}
                      <div
                        className={cn(
                          'rounded-2xl px-3.5 py-2 text-sm',
                          isMyMessage(msg)
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-muted text-foreground rounded-bl-md'
                        )}
                      >
                        {/* Message content */}
                        {msg.type === 'text' && (
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                        )}

                        {msg.type === 'image' && msg.file?.data && (
                          <div className="space-y-1">
                            <img
                              src={msg.file.data}
                              alt={msg.file.name}
                              className="max-w-full max-h-64 rounded-lg object-contain cursor-pointer"
                              onClick={() => window.open(msg.file!.data, '_blank')}
                            />
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] opacity-70 truncate max-w-[150px]">{msg.file.name}</span>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleDownloadAttachment(msg)}>
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}

                        {msg.type === 'file' && msg.file?.data && (
                          <div className="flex items-center gap-2">
                            <FileText className="h-8 w-8 shrink-0 opacity-70" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{msg.file.name}</p>
                              <p className="text-[10px] opacity-70">
                                {(msg.file.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDownloadAttachment(msg)}>
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}

                        {msg.type === 'audio' && msg.file?.data && (
                          <AudioPlayer dataUrl={msg.file.data} duration={msg.audioDuration || 0} />
                        )}

                        <span className={cn(
                          'text-[10px] mt-1 block text-right',
                          isMyMessage(msg) ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        )}>
                          {formatTime(msg.ts)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachment preview */}
      {attachedFile && (
        <div className="border-t border-border bg-card p-2 flex items-center gap-2">
          {attachedFile.file.type.startsWith('image/') ? (
            <img src={attachedFile.dataUrl} alt="" className="h-10 w-10 rounded object-cover" />
          ) : (
            <FileText className="h-8 w-8 text-muted-foreground" />
          )}
          <span className="text-xs truncate flex-1">{attachedFile.file.name}</span>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500" onClick={() => setAttachedFile(null)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border bg-card p-2">
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.xlsx,.xls,.doc,.docx,.txt,.zip,.rar"
            onChange={(e) => handleFileSelect(e, false)}
            className="hidden"
          />
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFileSelect(e, true)}
            className="hidden"
          />
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
              onClick={() => imageInputRef.current?.click()}
              title="Enviar imagen"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
              onClick={() => fileInputRef.current?.click()}
              title="Adjuntar archivo"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <AudioRecorder onCapture={handleAudioCapture} />
          </div>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje..."
            className="min-h-[36px] max-h-[100px] resize-none text-sm py-2 px-3"
            rows={1}
            disabled={sending}
          />
          <Button
            onClick={handleSend}
            disabled={sending || (!input.trim() && !attachedFile)}
            size="sm"
            className="h-9 w-9 p-0 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
