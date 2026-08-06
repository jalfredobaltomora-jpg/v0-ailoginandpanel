'use client';

import { detectPlatform } from './device-api';
import type { VoiceListeningState } from './voice-types';

export function isNativeApp(): boolean {
  return detectPlatform() === 'capacitor';
}

export interface NativeSpeechCallbacks {
  onPartial?: (text: string) => void;
  onEnd?: (text?: string) => void;
  onError?: (error?: unknown) => void;
  onState?: (state: VoiceListeningState) => void;
}

export interface NativeSpeechHandle {
  stop: () => Promise<void>;
  /** Native-only: after a wake event stopped the recognizer, restarts the single continuous session. */
  resume?: () => Promise<void>;
}

const WAKE_PATTERN = /\bjabe?\b/i;
const SILENCE_ERROR_CODES = new Set(['NO_MATCH', 'SPEECH_TIMEOUT']);

/**
 * Pushes the PTT state down to the native recognizer so it keeps a single
 * continuous audio session (continuousPTT) instead of tearing down and
 * restarting the audio stream on every silence. `muteRecognizerBeep`
 * suppresses the Android system beep that causes audible clicks.
 */
async function requestMicPermission(): Promise<void> {
  const { SpeechRecognition } = await import('@capgo/capacitor-speech-recognition');
  const { available } = await SpeechRecognition.available();
  if (!available) throw new Error('Speech recognition is not available on this device');

  const perm = await SpeechRecognition.checkPermissions();
  if (perm.speechRecognition !== 'granted') {
    const res = await SpeechRecognition.requestPermissions();
    if (res.speechRecognition !== 'granted') throw new Error('Speech recognition permission denied');
  }
}

function emitState(cb: NativeSpeechCallbacks['onState'], state: VoiceListeningState) {
  try { cb?.(state); } catch {}
}

/**
 * Native push-to-talk (hold-to-talk): a SINGLE continuous recognition session.
 *
 * The mic opens once when the user presses the button and stays open across
 * natural silences (continuousPTT). It only closes when the user releases the
 * button (stop()) or a hard safety cap is reached, so there are no pops/click
 * from repeatedly opening/closing the audio stream.
 */
export async function recognizeOnce(options: {
  language: string;
  callbacks: NativeSpeechCallbacks;
}): Promise<NativeSpeechHandle> {
  const { SpeechRecognition } = await import('@capgo/capacitor-speech-recognition');
  await requestMicPermission();

  const listeners: { remove: () => void }[] = [];
  let done = false;
  let accumulated = '';

  const cleanup = () => {
    listeners.forEach((l) => { try { l.remove(); } catch {} });
    listeners.length = 0;
  };

  const partialListener = await SpeechRecognition.addListener('partialResults', (event) => {
    if (done) return;
    const text = event.matches?.[0] || event.accumulatedText || '';
    if (text) {
      accumulated = text;
      options.callbacks.onPartial?.(text);
    }
  });

  const segmentListener = await SpeechRecognition.addListener('segmentResults', (event) => {
    if (done) return;
    const text = event.matches?.[0] || '';
    if (text) {
      accumulated = text;
      options.callbacks.onPartial?.(text);
    }
  });

  const stateListener = await SpeechRecognition.addListener('listeningState', (event) => {
    if (done) return;
    if (event.state === 'stopped') {
      done = true;
      cleanup();
      emitState(options.callbacks.onState, 'stopped');
      options.callbacks.onEnd?.(accumulated || undefined);
    } else if (event.state === 'started') {
      emitState(options.callbacks.onState, 'listening');
    }
  });

  const errorListener = await SpeechRecognition.addListener('error', (event) => {
    if (done) return;
    done = true;
    cleanup();
    emitState(options.callbacks.onState, 'stopped');
    if (event && SILENCE_ERROR_CODES.has(event.code)) {
      options.callbacks.onEnd?.(accumulated || undefined);
      return;
    }
    options.callbacks.onError?.(event);
  });

  listeners.push(partialListener, segmentListener, stateListener, errorListener);

  await SpeechRecognition.start({
    language: options.language,
    maxResults: 1,
    partialResults: true,
    popup: false,
    // One continuous audio session across silences, no restart beeps.
    continuousPTT: true,
    muteRecognizerBeep: true,
    allowForSilence: 700,
  });
  try {
    await SpeechRecognition.setPTTState({ held: true, mute: true });
  } catch {}
  emitState(options.callbacks.onState, 'listening');

  // Safety cap: never keep a single PTT open forever.
  const hardStop = setTimeout(() => { void stop(); }, 30000);

  async function stop(): Promise<void> {
    clearTimeout(hardStop);
    if (done) return;
    done = true;
    cleanup();
    try { await SpeechRecognition.setPTTState({ held: false }); } catch {}
    try { await SpeechRecognition.stop(); } catch {}
    emitState(options.callbacks.onState, 'stopped');
    // Deliver the accumulated text so hold-to-talk (release) triggers the
    // callback that processes the user's message.
    options.callbacks.onEnd?.(accumulated || undefined);
  }

  return { stop };
}

