'use client';

/**
 * EVA-JARVIS Hybrid Assistant
 * EVA appearance from WALL-E + JARVIS multifunctional capabilities from Iron Man
 * Advanced voice control, system integration, and AI assistance
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { X, Send, Mic, MicOff, Globe, Music, Sparkles, ChevronDown, Bot, EyeOff } from 'lucide-react';
import { getStoredUser } from '@/lib/auth-store';
import type { Lang } from './system-knowledge';
import { detectIntent, getIntentResponse, LANG_LABELS, SYSTEM_INFO } from './system-knowledge';
import { askAI } from '@/lib/ai-client';
import { buscarEmpleados, buscarUsuariosIT, buscarAgendaNotes, updateEmpleado, updateUsuarioIT, updateAgendaNote } from '@/lib/firebase';
import { useLang } from '@/lib/lang-context';
import { EVARobotComponent, type EVAExpression } from './eva-design';
import { executeJARVISCommand } from '@/lib/jarvis-commands';
import { getDeviceInfo, isCapabilityAvailable } from '@/lib/device-api';

declare global {
  interface Window {
    __jabMicAttempted?: boolean;
    Capacitor?: any;
    electronAPI?: any;
  }
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface Message { role: 'user' | 'assistant'; content: string; }

const LS_MESSAGES = 'jab-eva-messages';
const MOVE_INTERVAL = 5000;
const SPEED = 0.018;

// ─── Proactive Messages (EVA personality) ───
const PROACTIVE_MESSAGES_ES = [
  '🤖 Escaneando sistema... Detecté múltiples opciones disponibles. ¿Necesitas ayuda?',
  '⚡ Mi nivel de energía es óptimo. Estoy lista para cualquier tarea.',
  '🎯 He analizado el entorno. Puedo ayudarte con navegación, búsqueda o ejecución de comandos.',
  '🎵 Detecto que podrías disfrutar música. ¿Quieres que reproduzca algo?',
  '📊 Estado del sistema normal. Todas las capacidades operativas.',
  '🔍 Iniciando escaneo completo... Los datos fluyen a través de mis circuitos.',
  '💫 Mi IA está calibrada y lista. Dime qué necesitas resolver.',
  '🌍 Conectada a la red. Puedo acceder a información global o local.',
];

const PROACTIVE_MESSAGES_EN = [
  '🤖 System scan complete. Multiple options available. Need assistance?',
  '⚡ Energy level optimal. Ready for any task.',
  '🎯 Environment analyzed. I can help with navigation, search, or command execution.',
  '🎵 I detect you might enjoy music. Want me to play something?',
  '📊 System status nominal. All capabilities operational.',
  '🔍 Initiating full scan... Data flows through my circuits.',
  '💫 My AI is calibrated and ready. Tell me what you need solved.',
  '🌍 Connected to the network. I can access global or local information.',
];

export function FloatingAIEVAJARVIS() {
  const router = useRouter();
  const pathname = usePathname();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesReady, setMessagesReady] = useState(false);
  const [inputText, setInputText] = useState('');
  const { lang, toggleLang: globalToggleLang } = useLang();
  const [expression, setExpression] = useState<EVAExpression>('idle');
  const [isListening, setIsListening] = useState(false);
  const [isWakeListening, setIsWakeListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [noMicrophone, setNoMicrophone] = useState(false);
  const [musicOpen, setMusicOpen] = useState(false);
  const [musicQuery, setMusicQuery] = useState('');
  const [musicUrl, setMusicUrl] = useState('');
  const [userName, setUserName] = useState('User');
  const [pos, setPos] = useState({ x: 85, y: 85 });
  const [isMobile, setIsMobile] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);

  // ─── Setup ───
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768 || ('ontouchstart' in window));
    check();
    window.addEventListener('resize', check);

    // Load device info
    getDeviceInfo().then(setDeviceInfo);

    return () => window.removeEventListener('resize', check);
  }, []);

  // Load user
  useEffect(() => {
    try {
      const user = getStoredUser();
      if (user) {
        import('@/lib/firebase').then(({ getEmpleadoByCodigo }) => {
          getEmpleadoByCodigo(user.codigo).then((emp: any) => {
            if (emp) {
              const names = emp.nombres.split(' ');
              setUserName(names[0]);
            }
          });
        });
      }
    } catch {}
  }, []);

  // Load persisted messages
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_MESSAGES);
      if (saved) setMessages(JSON.parse(saved));
    } catch {}
    setMessagesReady(true);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_MESSAGES, JSON.stringify(messages));
    } catch {}
  }, [messages]);

  const speak = useCallback(
    (text: string, cb?: () => void) => {
      if (!window.speechSynthesis) {
        cb?.();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text.replace(/\bJAB\b/gi, 'Eva'));
      utterance.lang = lang === 'es' ? 'es-CO' : 'en-US';
      utterance.rate = 1.05;
      utterance.pitch = 0.95;

      utterance.onstart = () => {
        setIsSpeaking(true);
        setExpression('processing');
      };
      utterance.onend = () => {
        setIsSpeaking(false);
        setExpression('happy');
        cb?.();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        setExpression('idle');
      };

      window.speechSynthesis.speak(utterance);
    },
    [lang]
  );

  const addMessage = useCallback((msg: Message) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const processUserMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      addMessage({ role: 'user', content: trimmed });
      setExpression('scanning');
      setInputText('');

      // Check for JARVIS commands first
      const jarvisResult = await executeJARVISCommand(trimmed);
      if (jarvisResult) {
        addMessage({ role: 'assistant', content: jarvisResult });
        setExpression('happy');
        speak(jarvisResult);
        return;
      }

      // Fall back to regular AI
      try {
        const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));
        const aiResponse = await askAI(trimmed, lang, userName, undefined, history);

        if (aiResponse?.content) {
          addMessage({ role: 'assistant', content: aiResponse.content });
          setExpression('happy');
          speak(aiResponse.content);
        }
      } catch (error) {
        console.error('AI error:', error);
        const errMsg = lang === 'es' ? 'Disculpa, ocurrió un error.' : 'Sorry, an error occurred.';
        addMessage({ role: 'assistant', content: errMsg });
        speak(errMsg);
        setExpression('concerned');
      }
    },
    [messages, lang, userName, addMessage, speak]
  );

  const toggleListening = useCallback(() => {
    const SR = window.SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SR) {
      if (isListening) {
        setIsListening(false);
        return;
      }

      setIsListening(true);
      setExpression('scanning');

      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/wav'];
          const mt = types.find((t) => MediaRecorder.isTypeSupported(t)) || '';
          const mr = new MediaRecorder(stream, mt ? { mimeType: mt } : {});
          const chunks: BlobPart[] = [];

          mr.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
          };

          mr.onstop = async () => {
            setIsListening(false);
            stream.getTracks().forEach((t) => t.stop());
            const blob = new Blob(chunks, { type: mt || 'audio/webm' });
            if (blob.size < 400) return;

            try {
              const fd = new FormData();
              fd.append('audio', blob, 'audio.webm');
              const res = await fetch('/api/ai/transcribe', { method: 'POST', body: fd });
              const data = await res.json();
              if (data?.text) {
                setInputText(data.text);
                processUserMessage(data.text);
              }
            } catch (err) {
              console.error('Transcription error:', err);
            }
          };

          mr.start();
          setTimeout(() => {
            if (mr.state === 'recording') mr.stop();
          }, 8000);
        })
        .catch(() => {
          setIsListening(false);
          setExpression('concerned');
          const msg =
            lang === 'es'
              ? 'Permiso de micrófono denegado.'
              : 'Microphone permission denied.';
          addMessage({ role: 'assistant', content: msg });
        });

      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SR();
    recognition.lang = lang === 'es' ? 'es-CO' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setExpression('scanning');
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      setIsListening(false);
      processUserMessage(transcript);
    };

    recognition.onerror = (ev: any) => {
      setIsListening(false);
      setExpression('concerned');
      const msg =
        ev.error === 'not-allowed'
          ? lang === 'es'
            ? 'Permiso de micrófono denegado.'
            : 'Microphone permission denied.'
          : lang === 'es'
          ? 'Error en el micrófono. Intenta de nuevo.'
          : 'Microphone error. Try again.';
      addMessage({ role: 'assistant', content: msg });
    };

    recognition.start();
  }, [isListening, lang, addMessage, processUserMessage]);

  const toggleLang = useCallback(() => {
    globalToggleLang();
  }, [globalToggleLang]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (pathname === '/') return null;

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const posX = (pos.x / 100) * vw;
  const posY = (pos.y / 100) * vh;

  return (
    <>
      {isVisible && (
        <>
          {/* EVA Robot */}
          <div
            className="fixed z-[60] cursor-pointer group"
            style={{ left: posX - 50, top: posY - 80 }}
            onClick={() => {
              if (isMobile) {
                setIsChatOpen((prev) => !prev);
              } else {
                setShowQuickActions((prev) => !prev);
              }
            }}
          >
            <EVARobotComponent
              expression={expression}
              isSpeaking={isSpeaking}
              isListening={isListening}
              scale={1}
              interactive
            />
            {!isChatOpen && (
              <span
                className={`absolute top-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#0d1117] ${
                  isWakeListening ? 'bg-green-400' : 'bg-green-500'
                }`}
              />
            )}
          </div>

          {/* Quick Actions */}
          {!isChatOpen && !isMobile && showQuickActions && (
            <div
              className="fixed z-[60] flex flex-col gap-1.5"
              style={{ left: posX - 60, top: posY }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsChatOpen(true);
                  setShowQuickActions(false);
                }}
                className="w-8 h-8 rounded-full bg-[#1c2128] border border-[#30363d] flex items-center justify-center hover:bg-[#21262d] text-cyan-400 transition"
              >
                <Bot className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMusicOpen((prev) => !prev);
                  setShowQuickActions(false);
                }}
                className="w-8 h-8 rounded-full bg-[#1c2128] border border-[#30363d] flex items-center justify-center hover:bg-[#21262d] text-cyan-400 transition"
              >
                <Music className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLang();
                  setShowQuickActions(false);
                }}
                className="w-8 h-8 rounded-full bg-[#1c2128] border border-[#30363d] flex items-center justify-center hover:bg-[#21262d] text-cyan-400 transition text-xs font-bold"
              >
                {lang === 'es' ? 'EN' : 'ES'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsVisible(false);
                  setShowQuickActions(false);
                }}
                className="w-8 h-8 rounded-full bg-[#1c2128] border border-[#30363d] flex items-center justify-center hover:bg-[#21262d] text-cyan-400 transition"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Chat Panel */}
          {isChatOpen && (
            <div
              className="fixed z-[60] w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl shadow-2xl"
              style={{ left: Math.min(posX + 50, vw - 400), top: Math.max(posY - 400, 10) }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d] bg-[#0d1117]/80">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
                    <span className="text-sm font-semibold text-white">EVA-JARVIS</span>
                    <span className={`text-[10px] ${isWakeListening ? 'text-green-400' : 'text-green-500'}`}>
                      ● {isWakeListening ? (lang === 'es' ? 'escuchando' : 'listening') : 'online'}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsChatOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-[#21262d] text-gray-400 hover:text-cyan-400"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Messages */}
                <div className="h-[300px] overflow-y-auto p-4 space-y-3 scrollbar-thin">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[88%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                          msg.role === 'user'
                            ? 'bg-cyan-600/30 text-white border border-cyan-500/30'
                            : 'bg-[#21262d] text-gray-100'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-3 border-t border-[#30363d]">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleListening}
                      className={`p-2 rounded-xl transition-all ${
                        isListening
                          ? 'bg-red-500/30 text-red-400 animate-pulse'
                          : 'bg-[#21262d] text-gray-400 hover:text-cyan-400'
                      }`}
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                    {noMicrophone ? (
                      <>
                        <input
                          type="text"
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') processUserMessage(inputText);
                          }}
                          className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500"
                          placeholder="Type here..."
                        />
                        <button
                          onClick={() => processUserMessage(inputText)}
                          disabled={!inputText.trim()}
                          className="p-2 rounded-xl bg-cyan-600/30 text-cyan-400 hover:bg-cyan-600/50 disabled:opacity-50"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <span className="flex-1 text-[10px] text-gray-500 text-center">
                        {isListening
                          ? lang === 'es'
                            ? 'Escuchando...'
                            : 'Listening...'
                          : lang === 'es'
                          ? 'Presiona micrófono para hablar'
                          : 'Press mic to speak'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-gray-500">
                      {new Date().toLocaleTimeString(lang === 'es' ? 'es-MX' : 'en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {isSpeaking && (
                      <span className="text-[10px] text-cyan-400 animate-pulse">
                        {lang === 'es' ? 'Hablando...' : 'Speaking...'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Music Panel */}
          {musicOpen && (
            <div
              className="fixed z-[61] w-[340px] max-w-[calc(100vw-3rem)] rounded-2xl shadow-2xl"
              style={{ left: Math.min(posX + 50, vw - 360), top: Math.max(posY - 250, 10) }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d]">
                  <span className="text-sm font-semibold text-white flex items-center gap-2">
                    <Music className="w-4 h-4 text-cyan-400" />
                    {lang === 'es' ? 'Música' : 'Music'}
                  </span>
                  <button
                    onClick={() => setMusicOpen(false)}
                    className="p-1 rounded-lg hover:bg-[#21262d] text-gray-400 hover:text-cyan-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="p-3">
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={musicQuery}
                      onChange={(e) => setMusicQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const q = musicQuery.trim();
                          if (q) window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, '_blank');
                        }
                      }}
                      className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500"
                      placeholder={lang === 'es' ? 'Canción o artista...' : 'Song or artist...'}
                    />
                    <button
                      onClick={() => {
                        const q = musicQuery.trim();
                        if (q) window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, '_blank');
                      }}
                      className="px-3 py-2 rounded-xl bg-cyan-600/30 text-cyan-400 hover:bg-cyan-600/50 text-xs"
                    >
                      {lang === 'es' ? 'Reproducir' : 'Play'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Hidden Button */}
      {!isVisible && (
        <button
          onClick={() => setIsVisible(true)}
          className="fixed bottom-6 left-6 z-[60] w-11 h-11 rounded-full bg-cyan-600/30 border border-cyan-500/50 flex items-center justify-center text-cyan-400 hover:bg-cyan-600/50 transition"
        >
          <Sparkles className="w-5 h-5" />
        </button>
      )}
    </>
  );
}
