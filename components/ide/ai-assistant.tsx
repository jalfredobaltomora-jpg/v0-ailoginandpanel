'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Loader2, Sparkles, Code, Wand2, X, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  codeSnippet?: string;
  timestamp: Date;
}

interface AIAssistantProps {
  currentCode: string;
  onApplyCode: (code: string) => void;
  selectedFile?: string;
}

const quickActions = [
  { label: 'Optimizar codigo', prompt: 'Optimiza este codigo para mejor rendimiento' },
  { label: 'Agregar validacion', prompt: 'Agrega validaciones de entrada al formulario' },
  { label: 'Agregar comentarios', prompt: 'Agrega comentarios explicativos al codigo' },
  { label: 'Corregir errores', prompt: 'Revisa y corrige posibles errores en el codigo' },
  { label: 'Mejorar UI', prompt: 'Sugiere mejoras para la interfaz de usuario' },
  { label: 'Agregar loading', prompt: 'Agrega estados de carga y feedback visual' },
];

export function AIAssistant({ currentCode, onApplyCode, selectedFile }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hola! Soy tu asistente de IA para desarrollo. Puedo ayudarte a:\n\n- Generar codigo\n- Optimizar funciones\n- Corregir errores\n- Mejorar la UI\n- Explicar codigo\n\nSelecciona un archivo y preguntame lo que necesites!',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (prompt?: string) => {
    const messageText = prompt || input;
    if (!messageText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/ide/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: messageText,
          currentCode,
          selectedFile,
        }),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message || 'Lo siento, no pude procesar tu solicitud.',
        codeSnippet: data.code,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Error al conectar con el asistente. Por favor intenta de nuevo.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col bg-card border-t border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Asistente IA</span>
        </div>
        <div className="flex items-center gap-1">
          <Sparkles className="h-4 w-4 text-yellow-500" />
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-1 px-2 py-2 border-b border-border overflow-x-auto">
        {quickActions.map((action, index) => (
          <Button
            key={index}
            size="sm"
            variant="outline"
            onClick={() => handleSend(action.prompt)}
            disabled={loading}
            className="h-6 px-2 text-xs whitespace-nowrap"
          >
            <Wand2 className="h-3 w-3 mr-1" />
            {action.label}
          </Button>
        ))}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-2',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[85%] rounded-lg p-3',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 border border-border'
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                
                {message.codeSnippet && (
                  <div className="mt-3 relative">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Code className="h-3 w-3" />
                        Codigo sugerido
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopyCode(message.codeSnippet!, message.id)}
                          className="h-6 w-6 p-0"
                        >
                          {copiedId === message.id ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => onApplyCode(message.codeSnippet!)}
                          className="h-6 px-2 text-xs bg-primary"
                        >
                          Aplicar
                        </Button>
                      </div>
                    </div>
                    <pre className="text-xs font-mono bg-background p-2 rounded border border-border overflow-x-auto max-h-40">
                      {message.codeSnippet}
                    </pre>
                  </div>
                )}
                
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  {message.timestamp.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-muted/50 border border-border rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Pensando...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu consulta..."
            className="min-h-[60px] max-h-[120px] resize-none"
            disabled={loading}
          />
          <Button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="h-auto bg-primary"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          Presiona Enter para enviar, Shift+Enter para nueva linea
        </p>
      </div>
    </div>
  );
}