/**
 * Native wake-word loop: keeps a SINGLE continuous (segmented) recognition
 * session alive so the microphone does NOT keep stopping/starting.
 *
 * Wake flow (one stop + one start per conversation cycle, no churn):
 *   1. Loop is running, mic open, segmented across silences.
 *   2. "jab" detected → recognizer stopped ONCE, `onWake(text)` fires.
 *   3. Parent speaks / processes (TTS). Call `resume()` afterwards.
 *   4. The single session restarts; mic reopens once.
 *
 * If `resume()` is not called within `RESUME_TIMEOUT_MS`, the loop resumes
 * by itself so the wake word is never left dead.
 */
export async function startWakeLoop(options: {
  language: string;
  onWake: (text: string) => void;
  onError: () => void;
  onState?: (state: VoiceListeningState) => void;
}): Promise<NativeSpeechHandle> {
  const { SpeechRecognition } = await import('@capgo/capacitor-speech-recognition');
  await requestMicPermission();

  let stopped = false;
  let sessionActive = false;
  let isStarting = false;
  let woke = false;
  let restartTimer: ReturnType<typeof setTimeout> | null = null;
  let resumeTimer: ReturnType<typeof setTimeout> | null = null;
  let failures = 0;
  const MAX_FAILURES = 8;
  const RESUME_TIMEOUT_MS = 12000;
  const listeners: { remove: () => void }[] = [];

  const clearTimer = () => {
    if (restartTimer) { clearTimeout(restartTimer); restartTimer = null; }
  };
  const clearResumeTimer = () => {
    if (resumeTimer) { clearTimeout(resumeTimer); resumeTimer = null; }
  };

  const scheduleRestart = (delay = 600) => {
    if (stopped || isStarting || sessionActive) return;
    if (failures >= MAX_FAILURES) {
      stopped = true;
      options.onError();
      return;
    }
    clearTimer();
    restartTimer = setTimeout(() => { void startSession(); }, delay);
  };

  const startSession = async () => {
    if (stopped || isStarting || sessionActive) return;
    isStarting = true;
    woke = false;
    clearResumeTimer();
    try {
      await SpeechRecognition.start({
        language: options.language,
        maxResults: 1,
        partialResults: true,
        popup: false,
        // Segmented session: the recognizer keeps listening across silences
        // instead of ending the session, so the mic stays open continuously.
        allowForSilence: 2000,
        muteRecognizerBeep: true,
      });
      sessionActive = true;
      failures = 0;
      emitState(options.onState, 'listening');
    } catch {
      failures++;
    } finally {
      isStarting = false;
    }
    if (!sessionActive && !stopped) {
      scheduleRestart(1000 + failures * 500);
    }
  };

  /** Called by the parent after processing/speaking to reopen the mic once. */
  const resume = async () => {
    clearResumeTimer();
    if (stopped || sessionActive) return;
    woke = false;
    await startSession();
  };

  const handleWake = (text: string) => {
    if (stopped || woke) return;
    woke = true;
    failures = 0;
    // Gracefully end the current session (normal stop, no force). The parent
    // releases audio for TTS; the mic reopens on resume() — one transition.
    try {
      SpeechRecognition.setPTTState({ held: false }).catch(() => {});
    } catch {}
    SpeechRecognition.stop().catch(() => {});
    emitState(options.onState, 'stopped');
    // Safety: if the parent forgets to resume, reopen automatically.
    resumeTimer = setTimeout(() => { void resume(); }, RESUME_TIMEOUT_MS);
    options.onWake(text);
  };

  const partialListener = await SpeechRecognition.addListener('partialResults', (event) => {
    if (stopped || woke) return;
    const text = event.matches?.[0] || event.accumulatedText || '';
    if (text && WAKE_PATTERN.test(text.trim())) {
      handleWake(text);
    }
  });

  const segmentListener = await SpeechRecognition.addListener('segmentResults', (event) => {
    if (stopped || woke) return;
    const text = event.matches?.[0] || '';
    if (text && WAKE_PATTERN.test(text.trim())) {
      handleWake(text);
    }
  });

  const stateListener = await SpeechRecognition.addListener('listeningState', (event) => {
    if (stopped) return;
    if (event.state === 'started') {
      emitState(options.onState, 'listening');
    }
    if (event.state === 'stopped') {
      sessionActive = false;
      emitState(options.onState, 'stopped');
      // After a wake the loop waits for resume(); otherwise restart.
      if (!woke) scheduleRestart();
    }
  });

  const errorListener = await SpeechRecognition.addListener('error', (event) => {
    if (stopped) return;
    // Silence is expected and handled by the state events.
    if (event && SILENCE_ERROR_CODES.has(event.code)) return;
    sessionActive = false;
    failures++;
    scheduleRestart(1000 + failures * 500);
  });

  const readyListener = await SpeechRecognition.addListener('readyForNextSession', () => {
    if (stopped) return;
    sessionActive = false;
    if (!woke) scheduleRestart();
  });

  listeners.push(partialListener, segmentListener, stateListener, errorListener, readyListener);

  await startSession();

  return {
    resume,
    stop: async () => {
      stopped = true;
      clearTimer();
      clearResumeTimer();
      listeners.forEach((l) => { try { l.remove(); } catch {} });
      listeners.length = 0;
      try { await SpeechRecognition.setPTTState({ held: false }); } catch {}
      try { await SpeechRecognition.stop(); } catch {}
      try { await SpeechRecognition.removeAllListeners(); } catch {}
      emitState(options.onState, 'stopped');
    },
  };
}
