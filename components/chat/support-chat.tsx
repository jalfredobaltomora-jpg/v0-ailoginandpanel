'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, X, Bot, User, Loader2, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  listenToSupportRequest,
  addMessageToRequest,
  getUsuarioByUsername,
  getEmpleadoByCodigo,
  type SupportRequest,
  type UsuarioIT,
  type Empleado,
} from '@/lib/firebase';

interface SupportChatProps {
  requestId: string;
  username: string;
  onClose: () => void;
}

interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

type AiContext = 'greeting' | 'awaiting_intent' | 'awaiting_confirmation' | 'done';

const aiResponses: { pattern: RegExp; reply: string }[] = [
  { pattern: /(hola|buenas|buen[ao]s|saludos)/i, reply: 'Hola! Soy el asistente virtual de IT. En que puedo ayudarte hoy?' },
  { pattern: /(ayuda|soporte|asistencia|problema)/i, reply: 'Claro, estoy aqui para ayudarte. Puedes consultarme sobre:\n- Problemas de acceso\n- Restablecimiento de credenciales\n- Dudas sobre el sistema\n\nDescribe tu situacion y te orientare.' },
  { pattern: /(gracias|ok|vale|perfecto|excelente)/i, reply: 'De nada! Si necesitas ayuda adicional, no dudes en escribirme. Si el problema persiste, un tecnico de IT se comunicara contigo pronto.' },
  { pattern: /(cedula|cedula|\d{3}-\d{6}-\d{4}[A-Z]?)/i, reply: 'Gracias. Ahora, para confirmar tu identidad, podrias decirme cual es tu area de trabajo y tu cargo actual?' },
  { pattern: /(tecnico|humano|persona|agente|escalar)/i, reply: 'Entiendo. Voy a escalar tu caso a un tecnico de IT humano. Ellos revisaran tu solicitud y te atenderan a la brevedad. Mientras tanto, quedate atento a este chat.' },
  { pattern: /(no puedo|no funciona|error|falla|bug)/i, reply: 'Lamento escuchar eso. Describe el error exacto que ves en pantalla y desde cuando ocurre para poder ayudarte mejor.' },
  { pattern: /(acceso|permiso|bloqueado|restringido)/i, reply: 'Parece que tienes un problema de permisos. Puedo ayudarte con tus credenciales de acceso. Que necesitas exactamente, tu usuario o tu contraseña?' },
  { pattern: /(fecha|cumpleaños|feliz|birthday)/i, reply: 'Si necesitas informacion sobre fechas especiales o cumpleaños, puedes consultarlo en el modulo de RRHH del panel.' },
  { pattern: /(foto|fotografia|imagen|subir)/i, reply: 'Para subir o actualizar tu foto de perfil, ve a RRHH > Catalogo, busca tu registro y haz doble clic. Ahi podras cambiar tu foto.' },
];

function getGenericReply(message: string): string | null {
  const lower = message.toLowerCase().trim();
  for (const { pattern, reply } of aiResponses) {
    if (pattern.test(lower)) return reply;
  }
  return null;
}

