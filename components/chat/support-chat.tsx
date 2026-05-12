'use client';

import { useState, useEffect, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { Send, X, Bot, User, Loader2, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  listenToSupportRequest,
  addMessageToRequest,
  type SupportRequest,
} from '@/lib/firebase';

interface SupportChatProps {
  requestId: string;
  username: string;
  onClose: () => void;
}

function getUIMessageText(msg: UIMessage): string {
  if (!msg.parts || !Array.isArray(msg.parts)) return '';
  return msg.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('');
}

export function SupportChat({ requestId, username, onClose }: SupportChatProps) {
  const [request, setRequest] = useState<SupportRequest | null>(null);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // AI Chat for when AI mode is active
  const { messages: aiMessages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/ai/chat' }),
  });

  useEffect(() => {
    const unsubscribe = listenToSupportRequest(requestId, setRequest);
    return unsubscribe;
  }, [requestId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [request?.messages, aiMessages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const message = inputValue;
    setInputValue('');

    if (request?.status === 'ai-active') {
      // Send to AI
      sendMessage({ text: message });
    } else {
      // Send to Firebase for IT
      await addMessageToRequest(requestId, {
        sender: 'user',
        text: message,
        ts: Date.now(),
      });
    }
  };

  const getStatusMessage = () => {
    switch (request?.status) {
      case 'pending':
        return 'Esperando que un técnico de IT acepte su solicitud...';
      case 'it-active':
        return 'Conectado con soporte de IT';
      case 'ai-active':
        return 'Asistente de IA verificando su identidad';
      case 'resolved':
        return 'Solicitud resuelta';
      default:
        return 'Conectando...';
    }
  };

  const allMessages = request?.status === 'ai-active'
    ? aiMessages.map((m) => ({
        id: m.id,
        sender: m.role === 'user' ? 'user' : 'ai',
        text: getUIMessageText(m),
        ts: Date.now(),
      }))
    : request?.messages || [];

  return (
    <Card className="flex h-[500px] w-full max-w-md flex-col border-primary/20 bg-card/95 shadow-[0_0_30px_rgba(0,242,255,0.1)] backdrop-blur-xl">
      <CardHeader className="flex-row items-center justify-between border-b border-border pb-4">
        <div>
          <CardTitle className="text-lg text-primary">Soporte IT</CardTitle>
          <p className="text-xs text-muted-foreground">{getStatusMessage()}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden p-4">
        {/* Status Badge */}
        <div className="flex items-center justify-center gap-2 rounded-lg bg-muted p-2 text-sm">
          {request?.status === 'pending' && (
            <>
              <Clock className="h-4 w-4 animate-pulse text-yellow-500" />
              <span className="text-muted-foreground">En espera</span>
            </>
          )}
          {request?.status === 'it-active' && (
            <>
              <User className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">IT Conectado</span>
            </>
          )}
          {request?.status === 'ai-active' && (
            <>
              <Bot className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">IA Activa</span>
            </>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto">
          {allMessages.length === 0 && request?.status === 'pending' && (
            <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
              <div>
                <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-primary" />
                <p>Un técnico de IT atenderá su solicitud en breve.</p>
                <p className="mt-1 text-xs">Usuario: {username}</p>
              </div>
            </div>
          )}

          {allMessages.map((msg, i) => (
            <div
              key={msg.id || i}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  msg.sender === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : msg.sender === 'ai'
                    ? 'bg-secondary text-secondary-foreground'
                    : 'bg-green-600 text-white'
                }`}
              >
                {msg.sender !== 'user' && (
                  <div className="mb-1 flex items-center gap-1 text-xs opacity-70">
                    {msg.sender === 'ai' ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
                    {msg.sender === 'ai' ? 'Asistente IA' : 'Soporte IT'}
                  </div>
                )}
                {msg.text}
              </div>
            </div>
          ))}

          {status === 'streaming' && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm text-secondary-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Escribiendo...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {request?.status !== 'pending' && request?.status !== 'resolved' && (
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Escribir mensaje..."
              className="flex-1 border-border bg-input"
            />
            <Button onClick={handleSendMessage} size="icon" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}

        {request?.status === 'resolved' && (
          <div className="rounded-lg bg-green-500/10 p-3 text-center text-sm text-green-500">
            Esta solicitud ha sido resuelta. Puede cerrar esta ventana.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
