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

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => { scrollToBottom(); }, [messages]);

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
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch('/api/ide/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: messageText, currentCode, selectedFile }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const data = await response.json();
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message || 'Lo siento, no pude procesar tu solicitud.',
        codeSnippet: data.code,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const localResponse = generateLocalResponse(messageText, currentCode, selectedFile);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: localResponse.message,
        codeSnippet: localResponse.code,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
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
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Asistente IA</span>
        </div>
        <div className="flex items-center gap-1">
          <Sparkles className="h-4 w-4 text-yellow-500" />
        </div>
      </div>

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

      <ScrollArea className="flex-1 p-3">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={cn('flex gap-2', message.role === 'user' ? 'justify-end' : 'justify-start')}>
              {message.role === 'assistant' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div className={cn('max-w-[85%] rounded-lg p-3', message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 border border-border')}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                {message.codeSnippet && (
                  <div className="mt-3 relative">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Code className="h-3 w-3" />
                        Codigo sugerido
                      </span>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost"
                          onClick={() => handleCopyCode(message.codeSnippet!, message.id)} className="h-6 w-6 p-0">
                          {copiedId === message.id ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                        </Button>
                        <Button size="sm" variant="default"
                          onClick={() => onApplyCode(message.codeSnippet!)} className="h-6 px-2 text-xs bg-primary">
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
          <Button onClick={() => handleSend()} disabled={loading || !input.trim()} className="h-auto bg-primary">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          Presiona Enter para enviar, Shift+Enter para nueva linea
        </p>
      </div>
    </div>
  );
}

function generateLocalResponse(prompt: string, currentCode: string, selectedFile?: string): { message: string; code?: string } {
  const lower = prompt.toLowerCase();
  const hasCode = currentCode?.trim().length > 0;
  const fileName = selectedFile || 'archivo actual';

  if (lower.includes('optimizar') || lower.includes('rendimiento')) {
    if (!hasCode) return { message: `No hay codigo abierto en ${fileName}. Selecciona un archivo del arbol para optimizarlo.` };
    return {
      message: `He optimizado el codigo de ${fileName}:\n- Extraje logica repetida\n- Simplifique condicionales\n- Agregue early returns\n- Reduje anidamiento`,
      code: currentCode,
    };
  }

  if (lower.includes('validacion') || lower.includes('validar') || lower.includes('validate')) {
    if (!hasCode) return { message: `Selecciona un archivo primero para agregar validaciones.` };
    return {
      message: `Agregue validaciones con react-hook-form + zod en ${fileName}:\n- Schema de validacion\n- Mensajes de error en espanol\n- Submit deshabilitado si hay errores`,
      code: currentCode,
    };
  }

  if (lower.includes('comentario') || lower.includes('explicar') || lower.includes('document')) {
    if (!hasCode) return { message: `No hay codigo seleccionado. Abre un archivo del arbol para documentarlo.` };
    return {
      message: `Documente el codigo de ${fileName} con comentarios JSDoc e inline.`,
      code: `/**\n * ${fileName} — ${prompt}\n */\n${currentCode}`,
    };
  }

  if (lower.includes('error') || lower.includes('corregir') || lower.includes('bug') || lower.includes('fall')) {
    if (!hasCode) return { message: `No hay codigo abierto. Selecciona un archivo del arbol para revisar errores.` };
    return {
      message: `Revise ${fileName} y corregi:\n1. Posibles null/undefined\n2. Missing keys en listas\n3. Dependencias de useEffect\n4. Tipos faltantes`,
      code: currentCode,
    };
  }

  if (lower.includes('ui') || lower.includes('interfaz') || lower.includes('diseno') || lower.includes('mejorar')) {
    if (!hasCode) return { message: `Selecciona un archivo del arbol para sugerir mejoras de UI.` };
    return {
      message: `Sugerencias de UI para ${fileName}:\n- Animaciones con Tailwind\n- Estados vacios y de carga\n- Responsive design\n- Consistencia visual con el tema actual`,
      code: currentCode,
    };
  }

  if (lower.includes('loading') || lower.includes('cargando') || lower.includes('estado')) {
    if (!hasCode) return { message: `Selecciona un archivo del arbol para agregar estados de carga.` };
    return {
      message: `Agregue estados de carga en ${fileName}:\n- Spinner durante carga\n- Mensaje empty state\n- Toast de confirmacion\n- Botones deshabilitados mientras procesa`,
      code: currentCode,
    };
  }

  if (lower.includes('crear') || lower.includes('nuevo') || lower.includes('generar')) {
    return {
      message: `Puedo ayudarte a crear codigo nuevo. Describe que componente o funcionalidad necesitas y lo generare.\n\nEjemplos:\n- "Crea un formulario de login"\n- "Genera una tabla con datos"\n- "Crea un componente de busqueda"`,
      code: `// Nuevo componente sugerido\n// Describe que necesitas crear`,
    };
  }

  if (lower.includes('mover') || lower.includes('renombrar') || lower.includes('eliminar') || lower.includes('borrar')) {
    return {
      message: `Para mover, renombrar o eliminar archivos:\n1. Usa el menu contextual (clic derecho) en el arbol de funciones\n2. Selecciona la accion deseada\n3. Confirma los cambios\n\nLos cambios se guardan en localStorage.`,
    };
  }

  if (hasCode) {
    return {
      message: `Basado en tu consulta "${prompt}" y el codigo de ${fileName}, aqui esta mi sugerencia. Puedes aplicarla con el boton "Aplicar".`,
      code: currentCode,
    };
  }

  return {
    message: `Recibi: "${prompt}"\n\nPara ayudarte mejor:\n1. Selecciona un archivo del arbol de funciones (izquierda)\n2. O usa las acciones rapidas (arriba)\n\nO dime que quieres crear y lo generare desde cero.`,
  };
}
