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
  Settings, HelpCircle, MessageSquare, Zap, Volume2, VolumeX, FileDown,
  Activity, BrainCircuit, MousePointerClick
} from 'lucide-react';
import { getStoredUser } from '@/lib/auth-store';
import { useLang } from '@/lib/lang-context';
import { EVARobotComponent, type EVAExpression } from './eva-design';
import { executeJARVISCommand } from '@/lib/jarvis-commands';
import { detectIntent, formatClockSpanish, formatClockEnglish } from './system-knowledge';
import { transcribeAudio } from '@/lib/transcribe-client';
import { useWakeWord } from '@/lib/use-wake-word';
import { speakText } from '@/lib/tts';
import { isNativeApp } from '@/lib/native-speech';
import { runAgent } from '@/lib/jab-agent';
import { exportReport } from '@/lib/report-export';
import type { JABStatus } from '@/lib/voice-types';
import { getEmpleadoByCodigo, getUserSchedule, saveUserSchedule, type UserSchedule, type Empleado } from '@/lib/firebase';
import { getWeekNumber, getDayEndTime, getDayEndAdjusted, setStoredLunchTime, setLunchPromptWeek, getLunchPromptWeek, scheduleTodayAlarms, getStoredLunchTime, setStoredSatExitTime, setStoredSatEatCompany, setStoredSatLunchTime, setSatPromptWeek, getSatPromptWeek, scheduleSaturdayAlarms, getStoredSatExitTime, getStoredSatEatCompany, esQATeam } from '@/lib/alarm-engine';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface Message { role: 'user' | 'assistant'; content: string; timestamp: number; report?: { format: string; filename: string; markdown: string }; }

const LS_MESSAGES = 'jab-messages';
const LS_SETTINGS = 'jab-settings';

// Auto-responses
const AUTO_RESPONSES: { pattern: RegExp; es: string; en: string }[] = [
  { pattern: /(gracias|thanks|thank you)/i, es: 'De nada! 🫶', en: 'You\'re welcome! 🫶' },
  { pattern: /(bien\b|fine|good|doing well)/i, es: 'Excelente! ¿Necesitas algo?', en: 'Great! Need anything?' },
  { pattern: /(quien eres|what are you|who are you)/i, es: 'Soy JAB, tu asistente inteligente 🤖 con tecnología EVA. ¡Siempre listo para ayudarte!', en: 'I\'m JAB, your intelligent assistant 🤖 with EVA technology. Always ready to help!' },
];

// ─── Current view data (for agent tools: analizarDatosVista / generarReporte) ───
const VIEW_LABELS: Record<string, { es: string; en: string }> = {
  '/panel': { es: 'Panel Principal', en: 'Main Panel' },
  '/panel/welcome': { es: 'Bienvenida', en: 'Welcome' },
  '/panel/rrhh': { es: 'RRHH (Personal)', en: 'HR (Staff)' },
  '/panel/qa-reports': { es: 'QA Reports', en: 'QA Reports' },
  '/panel/it-manager': { es: 'IT Manager', en: 'IT Manager' },
  '/panel/it-manager/usuarios': { es: 'Usuarios IT', en: 'IT Users' },
  '/panel/it-manager/ide': { es: 'IDE Visual', en: 'Visual IDE' },
  '/panel/it-manager/inventario': { es: 'Inventario', en: 'Inventory' },
  '/panel/agenda': { es: 'Agenda', en: 'Agenda' },
};

function currentViewLabel(pathname: string, lang: 'es' | 'en'): string {
  return VIEW_LABELS[pathname]?.[lang] ?? pathname;
}