export function SupportChat({ requestId, username, onClose }: SupportChatProps) {
  const [request, setRequest] = useState<SupportRequest | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [userData, setUserData] = useState<UsuarioIT | null>(null);
  const [empleadoData, setEmpleadoData] = useState<Empleado | null>(null);
  const [context, setContext] = useState<AiContext>('greeting');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userDataLoaded = useRef(false);

  useEffect(() => {
    const unsubscribe = listenToSupportRequest(requestId, setRequest);
    return unsubscribe;
  }, [requestId]);

  useEffect(() => {
    if (request?.status === 'ai-active' && !userDataLoaded.current) {
      userDataLoaded.current = true;
      getUsuarioByUsername(username).then(async (u) => {
        if (u) {
          setUserData(u);
          const emp = await getEmpleadoByCodigo(u.codigo);
          setEmpleadoData(emp);
        }
      });
    }
  }, [request?.status, username]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [request?.messages, aiMessages]);

  const wantsPassword = useCallback((msg: string): boolean => {
    const lower = msg.toLowerCase();
    return /(pin|clave|contraseña|password|credencial|pass|pwd)/i.test(lower)
      && !/(usuario|username|user|id|identidad)/i.test(lower);
  }, []);

  const wantsUsername = useCallback((msg: string): boolean => {
    const lower = msg.toLowerCase();
    return /(usuario|username|user|id|identidad|mi nombre)/i.test(lower)
      && !/(clave|contraseña|password|pin|pass|pwd)/i.test(lower);
  }, []);

  const wantsBoth = useCallback((msg: string): boolean => {
    const lower = msg.toLowerCase();
    const hasCred = /(pin|clave|contraseña|password|pass|pwd)/i.test(lower);
    const hasUser = /(usuario|username|user|id|identidad)/i.test(lower);
    return hasCred && hasUser;
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const message = inputValue;
    setInputValue('');

    if (request?.status === 'ai-active') {
      const userMsg: AiMessage = { id: Date.now().toString(), role: 'user', content: message };
      setAiMessages(prev => [...prev, userMsg]);
      setAiLoading(true);

      await new Promise(r => setTimeout(r, 600));

      let reply: string;

      if (wantsBoth(message)) {
        reply = 'Por seguridad, solo puedo revelar un dato a la vez. Necesitas tu usuario o tu contraseña?';
        setContext('awaiting_intent');
      } else if (wantsUsername(message)) {
        if (userData) {
          const name = empleadoData ? `${empleadoData.nombres} ${empleadoData.apellidos}` : '';
          reply = `Claro ${name ? name + ', ' : ''}tu usuario es: "${userData.username}"\n\nNecesitas tambien tu contraseña o algo mas?`;
          setContext('done');
        } else {
          reply = 'Estoy verificando tus datos. Un momento por favor...';
          setContext('awaiting_confirmation');
        }
      } else if (wantsPassword(message)) {
        if (userData) {
          const name = empleadoData ? `${empleadoData.nombres} ${empleadoData.apellidos}` : '';
          reply = `Claro ${name ? name + ', ' : ''}tu contraseña (PIN) es: "${userData.pin}"\n\nNecesitas tambien tu usuario o algo mas?`;
          setContext('done');
        } else {
          reply = 'Estoy verificando tus datos. Un momento por favor...';
          setContext('awaiting_confirmation');
        }
      } else if (context === 'awaiting_intent') {
        if (wantsUsername(message)) {
          if (userData) {
            reply = `Tu usuario es: "${userData.username}". Necesitas algo mas?`;
            setContext('done');
          } else {
            reply = 'No pude encontrar tus datos. Un tecnico de IT te ayudara en breve.';
            setContext('done');
          }
        } else if (wantsPassword(message)) {
          if (userData) {
            reply = `Tu contraseña (PIN) es: "${userData.pin}". Necesitas algo mas?`;
            setContext('done');
          } else {
            reply = 'No pude encontrar tus datos. Un tecnico de IT te ayudara en breve.';
            setContext('done');
          }
        } else {
          reply = 'No entendi. Necesitas tu usuario o tu contraseña?';
        }
      } else {
        const generic = getGenericReply(message);
        if (generic) {
          reply = generic;
          if (/usuario|username|acceder|login|ingresar|olvide|olvido|recuperar|perdi|perdida/i.test(message)) {
            setContext('awaiting_intent');
          }
        } else {
          reply = 'En que puedo ayudarte? Puedo decirte tu usuario o restablecer tu contraseña.';
          setContext('awaiting_intent');
        }
      }

      setAiMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: reply }]);
      setAiLoading(false);
    } else {
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
        text: m.content,
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

          {aiLoading && (
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
