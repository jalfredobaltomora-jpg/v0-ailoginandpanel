'use client';

/**
 * JAB - Premium AI Assistant with EVA Design
 * Enhanced UI/UX with premium animations, professional styling, and optimized visuals
 * Single unified AI with EVA appearance and JARVIS capabilities
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  X, Send, Mic, MicOff, Music, Sparkles, ChevronDown, Bot, EyeOff, 
  Settings, HelpCircle, MessageSquare, Zap, Volume2, VolumeX 
} from 'lucide-react';
import { getStoredUser } from '@/lib/auth-store';
import { useLang } from '@/lib/lang-context';
import { EVARobotComponent, type EVAExpression } from './eva-design';
import { executeJARVISCommand } from '@/lib/jarvis-commands';
import { askAI } from '@/lib/ai-client';
import { transcribeAudio } from '@/lib/transcribe-client';
import { useWakeWord } from '@/lib/use-wake-word';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface Message { role: 'user' | 'assistant'; content: string; timestamp: number; }

const LS_MESSAGES = 'jab-messages';
const LS_SETTINGS = 'jab-settings';

// Auto-responses
const AUTO_RESPONSES: { pattern: RegExp; es: string; en: string }[] = [
  { pattern: /(gracias|thanks|thank you)/i, es: 'De nada! 🫶', en: 'You\'re welcome! 🫶' },
  { pattern: /(bien\b|fine|good|doing well)/i, es: 'Excelente! ¿Necesitas algo?', en: 'Great! Need anything?' },
  { pattern: /(quien eres|what are you|who are you)/i, es: 'Soy JAB, tu asistente inteligente 🤖 con tecnología EVA. ¡Siempre listo para ayudarte!', en: 'I\'m JAB, your intelligent assistant 🤖 with EVA technology. Always ready to help!' },
];

export function FloatingAI() {
  const router = useRouter();
  const pathname = usePathname();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const { lang, toggleLang } = useLang();
  const [expression, setExpression] = useState<EVAExpression>('idle');
  const [isListening, setIsListening] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userName, setUserName] = useState('User');
  const [isMobile, setIsMobile] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceActivated, setVoiceActivated] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const processingRef = useRef(false);

  // ─── Setup ───
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Load user
  useEffect(() => {
    try {
      const user = getStoredUser();
      if (user) {
        import('@/lib/firebase').then(({ getEmpleadoByCodigo }) => {
          getEmpleadoByCodigo(user.codigo).then((emp: any) => {
            setUserName(emp?.nombres?.split(' ')[0] || 'User');
          });
        });
      }
    } catch {}
  }, []);

  // Load messages & settings
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_MESSAGES);
      if (saved) setMessages(JSON.parse(saved));
      const settings = localStorage.getItem(LS_SETTINGS);
      if (settings) {
        const s = JSON.parse(settings);
        if (s.sound !== undefined) setSoundEnabled(s.sound);
        if (s.voice !== undefined) setVoiceActivated(s.voice);
      }
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(LS_MESSAGES, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(LS_SETTINGS, JSON.stringify({ sound: soundEnabled, voice: voiceActivated }));
  }, [soundEnabled, voiceActivated]);

  // Auto-expression animation (idle life)
  const exprTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const states: EVAExpression[] = ['idle', 'idle', 'curious', 'idle', 'thinking', 'idle', 'surprised'];
    let i = 0;
    const tick = () => {
      setExpression((prev) => {
        if (prev === 'idle' || prev === 'curious' || prev === 'thinking' || prev === 'surprised') {
          return states[(i++) % states.length];
        }
        return prev;
      });
      exprTimeoutRef.current = setTimeout(tick, 4500 + Math.random() * 3000);
    };
    exprTimeoutRef.current = setTimeout(tick, 3000);
    return () => { if (exprTimeoutRef.current) clearTimeout(exprTimeoutRef.current); };
  }, []);

  // Wake word detection — always on when voiceActivated is true
  const wakeSkipRef = useRef(false);
  useWakeWord({
    enabled: voiceActivated,
    onWake: (text) => {
      if (processingRef.current) { console.log('JAB wake: skip, processing'); return; }
      if (wakeSkipRef.current) return;
      if (inputText.trim()) { console.log('JAB wake: skip, user is typing'); return; }
      wakeSkipRef.current = true;
      setTimeout(() => { wakeSkipRef.current = false; }, 4000);
      if (!isChatOpen) {
        setIsChatOpen(true);
        setIsVisible(true);
      }
      setExpression('happy');
      processMessage(text.replace(/\bjabe?\b/i, '').trim());
    },
    onListeningChange: setIsListening,
  });

  // Unlock speechSynthesis on first user gesture (required by Chrome mobile)
  const unlockedRef = useRef(false);
  const unlockSpeech = useCallback(() => {
    if (unlockedRef.current) return;
    if (!window.speechSynthesis) return;
    unlockedRef.current = true;
    try {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      window.speechSynthesis.speak(u);
    } catch {}
  }, []);

  const speak = useCallback(
    (text: string, cb?: () => void) => {
      if (!soundEnabled || !window.speechSynthesis) {
        cb?.();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text.replace(/\bJAB\b/gi, 'Jab'));
      utterance.lang = lang === 'es' ? 'es-CO' : 'en-US';
      utterance.rate = 1.1;
      utterance.pitch = 0.9;

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
        setExpression('concerned');
      };

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    },
    [lang, soundEnabled]
  );

  // Greeting & auto-show on app start
  const greetedRef = useRef(false);
  const firstRunRef = useRef(false);
  useEffect(() => {
    // Check first run
    try {
      const val = localStorage.getItem('jab_first_run');
      if (!val) {
        firstRunRef.current = true;
        localStorage.setItem('jab_first_run', 'done');
      }
    } catch {}
  }, []);

  useEffect(() => {
    // Auto-show chat after app loads
    const timer = setTimeout(() => {
      setIsVisible(true);
      unlockSpeech();
    }, 1500);
    const openTimer = setTimeout(() => {
      setIsChatOpen(true);
    }, 2500);
    return () => { clearTimeout(timer); clearTimeout(openTimer); };
  }, []);

  useEffect(() => {
    if (!isChatOpen) return;
    if (greetedRef.current) return;
    greetedRef.current = true;
    const hours = new Date().getHours();
    const timeGreeting = hours >= 6 && hours < 12 ? (lang === 'es' ? 'Buenos días' : 'Good morning')
      : hours >= 12 && hours < 18 ? (lang === 'es' ? 'Buenas tardes' : 'Good afternoon')
      : (lang === 'es' ? 'Buenas noches' : 'Good evening');

    if (firstRunRef.current) {
      const intro = lang === 'es'
        ? `${timeGreeting} ${userName}! 👋\n\nSoy JAB, tu Asistente Técnico y Analítico del Sistema de Control Administrativo, inspirado en JARVIS de Iron Man.\n\nPuedo ayudarte con:\n• Análisis de datos y reportes\n• Navegación por el sistema\n• Búsqueda en Google\n• Diagnóstico de equipos\n• Y mucho más...\n\nSolo di "jab" y lo que necesitas para activarme por voz, o escríbeme directamente.`
        : `${timeGreeting} ${userName}! 👋\n\nI'm JAB, your Technical Assistance and Analytical System of the Administrative Control System, inspired by JARVIS from Iron Man.\n\nI can help you with:\n• Data analysis and reports\n• System navigation\n• Google search\n• Equipment diagnostics\n• And much more...\n\nJust say "jab" followed by what you need to activate me by voice, or type directly.`;
      setMessages([{ role: 'assistant', content: intro, timestamp: Date.now() }]);
      setTimeout(() => speak(intro), 500);
    } else {
      const intro = lang === 'es'
        ? `${timeGreeting} ${userName}! 👋\n\nSoy JAB, tu asistente inteligente 🤖`
        : `${timeGreeting} ${userName}! 👋\n\nI'm JAB, your intelligent assistant 🤖`;
      setMessages([{ role: 'assistant', content: intro, timestamp: Date.now() }]);
      setTimeout(() => speak(intro), 300);
    }
  }, [isChatOpen, lang, userName, speak]);

  const addMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    setMessages((prev) => [...prev, { role, content, timestamp: Date.now() }]);
  }, []);

  const processMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || processingRef.current) { console.log('JAB: processMessage skipped', { trimmed, processing: processingRef.current }); return; }
      console.log('JAB: processMessage start', trimmed);
      processingRef.current = true;

      addMessage('user', trimmed);
      setInputText('');
      setIsLoading(true);
      setExpression('scanning');

      // Voice activation toggle commands
      const cmd = trimmed.toLowerCase().replace(/\bjabe?\b/gi, '').trim();
      if (/disconnect|dejar de escuchar|desconectar|stop listening/i.test(cmd)) {
        setVoiceActivated(false);
        const msg = lang === 'es' ? 'Entendido. Dejo de escuchar. Di "jab reconnect" o activa la voz en ajustes para volver a activarme.' : 'Understood. I\'ll stop listening. Say "jab reconnect" or enable voice in settings to reactivate me.';
        addMessage('assistant', msg);
        setExpression('idle');
        speak(msg);
        setIsLoading(false);
        processingRef.current = false;
        return;
      }
      if (/reconnect|volver a escuchar|reconectar|listen again/i.test(cmd)) {
        setVoiceActivated(true);
        const msg = lang === 'es' ? 'Listo. Vuelvo a escuchar. Di "jab" para activarme.' : 'Ready. I\'m listening again. Say "jab" to wake me.';
        addMessage('assistant', msg);
        setExpression('happy');
        speak(msg);
        setIsLoading(false);
        processingRef.current = false;
        return;
      }

      // Auto-response
      const autoResp = AUTO_RESPONSES.find(r => r.pattern.test(trimmed));
      if (autoResp) {
        console.log('JAB: auto-response matched');
        const response = lang === 'es' ? autoResp.es : autoResp.en;
        addMessage('assistant', response);
        setExpression('happy');
        speak(response);
        setIsLoading(false);
        processingRef.current = false;
        return;
      }

      // JARVIS commands
      try {
        const jarvisResult = await executeJARVISCommand(trimmed);
        if (jarvisResult) {
          console.log('JAB: JARVIS command executed');
          addMessage('assistant', jarvisResult);
          setExpression('happy');
          speak(jarvisResult);
          setIsLoading(false);
          processingRef.current = false;
          return;
        }
      } catch (e) { console.warn('JAB: JARVIS command error', e); }

      // AI API
      console.log('JAB: calling askAI');
      try {
        const history = messages.slice(-4).map(m => ({ role: m.role, content: m.content }));
        const aiPromise = askAI(trimmed, lang, userName, undefined, history);
        const timeoutPromise = new Promise<null>((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 20000));
        const aiResponse = await Promise.race([aiPromise, timeoutPromise]);
        console.log('JAB: askAI response', aiResponse?.content?.slice(0, 80));
        if (aiResponse?.content) {
          addMessage('assistant', aiResponse.content);
          setExpression('happy');
          speak(aiResponse.content);
        } else {
          const fallback = lang === 'es'
            ? 'No entendí bien. Di "Ayuda" para ver todo lo que puedo hacer.'
            : 'I didn\'t understand. Say "Help" to see everything I can do.';
          console.log('JAB: fallback response');
          addMessage('assistant', fallback);
          setExpression('concerned');
          speak(fallback);
        }
      } catch (error) {
        console.error('JAB: askAI error', error);
        const errMsg = lang === 'es' ? 'Disculpa, ocurrió un error.' : 'Sorry, an error occurred.';
        addMessage('assistant', errMsg);
        setExpression('concerned');
        speak(errMsg);
      } finally {
        setIsLoading(false);
        processingRef.current = false;
      }
    },
    [messages, lang, userName, addMessage, speak, setVoiceActivated]
  );

  const toggleListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SR) {
      if (!isMicActive) {
        setIsMicActive(true);
        setExpression('scanning');
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
          const mr = new MediaRecorder(stream);
          const chunks: BlobPart[] = [];

          mr.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
          mr.onstop = async () => {
            setIsMicActive(false);
            stream.getTracks().forEach(t => t.stop());
            const blob = new Blob(chunks);
            if (blob.size < 400) return;

            const text = await transcribeAudio(blob);
            if (text) {
              setInputText(text);
              processMessage(text);
            }
          };

          mr.start();
          setTimeout(() => mr.state === 'recording' && mr.stop(), 8000);
        }).catch(() => {
          setIsMicActive(false);
          setExpression('concerned');
        });
      } else {
        setIsMicActive(false);
      }
      return;
    }

    if (isMicActive) {
      setIsMicActive(false);
      return;
    }

    const recognition = new SR();
    recognition.lang = lang === 'es' ? 'es-CO' : 'en-US';
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsMicActive(true);
      setExpression('scanning');
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      setIsMicActive(false);
      processMessage(transcript);
    };

    recognition.onerror = () => {
      setIsMicActive(false);
      setExpression('concerned');
    };

    recognition.start();
  }, [isMicActive, lang, processMessage]);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (!userScrolledUpRef.current || isNearBottom) {
      el.scrollTop = el.scrollHeight;
      userScrolledUpRef.current = false;
    }
  }, [messages]);
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const handleScroll = () => {
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      userScrolledUpRef.current = !isNearBottom;
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  if (pathname === '/') return null;

  return (
    <>
      {isVisible && (
        <>
          {/* JAB Robot - Floating Button */}
          <div
            className="fixed z-[60] cursor-pointer group"
            style={{
              right: isMobile ? '1rem' : '2rem',
              bottom: isMobile ? '1rem' : '2rem',
              filter: 'drop-shadow(0 8px 16px rgba(6, 182, 212, 0.3))',
            }}
            onClick={() => { unlockSpeech(); setIsChatOpen(!isChatOpen); }}
          >
            <div className="relative">
              <EVARobotComponent
                expression={expression}
                isSpeaking={isSpeaking}
                isListening={isListening}
                scale={isMobile ? 0.9 : 1}
                interactive
              />
              {voiceActivated && (
                <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0d1117] animate-pulse ${
                  isListening ? 'bg-green-400' : isSpeaking ? 'bg-orange-400' : 'bg-cyan-400'
                }`} title={isListening ? 'Escuchando...' : 'Activación por voz activa'} />
              )}
              {!voiceActivated && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0d1117] bg-gray-500"
                     title="Activación por voz desactivada" />
              )}
            </div>
          </div>

          {/* Chat Panel - Premium Design */}
          {isChatOpen && (
            <div
              className="fixed z-[70] bottom-32 right-4 md:right-6 w-[calc(100vw-2rem)] md:w-96 max-h-[70vh] rounded-3xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-b from-[#0d1117] to-[#161b22] border border-cyan-500/20 rounded-3xl flex flex-col h-full">
                {/* Header */}
                <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-b border-cyan-500/20 px-6 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
                      <div>
                        <p className="text-sm font-bold text-white">JAB AI Assistant</p>
                        <p className="text-xs text-cyan-300">{lang === 'es' ? 'En línea' : 'Online'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsChatOpen(false)}
                      className="p-2 hover:bg-[#21262d] rounded-lg text-gray-400 hover:text-cyan-400 transition"
                    >
                      <ChevronDown className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div ref={messagesContainerRef} className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                      <Sparkles className="w-12 h-12 text-cyan-400 opacity-50" />
                      <p className="text-sm text-gray-400">{lang === 'es' ? 'Inicia una conversación' : 'Start a conversation'}</p>
                    </div>
                  ) : (
                    messages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                            msg.role === 'user'
                              ? 'bg-gradient-to-r from-cyan-600/40 to-blue-600/40 text-white border border-cyan-500/50 shadow-lg'
                              : 'bg-gradient-to-r from-[#21262d] to-[#161b22] text-gray-100 border border-cyan-500/10'
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))
                  )}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-[#21262d] rounded-2xl px-4 py-3 border border-cyan-500/10">
                        <div className="flex gap-2">
                          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Section */}
                <div className="border-t border-cyan-500/10 bg-gradient-to-t from-[#161b22] to-[#0d1117] p-4 space-y-3">
                  {/* Controls */}
                  <div className="flex gap-2">
                    <button
                      onClick={toggleListening}
                      disabled={isLoading}
                      className={`flex-1 p-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 font-medium text-sm ${
                        isMicActive
                          ? 'bg-red-500/20 border border-red-500/50 text-red-400 animate-pulse'
                          : 'bg-cyan-600/20 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-600/30'
                      }`}
                    >
                      {isMicActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      <span className="hidden sm:inline">{lang === 'es' ? 'Escuchar' : 'Listen'}</span>
                    </button>
                    <button
                      onClick={() => setShowHelp(!showHelp)}
                      className="p-3 rounded-xl bg-blue-600/20 border border-blue-500/50 text-blue-400 hover:bg-blue-600/30 transition"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowSettings(!showSettings)}
                      className="p-3 rounded-xl bg-purple-600/20 border border-purple-500/50 text-purple-400 hover:bg-purple-600/30 transition"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !isLoading && processMessage(inputText)}
                      disabled={isLoading}
                      className="flex-1 bg-[#0d1117] border border-cyan-500/30 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20 transition disabled:opacity-50"
                      placeholder={lang === 'es' ? 'Escribe o habla...' : 'Type or speak...'}
                    />
                    <button
                      onClick={() => processMessage(inputText)}
                      disabled={!inputText.trim() || isLoading}
                      className="p-3 rounded-xl bg-gradient-to-r from-cyan-600/40 to-blue-600/40 border border-cyan-500/50 text-cyan-400 hover:from-cyan-600/60 hover:to-blue-600/60 disabled:opacity-50 transition"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Settings Panel */}
                  {showSettings && (
                    <div className="bg-[#21262d] border border-cyan-500/20 rounded-xl p-4 space-y-3 animate-in fade-in">
                      <button
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className="w-full flex items-center justify-between p-3 hover:bg-[#161b22] rounded-lg transition"
                      >
                        <span className="text-sm text-gray-300">{lang === 'es' ? 'Sonido' : 'Sound'}</span>
                        {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-gray-500" />}
                      </button>
                      <button
                        onClick={() => setVoiceActivated(!voiceActivated)}
                        className="w-full flex items-center justify-between p-3 hover:bg-[#161b22] rounded-lg transition"
                      >
                        <span className="text-sm text-gray-300">{lang === 'es' ? 'Activación por voz' : 'Voice Activation'}</span>
                        {voiceActivated
                          ? <Mic className="w-4 h-4 text-green-400" />
                          : <MicOff className="w-4 h-4 text-gray-500" />}
                      </button>
                      <button
                        onClick={() => toggleLang()}
                        className="w-full flex items-center justify-between p-3 hover:bg-[#161b22] rounded-lg transition text-sm text-gray-300"
                      >
                        {lang === 'es' ? 'Español' : 'English'}
                        <span className="text-xs font-bold text-cyan-400 bg-cyan-500/20 px-2 py-1 rounded">
                          {lang === 'es' ? 'ES' : 'EN'}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Help Panel */}
                  {showHelp && (
                    <div className="bg-[#21262d] border border-blue-500/20 rounded-xl p-4 space-y-2 text-xs text-gray-300 animate-in fade-in max-h-48 overflow-y-auto">
                      <p className="font-bold text-blue-400">💡 {lang === 'es' ? 'Comandos Útiles' : 'Useful Commands'}:</p>
                      <p>• "{lang === 'es' ? 'di' : 'say'} jab" - {lang === 'es' ? 'Activar JAB' : 'Wake JAB'}</p>
                      <p>• "jab disconnect" - {lang === 'es' ? 'Desconectar / dejar de escuchar' : 'Disconnect / stop listening'}</p>
                      <p>• "jab reconnect" - {lang === 'es' ? 'Volver a escuchar' : 'Reconnect / listen again'}</p>
                      <p>• "jab status" - {lang === 'es' ? 'Estado del sistema' : 'System status'}</p>
                      <p>• "jab open google" - {lang === 'es' ? 'Abrir URL' : 'Open URL'}</p>
                    </div>
                  )}

                  {/* Status Bar */}
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-cyan-500/10">
                    <div className="flex items-center gap-2">
                      <span>{new Date().toLocaleTimeString(lang === 'es' ? 'es-MX' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                      {voiceActivated && (
                        <span className={`flex items-center gap-1 ${isListening ? 'text-green-400' : 'text-cyan-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-green-400 animate-pulse' : 'bg-cyan-400'}`} />
                          {isListening ? (lang === 'es' ? 'Escuchando...' : 'Listening...') : (lang === 'es' ? 'Voz activa' : 'Voice on')}
                        </span>
                      )}
                      {!voiceActivated && (
                        <span className="text-gray-500 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                          {lang === 'es' ? 'Voz off' : 'Voice off'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isSpeaking && <span className="text-cyan-400 animate-pulse">🔊 {lang === 'es' ? 'Hablando' : 'Speaking'}</span>}
                      {isLoading && <span className="text-cyan-400 animate-pulse">⚙️ {lang === 'es' ? 'Procesando' : 'Processing'}</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Hidden Toggle */}
          {!isVisible && (
            <button
              onClick={() => setIsVisible(true)}
              className="fixed z-[60] bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-cyan-600/40 to-blue-600/40 border border-cyan-500/50 shadow-xl hover:shadow-2xl hover:scale-110 transition-all flex items-center justify-center text-cyan-400 animate-pulse"
            >
              <Sparkles className="w-6 h-6" />
            </button>
          )}
        </>
      )}

      {/* Visibility Toggle in Chat */}
      {isChatOpen && (
        <button
          onClick={() => setIsVisible(false)}
          className="fixed z-[65] top-[2rem] right-[calc(2rem+1.5rem)] md:right-[calc(1.5rem+25rem)] p-2 rounded-lg bg-[#21262d] border border-cyan-500/30 text-gray-400 hover:text-red-400 transition"
          title={lang === 'es' ? 'Ocultar' : 'Hide'}
        >
          <EyeOff className="w-4 h-4" />
        </button>
      )}
    </>
  );
}