async function getViewDataForRoute(pathname: string): Promise<unknown> {
  try {
    const fb = await import('@/lib/firebase');
    switch (pathname) {
      case '/panel/rrhh':
        return await fb.getEmpleados();
      case '/panel/qa-reports':
        return { oql: await fb.getQAOQLRecords(), inline: await fb.getInLineDefectRecords() };
      case '/panel/it-manager':
        return await fb.getSupportRequests();
      case '/panel/it-manager/usuarios':
        return await fb.getUsuariosIT();
      case '/panel/it-manager/inventario':
        return await fb.getEquiposInventario();
      case '/panel/agenda': {
        const user = getStoredUser();
        if (user?.codigo) return await fb.getAgendaNotes(user.codigo);
        return null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

export function FloatingAI() {
  const router = useRouter();
  const pathname = usePathname();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const { lang, toggleLang } = useLang();
  const [expression, setExpression] = useState<EVAExpression>('idle');
  const [status, setStatusState] = useState<JABStatus>('idle');
  const [isListening, setIsListening] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const statusRef = useRef<JABStatus>('idle');
  statusRef.current = status;

  /** Single source of truth for voice/agent state; syncs all derived indicators. */
  const setStatus = useCallback((next: JABStatus) => {
    setStatusState(next);
    setIsListening(next === 'listening');
    setIsMicActive(next === 'ptt');
    setIsSpeaking(next === 'speaking');
  }, []);
  const [userName, setUserName] = useState('User');
  const [isMobile, setIsMobile] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  // Wake-word activation is web-only. In the APK the mic must never run on its
  // own (no constant open/close beeps): voice is only via hold-to-talk.
  const [voiceActivated, setVoiceActivated] = useState(!isNativeApp());
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const processingRef = useRef(false);
  const sessionPromptShown = useRef(false);
  const [userCode, setUserCode] = useState<string | null>(null);
  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [schedule, setSchedule] = useState<UserSchedule | null | undefined>(undefined);
  const [dayEndInfo, setDayEndInfo] = useState<{ base: string; label: string; offsetMin: number } | null>(null);
  const [greetComplete, setGreetComplete] = useState(false);
  const [awaitingLunchResponse, setAwaitingLunchResponse] = useState(false);
  const [awaitingSatResponse, setAwaitingSatResponse] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const [posOverrides, setPosOverrides] = useState<{ right?: number; bottom?: number }>({});
  const posIndexRef = useRef(0);
  const micHandleRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const inputTextRef = useRef('');
  useEffect(() => { inputTextRef.current = inputText; }, [inputText]);

  // Gestures on the floating JAB button:
  //  - Press-and-hold (>=350ms) = push-to-talk (opens the mic, release to send).
  //  - Double click / double tap = open/close the conversation.
  //  - Single tap = nothing (so it never collides with hold-to-talk).
  const pttHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pttHeldRef = useRef(false);
  const downPosRef = useRef<{ x: number; y: number } | null>(null);
  const tapMovedRef = useRef(false);
  const lastTapRef = useRef(0);
  const tapResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearHoldTimer = () => {
    if (pttHoldTimerRef.current) { clearTimeout(pttHoldTimerRef.current); pttHoldTimerRef.current = null; }
  };
  const clearTapReset = () => {
    if (tapResetTimerRef.current) { clearTimeout(tapResetTimerRef.current); tapResetTimerRef.current = null; }
  };

  // ─── Setup ───
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Load user, employee, and schedule
  useEffect(() => {
    try {
      const user = getStoredUser();
      if (user) {
        setUserCode(user.codigo);
        getEmpleadoByCodigo(user.codigo).then((emp) => {
          setEmpleado(emp);
          setDayEndInfo(emp ? getDayEndAdjusted(emp) : { base: getDayEndTime(), label: `Salida ${getDayEndTime()}`, offsetMin: 10 });
          setUserName(emp?.nombres?.split(' ')[0] || 'User');
        });
        getUserSchedule(user.codigo).then(setSchedule);
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
        if (s.voice !== undefined) setVoiceActivated(isNativeApp() ? false : s.voice);
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

  // Wake word detection — always on when voiceActivated is true (paused while JAB speaks/processes
  // so Android releases the microphone and TTS can actually play). Disabled in the APK: there the
  // microphone only opens via hold-to-talk on the JAB button.
  const wakeSkipRef = useRef(false);
  const { stopListening: stopWakeWord, restart: restartWakeWord, resumeListening: resumeWakeWord } = useWakeWord({
    enabled: !isNativeApp() && voiceActivated && !isSpeaking && !isMicActive && !isLoading,
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
    onListeningChange: (v) => {
      if (v) setStatusState(prev => prev === 'idle' ? 'listening' : prev);
    },
    onState: (s) => {
      if (s === 'listening') setStatusState(prev => prev === 'idle' ? 'listening' : prev);
      else if (s === 'stopped') setStatusState(prev => prev === 'listening' ? 'idle' : prev);
    },
    onLevel: setMicLevel,
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
      if (!soundEnabled) {
        setStatus('idle');
        cb?.();
        return;
      }

      // Release the wake-word microphone first so Android frees audio focus
      // and the TTS output is actually audible. The mic reopens automatically
      // when status returns to idle (enabled-driven).
      stopWakeWord();
      setStatus('speaking');
      speakText({
        text,
        lang: lang === 'es' ? 'es-CO' : 'en-US',
        rate: 1.1,
        pitch: 0.9,
        onStart: () => {
          setStatus('speaking');
          setExpression('processing');
        },
        onEnd: (ok) => {
          setStatus('idle');
          setExpression(ok ? 'happy' : 'concerned');
          cb?.();
        },
      }).catch(() => {
        setStatus('idle');
        setExpression('concerned');
        cb?.();
      });
    },
    [lang, soundEnabled, stopWakeWord, setStatus]
  );

  // Greeting & auto-show on app start
  const greetedRef = useRef(false);

  // No auto-open the chat on app load. The floating button stays visible;
  // the chat only opens when the user clicks JAB, says the wake word, or asks.
  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    if (!isChatOpen) return;
    if (greetedRef.current) return;
    greetedRef.current = true;
    setGreetComplete(true);
    const now = new Date();
    const hours = now.getHours();
    const timeGreeting = hours >= 6 && hours < 12 ? (lang === 'es' ? 'Buenos días' : 'Good morning')
      : hours >= 12 && hours < 18 ? (lang === 'es' ? 'Buenas tardes' : 'Good afternoon')
      : (lang === 'es' ? 'Buenas noches' : 'Good evening');

    const fecha = now.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const hora = lang === 'es' ? formatClockSpanish(now) : formatClockEnglish(now);

    const intro = (lang === 'es'
      ? `${timeGreeting} ${userName}!\n\nHoy es ${fecha} y ${hora}.\n\nMi nombre es JAB, tu asistente inteligente, estoy aquí para ayudarte en lo que necesites.\n\nSolo di "JAB necesito" + lo que deseas, o escríbeme directamente.`
      : `${timeGreeting} ${userName}!\n\nToday is ${fecha} and ${hora}.\n\nMy name is JAB, your intelligent assistant, I'm here to help you with anything you need.\n\nJust say "JAB I need" + what you want, or type directly.`);

    setMessages((prev) => prev.length === 0 ? [{ role: 'assistant', content: intro, timestamp: Date.now() }] : prev);
    setTimeout(() => speak(intro), 800);
  }, [isChatOpen, lang, userName, speak]);

  const addMessage = useCallback((role: 'user' | 'assistant', content: string, report?: Message['report']) => {
    setMessages((prev) => [...prev, { role, content, timestamp: Date.now(), report }]);
  }, []);

  // ─── Lunch/Saturday prompt after greeting ───
  useEffect(() => {
    if (!isChatOpen) return;
    if (!greetComplete) return;
    if (schedule === undefined) return;
    if (sessionPromptShown.current) return;
    const day = new Date().getDay();
    const week = getWeekNumber();
    if (day === 0) return; // Sunday — never prompt
    if (day === 6) {
      // Saturday
      const storedSatWeek = schedule?.satWeek || getSatPromptWeek();
      if (storedSatWeek !== week && userCode) {
        sessionPromptShown.current = true;
        setAwaitingSatResponse(true);
        const ask = lang === 'es'
          ? '🕐 Hoy es sábado (horas extras). ¿A qué hora piensas salir? ¿Y almuerzas en la empresa si te quedas después de medio día?'
          : '🕐 It\'s Saturday (extra hours). What time will you leave? And will you eat at the company if staying after noon?';
        setTimeout(() => {
          addMessage('assistant', ask);
          speak(ask);
        }, 3000);
      }
      return;
    }
    // Weekday (Monday-Friday): once per week, only for QA Team (rotating schedules)
    const storedWeek = schedule?.lunchWeek || getLunchPromptWeek();
    const storedLunch = schedule?.lunchTime || getStoredLunchTime();
    if (esQATeam(empleado) && (!storedLunch || storedWeek !== week) && userCode) {
      sessionPromptShown.current = true;
      setAwaitingLunchResponse(true);
      const ask = lang === 'es'
        ? '🕐 Antes de comenzar, ¿a qué hora almuerzas esta semana?'
        : '🕐 Before we start, what time do you have lunch this week?';
      setTimeout(() => {
        addMessage('assistant', ask);
        speak(ask);
      }, 3000);
    }
  }, [isChatOpen, greetComplete, schedule, lang, addMessage, speak, userCode, empleado]);

  // ─── Background timer for lunch/exit reminders ───
  useEffect(() => {
    if (!isChatOpen) return;
    const isSaturday = new Date().getDay() === 6;
    if (!schedule && !getStoredLunchTime() && !isSaturday) return;
    const lunchTime = isSaturday ? (schedule?.satLunchTime || undefined) : (schedule?.lunchTime || getStoredLunchTime());
    const exitBase = isSaturday ? (schedule?.satExitTime || undefined) : dayEndInfo?.base;
    const exitOffset = isSaturday ? 10 : (dayEndInfo?.offsetMin ?? 10);
    const check = () => {
      const now = new Date();
      const currentMin = now.getHours() * 60 + now.getMinutes();
      const todayStr = now.toISOString().slice(0, 10);
      const sentKey = `jab-reminder-${todayStr}`;
      const alreadySent = localStorage.getItem(sentKey);
      if (lunchTime) {
        const [lh, lm] = lunchTime.split(':').map(Number);
        const lunchMin = lh * 60 + lm;
        if (currentMin >= lunchMin - 10 && currentMin < lunchMin && alreadySent !== 'lunch') {
          const msg = lang === 'es'
            ? (isSaturday ? `🍽️ Sábado: 10 min para almuerzo (${lunchTime}).` : `🍽️ Te quedan 10 minutos para ir a almorzar (${lunchTime}).`)
            : (isSaturday ? `🍽️ Saturday: 10 min until lunch (${lunchTime}).` : `🍽️ You have 10 minutes until lunch (${lunchTime}).`);
          addMessage('assistant', msg);
          speak(msg);
          localStorage.setItem(sentKey, 'lunch');
        }
      }
      if (exitBase && exitBase !== '00:00') {
        const [eh, em] = exitBase.split(':').map(Number);
        const exitMin = eh * 60 + em;
        if (currentMin >= exitMin - exitOffset && currentMin < exitMin && alreadySent !== 'exit') {
          const msg = lang === 'es'
            ? (isSaturday ? `🚪 Sábado: 10 min para salir (${exitBase}).` : `🚪 Te quedan ${exitOffset} minutos para salir (${exitBase}).`)
            : (isSaturday ? `🚪 Saturday: 10 min until exit (${exitBase}).` : `🚪 You have ${exitOffset} minutes until exit (${exitBase}).`);
          addMessage('assistant', msg);
          speak(msg);
          localStorage.setItem(sentKey, 'exit');
        }
      }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [isChatOpen, schedule, dayEndInfo, lang, addMessage, speak]);

  // Safety timeout: auto-reset processingRef and isLoading after 30s
  useEffect(() => {
    if (!isLoading) return;
    const t = setTimeout(() => {
      processingRef.current = false;
      setIsLoading(false);
      setStatusState(prev => (prev === 'processing' || prev === 'executing') ? 'idle' : prev);
    }, 30000);
    return () => clearTimeout(t);
  }, [isLoading]);

  const processMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || processingRef.current) { console.log('JAB: processMessage skipped', { trimmed, processing: processingRef.current }); return; }
      console.log('JAB: processMessage start', trimmed);
      processingRef.current = true;

      addMessage('user', trimmed);
      setInputText('');
      setIsLoading(true);
      setStatus('processing');
      setExpression('scanning');

      // Voice activation toggle commands
      const cmd = trimmed.toLowerCase().replace(/\bjabe?\b/gi, '').trim();
      if (/disconnect|dejar de escuchar|desconectar|stop listening/i.test(cmd)) {
        if (isNativeApp()) {
          const nat = lang === 'es'
            ? 'En esta app el micrófono solo se activa manteniendo presionado mi botón. No hay escucha continua.'
            : 'In this app the microphone only turns on while you hold my button. There is no continuous listening.';
          addMessage('assistant', nat);
          setExpression('idle');
          speak(nat);
          setIsLoading(false);
          processingRef.current = false;
          return;
        }
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
        if (isNativeApp()) {
          const nat = lang === 'es'
            ? 'Para hablarme mantén presionado mi botón de JAB. Un toque simple solo abre la conversación.'
            : 'To talk to me, press and hold my JAB button. A single tap only opens the chat.';
          addMessage('assistant', nat);
          setExpression('happy');
          speak(nat);
          setIsLoading(false);
          processingRef.current = false;
          return;
        }
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

      // Saturday response detection
      if (awaitingSatResponse && userCode) {
        const timeMatch = trimmed.match(/(\d{1,2}):(\d{2})/);
        if (timeMatch) {
          const exitTime = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
          const eatCompany = /sí|si\b|yes|claro|ok|sim|almuerz|como|voy a comer/i.test(trimmed);
          const lunchTime = eatCompany ? '12:00' : undefined;
          const week = getWeekNumber();
          setStoredSatExitTime(exitTime);
          setStoredSatEatCompany(eatCompany);
          setStoredSatLunchTime(lunchTime || '');
          setSatPromptWeek(week);
          scheduleSaturdayAlarms(exitTime, lunchTime);
          const newSchedule: UserSchedule = {
            lunchTime: schedule?.lunchTime || undefined,
            lunchWeek: schedule?.lunchWeek,
            satExitTime: exitTime,
            satEatCompany: eatCompany,
            satLunchTime: lunchTime,
            satWeek: week,
          };
          try { await saveUserSchedule(userCode, newSchedule); } catch {}
          setSchedule(newSchedule);
          const confirm = lang === 'es'
            ? (lunchTime
              ? `✅ Sábado: salida a las ${exitTime}, almuerzas en la empresa.`
              : `✅ Sábado: salida a las ${exitTime}, sin almuerzo en empresa.`)
            : (lunchTime
              ? `✅ Saturday: exit at ${exitTime}, you eat at the company.`
              : `✅ Saturday: exit at ${exitTime}, no lunch at company.`);
          addMessage('assistant', confirm);
          setExpression('happy');
          speak(confirm);
          setIsLoading(false);
          processingRef.current = false;
          setAwaitingSatResponse(false);
          return;
        }
        // Recognize natural replies: already gave data, already in database, etc.
        if (/ya\s*(te\s*)?(di|diste|hab[ií]a|está|tengo|sabes|conoces|registre|guardé)|en\s*tu\s*(base|sistema|bd)|ya\s*est[áa]|ya\s*lo\s*(d[ii]|tengo|sabes|registraste)/i.test(trimmed)) {
          const existingExit = schedule?.satExitTime || getStoredSatExitTime();
          const existingEat = schedule?.satEatCompany ?? getStoredSatEatCompany();
          if (existingExit) {
            const existConfirm = lang === 'es'
              ? `✅ Claro, ya tengo tu sábado: salida a las ${existingExit}${existingEat ? ', almuerzas en la empresa.' : ', sin almuerzo.'}`
              : `✅ Got it, already have your Saturday: exit at ${existingExit}${existingEat ? ', you eat at the company.' : ', no lunch.'}`;
            addMessage('assistant', existConfirm);
            setExpression('happy');
            speak(existConfirm);
          } else {
            const ask = lang === 'es'
              ? '🕐 No encuentro el dato guardado. ¿A qué hora sales hoy sábado?'
              : '🕐 I can\'t find the saved data. What time do you leave today (Saturday)?';
            addMessage('assistant', ask);
            speak(ask);
            setAwaitingSatResponse(true);
          }
          setIsLoading(false);
          processingRef.current = false;
          return;
        }
        setAwaitingSatResponse(false);
      }

      // Lunch time response detection
      if (awaitingLunchResponse && userCode) {
        const timeMatch = trimmed.match(/(\d{1,2}):(\d{2})/);
        if (timeMatch) {
          const time = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
          const week = getWeekNumber();
          setStoredLunchTime(time);
          setLunchPromptWeek(week);
          scheduleTodayAlarms(time, empleado || undefined);
          const newSchedule: UserSchedule = {
            lunchTime: time,
            lunchWeek: week,
            satExitTime: schedule?.satExitTime || undefined,
            satEatCompany: schedule?.satEatCompany,
            satLunchTime: schedule?.satLunchTime || undefined,
            satWeek: schedule?.satWeek,
          };
          try { await saveUserSchedule(userCode, newSchedule); } catch {}
          setSchedule(newSchedule);
          const confirm = lang === 'es'
            ? `✅ Recordatorio de almuerzo programado a las ${time}.`
            : `✅ Lunch reminder set for ${time}.`;
          addMessage('assistant', confirm);
          setExpression('happy');
          speak(confirm);
          setIsLoading(false);
          processingRef.current = false;
          setAwaitingLunchResponse(false);
          return;
        }
        // Recognize natural replies: already gave data, already in database, etc.
        if (/ya\s*(te\s*)?(di|diste|hab[ií]a|está|tengo|sabes|conoces|registre|guardé)|en\s*tu\s*(base|sistema|bd)|ya\s*est[áa]|ya\s*lo\s*(d[ii]|tengo|sabes|registraste)/i.test(trimmed)) {
          const existingLunch = schedule?.lunchTime || getStoredLunchTime();
          const existingWeek = schedule?.lunchWeek || getLunchPromptWeek();
          if (existingLunch && existingWeek === getWeekNumber()) {
            const existConfirm = lang === 'es'
              ? `✅ Cierto, ya tengo tu hora: ${existingLunch}.`
              : `✅ Right, I already have your time: ${existingLunch}.`;
            addMessage('assistant', existConfirm);
            setExpression('happy');
            speak(existConfirm);
          } else {
            const ask = lang === 'es'
              ? '🕐 No encuentro el dato guardado. ¿Puedes decirme la hora de almuerzo (ej. 12:00)?'
              : '🕐 I can\'t find the saved data. Can you tell me your lunch time (e.g. 12:00)?';
            addMessage('assistant', ask);
            speak(ask);
            setAwaitingLunchResponse(true);
          }
          setIsLoading(false);
          processingRef.current = false;
          return;
        }
        setAwaitingLunchResponse(false);
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

      // Navigate immediately if user asked to go somewhere
      const intent = detectIntent(trimmed, lang);
      const navRoute = intent.action === 'navigate' ? intent.params?.route : null;
      if (navRoute) {
        setTimeout(() => router.push(navRoute), 500);
      }

      // Hora: responder SIEMPRE en palabras completas (ej: "Son las doce del
      // medio día con treinta y ocho minutos"), sin omitir palabras.
      if (/qu[eé] hora (es|son)|qu[eé] horas son|hora actual|d[ií]me la hora|qu[eé] hora tienes|qu[eé] hora hace|reloj|what time|current time|time now|what time is|clock/i.test(trimmed)) {
        const timeMsg = lang === 'es'
          ? formatClockSpanish(new Date())
          : formatClockEnglish(new Date());
        addMessage('assistant', timeMsg);
        setExpression('happy');
        speak(timeMsg);
        setIsLoading(false);
        processingRef.current = false;
        return;
      }

      // AI Agent (function calling / tools: navegarA, analizarDatosVista, generarReporte, ejecutarComando)
      console.log('JAB: calling runAgent');
      try {
        setStatus('processing');
        const history = messages.slice(-4).map(m => ({ role: m.role, content: m.content }));
        const agentPromise = runAgent({
          message: trimmed,
          lang,
          userName,
          history,
          viewLabel: currentViewLabel(pathname, lang),
          hooks: {
            navigate: (route) => { if (pathname !== route) router.push(route); },
            getViewData: () => getViewDataForRoute(pathname),
            getViewLabel: () => currentViewLabel(pathname, lang),
            onToolStart: () => { setStatus('executing'); setExpression('scanning'); },
          },
        });
        const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 25000));
        const agentResult = await Promise.race([agentPromise, timeoutPromise]);
        console.log('JAB: agent result', agentResult?.content?.slice(0, 80), agentResult?.toolCalls);

        const confirmMsg = agentResult?.content;
        if (confirmMsg) {
          const clean = confirmMsg.replace(/\p{Emoji}\s*\([^)]*\)/gu, '').replace(/\p{Emoji}\s*/gu, '').trim();
          const report = agentResult?.report;
          addMessage('assistant', clean, report ? { format: report.format, filename: report.filename, markdown: report.markdown } : undefined);
          setExpression('happy');
          speak(clean);
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
        console.error('JAB: agent error', error);
        const errMsg = lang === 'es' ? 'Disculpa, ocurrió un error.' : 'Sorry, an error occurred.';
        addMessage('assistant', errMsg);
        setExpression('concerned');
        speak(errMsg);
      } finally {
        setIsLoading(false);
        processingRef.current = false;
        setStatusState(prev => (prev === 'processing' || prev === 'executing') ? 'idle' : prev);
      }
    },
    [messages, lang, userName, addMessage, speak, setVoiceActivated, awaitingLunchResponse, userCode, empleado, schedule, pathname, router]
  );

  /** Push-to-talk: open the mic (hold on the JAB button or tap the chat mic). */
  const startPTT = useCallback(() => {
    if (statusRef.current === 'ptt') return;
    // Free the wake-word microphone first so the PTT mic opens cleanly
    // (no shared stream / no two recognizers fighting for the mic).
    stopWakeWord();
    setStatus('ptt');
    setExpression('scanning');

    if (isNativeApp()) {
      // Native push-to-talk: single continuous session (no mic churn).
      const run = async () => {
        try {
          const { recognizeOnce } = await import('@/lib/native-speech');
          const handle = await recognizeOnce({
            language: lang === 'es' ? 'es-CO' : 'en-US',
            callbacks: {
              onPartial: (t) => setInputText(t),
              onEnd: (finalText) => {
                micHandleRef.current = null;
                setStatus('idle');
                const t = (finalText || inputTextRef.current).trim();
                if (t) {
                  // Show the conversation so the user sees the response.
                  setIsChatOpen(true);
                  processMessage(t);
                }
              },
              onError: () => {
                micHandleRef.current = null;
                setStatus('idle');
                setExpression('concerned');
              },
            },
          });
          if (statusRef.current !== 'ptt') {
            handle.stop().catch(() => {});
            return;
          }
          micHandleRef.current = handle;
        } catch {
          micHandleRef.current = null;
          setStatus('idle');
          setExpression('concerned');
        }
      };
      run();
      return;
    }

    // Web push-to-talk: MediaRecorder + VAD auto-stop, single stream per press.
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      if (statusRef.current !== 'ptt') {
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const mr = new MediaRecorder(stream, { mimeType });
      const chunks: BlobPart[] = [];
      let isStopped = false;
      let silenceTimer: ReturnType<typeof setTimeout> | null = null;

      const stopRecording = () => {
        if (isStopped) return;
        isStopped = true;
        if (silenceTimer) clearTimeout(silenceTimer);
        if (mr.state === 'recording') mr.stop();
      };
      // Allow stopPTT to end the web PTT too.
      micHandleRef.current = { stop: async () => stopRecording() };

      // Silence detection via AudioContext
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const detectSilence = () => {
        if (isStopped) return;
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        if (avg < 5) {
          if (!silenceTimer) silenceTimer = setTimeout(stopRecording, 1500);
        } else {
          if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
        }
        if (!isStopped) requestAnimationFrame(detectSilence);
      };

      mr.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      mr.onstop = async () => {
        micHandleRef.current = null;
        setStatus('idle');
        stream.getTracks().forEach(t => t.stop());
        audioCtx.close();
        const blob = new Blob(chunks, { type: mimeType });
        if (blob.size < 400) return;
        const text = await transcribeAudio(blob);
        if (text) {
          setIsChatOpen(true);
          setInputText(text);
          processMessage(text);
        }
      };

      mr.start(100);
      detectSilence();
      setTimeout(stopRecording, 30000);
    }).catch(() => {
      setStatus('idle');
      setExpression('concerned');
    });
  }, [lang, processMessage, stopWakeWord]);

  /** Stop push-to-talk (release the hold). The handle delivers the final text. */
  const stopPTT = useCallback(() => {
    setStatus('idle');
    if (micHandleRef.current) {
      const handle = micHandleRef.current;
      micHandleRef.current = null;
      handle.stop().catch(() => {});
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (statusRef.current === 'ptt') { stopPTT(); return; }
    startPTT();
  }, [startPTT, stopPTT]);

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

  // ─── Overlap detection: move JAB to avoid blocking interactive elements ───
  useEffect(() => {
    const isInteractive = (el: Element): boolean => {
      const tag = el.tagName?.toLowerCase();
      const role = el.getAttribute?.('role');
      const onclick = el.getAttribute?.('onclick');
      return ['button', 'a', 'input', 'select', 'textarea'].includes(tag) ||
             role === 'button' || role === 'link' || onclick !== null;
    };

    const check = () => {
      const btn = buttonRef.current;
      if (!btn || isChatOpen) return;
      const rect = btn.getBoundingClientRect();
      const origPE = btn.style.pointerEvents;
      btn.style.pointerEvents = 'none';
      let overlap = false;
      try {
        const pts: [number, number][] = [
          [rect.left + rect.width / 2, rect.top + rect.height / 2],
          [rect.left + 4, rect.top + 4],
          [rect.right - 4, rect.top + 4],
          [rect.left + 4, rect.bottom - 4],
          [rect.right - 4, rect.bottom - 4],
        ];
        for (const [x, y] of pts) {
          const el = document.elementFromPoint(x, y);
          if (el && el !== btn && el !== document.body && el !== document.documentElement && isInteractive(el)) {
            overlap = true;
            break;
          }
        }
      } finally {
        btn.style.pointerEvents = origPE;
      }

      if (overlap && posIndexRef.current === 0) {
        posIndexRef.current = 1;
        setPosOverrides({ right: 5.5 });
      } else if (overlap && posIndexRef.current === 1) {
        posIndexRef.current = 2;
        setPosOverrides({ right: 5.5, bottom: 5 });
      } else if (!overlap && posIndexRef.current !== 0) {
        posIndexRef.current = 0;
        setPosOverrides({});
      }
    };

    const t = setTimeout(check, 800);
    const interval = setInterval(check, 2000);
    const handler = () => requestAnimationFrame(check);
    window.addEventListener('scroll', handler, { passive: true });
    window.addEventListener('resize', handler, { passive: true });
    return () => {
      clearTimeout(t);
      clearInterval(interval);
      window.removeEventListener('scroll', handler);
      window.removeEventListener('resize', handler);
    };
  }, [isMobile, isChatOpen]);

  if (pathname === '/') return null;

  // Gestures on the floating JAB button. Pointer events only (no native click):
  // press-and-hold opens PTT; releasing ends it. A clean short press counts as
  // a tap and only opens/closes the conversation on a DOUBLE tap/click.
  const handleButtonPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    unlockSpeech();
    clearHoldTimer();
    pttHeldRef.current = false;
    tapMovedRef.current = false;
    downPosRef.current = { x: e.clientX, y: e.clientY };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    pttHoldTimerRef.current = setTimeout(() => {
      pttHoldTimerRef.current = null;
      pttHeldRef.current = true;
      startPTT();
    }, 350);
  }, [startPTT, unlockSpeech]);

  const handleButtonPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!downPosRef.current) return;
    const dx = e.clientX - downPosRef.current.x;
    const dy = e.clientY - downPosRef.current.y;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) tapMovedRef.current = true;
  }, []);

  const finishButtonGesture = useCallback((e: React.PointerEvent<HTMLDivElement>, isTap: boolean) => {
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    clearHoldTimer();
    if (pttHeldRef.current) {
      pttHeldRef.current = false;
      downPosRef.current = null;
      stopPTT();
      return;
    }
    downPosRef.current = null;
    if (!isTap || tapMovedRef.current) return;
    // Clean short press → detect a double tap/click to toggle the conversation.
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      clearTapReset();
      lastTapRef.current = 0;
      setIsChatOpen((open) => !open);
    } else {
      lastTapRef.current = now;
      clearTapReset();
      tapResetTimerRef.current = setTimeout(() => {
        lastTapRef.current = 0;
        tapResetTimerRef.current = null;
      }, 350);
    }
  }, [stopPTT]);

  const handleButtonPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    finishButtonGesture(e, true);
  }, [finishButtonGesture]);

  const handleButtonPointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    finishButtonGesture(e, false);
  }, [finishButtonGesture]);

  return (
    <>
      <style>{`
@keyframes wave {
  0%, 100% { transform: scaleY(0.3); }
  50% { transform: scaleY(1); }
}
.animate-wave {
  animation: wave 0.8s ease-in-out infinite;
  transform-origin: bottom;
}
`}</style>
      {isVisible && (
        <>
          {/* JAB Robot - Floating Button */}
          <div
            ref={buttonRef}
            className="fixed z-[60] cursor-pointer group select-none"
            style={{
              left: posOverrides.right !== undefined ? `${posOverrides.right}rem` : (isMobile ? '1rem' : '2rem'),
              bottom: posOverrides.bottom !== undefined ? `${posOverrides.bottom}rem` : (isMobile ? '1rem' : '2rem'),
              filter: 'drop-shadow(0 8px 16px rgba(6, 182, 212, 0.3))',
              touchAction: 'none',
              WebkitUserSelect: 'none',
            }}
            onPointerDown={handleButtonPointerDown}
            onPointerMove={handleButtonPointerMove}
            onPointerUp={handleButtonPointerUp}
            onPointerCancel={handleButtonPointerCancel}
            title={lang === 'es' ? 'Doble clic para abrir el chat · Mantén presionado para hablar' : 'Double-click to open chat · Hold to talk'}
          >
            <div className="relative">
              {isMicActive && (
                <div className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-75" />
              )}
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
                     title="Activación por voz desactivada (mantén presionado para hablar)" />
              )}
            </div>
          </div>

          {/* Chat Panel - Premium Design */}
          {isChatOpen && (
            <div
              className="fixed z-[70] bottom-32 left-4 md:left-6 w-[calc(100vw-2rem)] md:w-96 max-h-[85vh] bg-black/80 backdrop-blur-xl border border-[#00eeff]/20 rounded-3xl shadow-2xl shadow-[#00eeff]/10 flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-[#00eeff]/5 to-[#00ffff]/5 border-b border-[#00eeff]/15 px-6 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full animate-pulse ${
                        status === 'listening' ? 'bg-green-400 shadow-[0_0_8px_#4ade80]'
                        : status === 'ptt' ? 'bg-red-500 shadow-[0_0_8px_#ef4444]'
                        : status === 'speaking' ? 'bg-orange-400 shadow-[0_0_8px_#fb923c]'
                        : status === 'processing' || status === 'executing' ? 'bg-yellow-400 shadow-[0_0_8px_#facc15]'
                        : 'bg-[#00eeff] shadow-[0_0_8px_#00eeff]'
                      }`} />
                      <div>
                        <p className="text-sm font-bold text-white tracking-wide">JAB</p>
                        <p className={`text-xs ${
                          status === 'listening' ? 'text-green-400'
                          : status === 'ptt' ? 'text-red-400'
                          : status === 'speaking' ? 'text-orange-400'
                          : status === 'processing' ? 'text-yellow-400'
                          : status === 'executing' ? 'text-yellow-300'
                          : 'text-cyan-300'
                        }`}>
                          {status === 'listening' ? (lang === 'es' ? 'Escuchando...' : 'Listening...')
                            : status === 'ptt' ? (lang === 'es' ? 'Grabando...' : 'Recording...')
                            : status === 'speaking' ? (lang === 'es' ? 'Hablando...' : 'Speaking...')
                            : status === 'processing' ? (lang === 'es' ? 'Pensando / Analizando datos...' : 'Thinking / Analyzing data...')
                            : status === 'executing' ? (lang === 'es' ? 'Ejecutando acción...' : 'Executing action...')
                            : (lang === 'es' ? 'En línea' : 'Online')}
                        </p>
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
                <div ref={messagesContainerRef} className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4" style={{ scrollbarWidth: 'auto', scrollbarColor: '#4b5563 #1f2937' }}>
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
                          {msg.report && (
                            <div className="mt-3 pt-3 border-t border-cyan-500/15 flex flex-wrap gap-2">
                              <button
                                onClick={() => exportReport('pdf', undefined, msg.report!.markdown, msg.report!.filename)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/20 border border-red-500/40 text-red-300 text-xs hover:bg-red-600/30 transition"
                              >
                                <FileDown className="w-3.5 h-3.5" /> PDF
                              </button>
                              <button
                                onClick={() => exportReport('markdown', undefined, msg.report!.markdown, msg.report!.filename)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600/20 border border-cyan-500/40 text-cyan-300 text-xs hover:bg-cyan-600/30 transition"
                              >
                                <FileDown className="w-3.5 h-3.5" /> Markdown
                              </button>
                              <button
                                onClick={() => exportReport('csv', undefined, msg.report!.markdown, msg.report!.filename)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-xs hover:bg-emerald-600/30 transition"
                              >
                                <FileDown className="w-3.5 h-3.5" /> CSV
                              </button>
                              <button
                                onClick={() => exportReport('json', undefined, msg.report!.markdown, msg.report!.filename)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-300 text-xs hover:bg-blue-600/30 transition"
                              >
                                <FileDown className="w-3.5 h-3.5" /> JSON
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  {isLoading && (
                    <div className="flex justify-start items-center gap-2">
                      <div className="bg-[#21262d] rounded-2xl px-4 py-3 border border-cyan-500/10">
                        <div className="flex gap-2">
                          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                      <span className="text-xs text-yellow-300/80">
                        {status === 'executing'
                          ? (lang === 'es' ? 'Ejecutando acción en pantalla...' : 'Executing action on screen...')
                          : status === 'processing'
                          ? (lang === 'es' ? 'Pensando / Analizando datos...' : 'Thinking / Analyzing data...')
                          : (lang === 'es' ? 'Procesando...' : 'Processing...')}
                      </span>
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
                          ? 'bg-red-500/20 border border-red-500/50 text-red-400'
                          : 'bg-cyan-600/20 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-600/30'
                      }`}
                    >
                      {isMicActive ? (
                        <div className="flex items-center gap-0.5 h-4">
                          <span className="w-0.5 bg-red-400 rounded-full animate-wave" style={{ height: `${20 + micLevel * 80}%`, animationDelay: '0s' }} />
                          <span className="w-0.5 bg-red-400 rounded-full animate-wave" style={{ height: `${20 + micLevel * 80}%`, animationDelay: '0.15s' }} />
                          <span className="w-0.5 bg-red-400 rounded-full animate-wave" style={{ height: `${20 + micLevel * 80}%`, animationDelay: '0.3s' }} />
                          <span className="w-0.5 bg-red-400 rounded-full animate-wave" style={{ height: `${20 + micLevel * 80}%`, animationDelay: '0.45s' }} />
                          <span className="w-0.5 bg-red-400 rounded-full animate-wave" style={{ height: `${20 + micLevel * 80}%`, animationDelay: '0.6s' }} />
                        </div>
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">{lang === 'es' ? (isMicActive ? 'Grabando...' : 'Escuchar') : (isMicActive ? 'Recording...' : 'Listen')}</span>
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
                      <span>{new Date().toLocaleTimeString(lang === 'es' ? 'es-MX' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
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
          )}

        </>
      )}

      {/* Hidden Toggle (always visible, outside isVisible block) */}
      {!isVisible && (
        <button
          onClick={() => setIsVisible(true)}
          className="fixed z-[60] bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-cyan-600/40 to-blue-600/40 border border-cyan-500/50 shadow-xl hover:shadow-2xl hover:scale-110 transition-all flex items-center justify-center text-cyan-400 animate-pulse"
        >
          <Sparkles className="w-6 h-6" />
        </button>
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
