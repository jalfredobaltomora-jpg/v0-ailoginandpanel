'use client';

import { detectPlatform } from './device-api';

export interface SpeakTextOptions {
  text: string;
  lang: string;
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: (ok: boolean) => void;
}

export async function speakText(options: SpeakTextOptions): Promise<void> {
  const { text, lang, rate = 1.1, pitch = 0.9, onStart, onEnd } = options;
  const cleanText = text
    .replace(/\bJAB\b/gi, 'Jab')
    .replace(/\p{Emoji}\s*/gu, '')
    .trim();
  if (!cleanText) {
    onEnd?.(true);
    return;
  }

  if (detectPlatform() === 'capacitor') {
    onStart?.();
    try {
      const { TextToSpeech } = await import('@capacitor-community/text-to-speech');
      await TextToSpeech.speak({
        text: cleanText,
        lang,
        rate,
        pitch,
        volume: 1.0,
      });
      onEnd?.(true);
    } catch {
      onEnd?.(false);
    }
    return;
  }

  if (!window.speechSynthesis) {
    onEnd?.(true);
    return;
  }
  onStart?.();
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = lang;
  utterance.rate = rate;
  utterance.pitch = pitch;
  let finished = false;
  const finish = (ok: boolean) => {
    if (finished) return;
    finished = true;
    onEnd?.(ok);
  };
  utterance.onstart = () => onStart?.();
  utterance.onend = () => finish(true);
  utterance.onerror = () => finish(false);
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export async function stopSpeech(): Promise<void> {
  try {
    if (detectPlatform() === 'capacitor') {
      const { TextToSpeech } = await import('@capacitor-community/text-to-speech');
      await TextToSpeech.stop();
    } else if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  } catch {}
}
