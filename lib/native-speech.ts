'use client';

import { detectPlatform } from './device-api';

export function isNativeApp(): boolean {
  return detectPlatform() === 'capacitor';
}

export interface NativeSpeechCallbacks {
  onPartial?: (text: string) => void;
  onEnd?: () => void;
  onError?: (error?: unknown) => void;
}

export interface NativeSpeechHandle {
  stop: () => Promise<void>;
}

const WAKE_PATTERN = /\bjabe?\b/i;

/**
 * Native push-to-talk: records until silence (allowForSilence) or stop(),
 * streaming partial results via onPartial and firing onEnd when the session stops.
 */
export async function recognizeOnce(options: {
  language: string;
  callbacks: NativeSpeechCallbacks;
}): Promise<NativeSpeechHandle> {
  const { SpeechRecognition } = await import('@capgo/capacitor-speech-recognition');
  const { available } = await SpeechRecognition.available();
  if (!available) throw new Error('Speech recognition is not available on this device');

  const perm = await SpeechRecognition.checkPermissions();
  if (perm.speechRecognition !== 'granted') {
    const res = await SpeechRecognition.requestPermissions();
    if (res.speechRecognition !== 'granted') throw new Error('Speech recognition permission denied');
  }

  const listeners: { remove: () => void }[] = [];
  let done = false;

  const cleanup = () => {
    listeners.forEach((l) => { try { l.remove(); } catch {} });
    listeners.length = 0;
  };

  const partialListener = await SpeechRecognition.addListener('partialResults', (event) => {
    if (done) return;
    const text = event.matches?.[0] || event.accumulatedText || '';
    if (text) options.callbacks.onPartial?.(text);
  });

  const stateListener = await SpeechRecognition.addListener('listeningState', (event) => {
    if (done) return;
    if (event.state === 'stopped') {
      done = true;
      cleanup();
      options.callbacks.onEnd?.();
    }
  });

  const errorListener = await SpeechRecognition.addListener('error', (event) => {
    if (done) return;
    done = true;
    cleanup();
    options.callbacks.onError?.(event);
  });

  listeners.push(partialListener, stateListener, errorListener);

  await SpeechRecognition.start({
    language: options.language,
    maxResults: 1,
    partialResults: true,
    popup: false,
    allowForSilence: 2000,
  });

  return {
    stop: async () => {
      done = true;
      cleanup();
      try { await SpeechRecognition.stop(); } catch {}
    },
  };
}

/**
 * Native wake-word loop: keeps a speech-recognition session alive, restarts it
 * whenever it ends or errors, and fires onWake when the transcript contains "jab".
 */
export async function startWakeLoop(options: {
  language: string;
  onWake: (text: string) => void;
  onError: () => void;
}): Promise<NativeSpeechHandle> {
  const { SpeechRecognition } = await import('@capgo/capacitor-speech-recognition');
  const { available } = await SpeechRecognition.available();
  if (!available) throw new Error('Speech recognition is not available on this device');

  const perm = await SpeechRecognition.checkPermissions();
  if (perm.speechRecognition !== 'granted') {
    const res = await SpeechRecognition.requestPermissions();
    if (res.speechRecognition !== 'granted') throw new Error('Speech recognition permission denied');
  }

  let stopped = false;
  let sessionActive = false;
  let isStarting = false;
  let restartTimer: ReturnType<typeof setTimeout> | null = null;
  let failures = 0;
  const MAX_FAILURES = 5;
  const listeners: { remove: () => void }[] = [];

  const clearTimer = () => {
    if (restartTimer) { clearTimeout(restartTimer); restartTimer = null; }
  };

  const scheduleRestart = () => {
    if (stopped || isStarting || sessionActive) return;
    if (failures >= MAX_FAILURES) {
      stopped = true;
      options.onError();
      return;
    }
    clearTimer();
    restartTimer = setTimeout(() => { void startSession(); }, 500);
  };

  const startSession = async () => {
    if (stopped || isStarting || sessionActive) return;
    isStarting = true;
    try {
      await SpeechRecognition.start({
        language: options.language,
        maxResults: 1,
        partialResults: true,
        popup: false,
      });
      sessionActive = true;
      failures = 0;
    } catch {
      failures++;
    } finally {
      isStarting = false;
    }
    if (!sessionActive && !stopped) {
      scheduleRestart();
    }
  };

  const partialListener = await SpeechRecognition.addListener('partialResults', (event) => {
    if (stopped) return;
    const text = event.matches?.[0] || event.accumulatedText || '';
    if (text && WAKE_PATTERN.test(text.trim())) {
      failures = 0;
      try { SpeechRecognition.stop().catch(() => {}); } catch {}
      options.onWake(text);
    }
  });

  const stateListener = await SpeechRecognition.addListener('listeningState', (event) => {
    if (stopped) return;
    if (event.state === 'stopped') {
      sessionActive = false;
      failures = 0;
      scheduleRestart();
    }
  });

  const errorListener = await SpeechRecognition.addListener('error', () => {
    if (stopped) return;
    sessionActive = false;
    failures++;
    scheduleRestart();
  });

  const readyListener = await SpeechRecognition.addListener('readyForNextSession', () => {
    if (stopped) return;
    sessionActive = false;
    scheduleRestart();
  });

  listeners.push(partialListener, stateListener, errorListener, readyListener);

  await startSession();

  return {
    stop: async () => {
      stopped = true;
      clearTimer();
      listeners.forEach((l) => { try { l.remove(); } catch {} });
      listeners.length = 0;
      try { await SpeechRecognition.stop(); } catch {}
      try { await SpeechRecognition.removeAllListeners(); } catch {}
    },
  };
}
