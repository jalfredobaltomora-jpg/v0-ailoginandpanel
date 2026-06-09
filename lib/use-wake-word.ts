'use client';

import { useEffect, useRef, useCallback } from 'react';
import { transcribeAudio } from './transcribe-client';

interface UseWakeWordOptions {
  enabled: boolean;
  onWake: (text: string) => void;
  onListeningChange?: (listening: boolean) => void;
}

export function useWakeWord({ enabled, onWake, onListeningChange }: UseWakeWordOptions) {
  const activeRef = useRef(false);
  const recogRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const retryRef = useRef(0);

  const stopListening = useCallback(() => {
    activeRef.current = false;
    retryRef.current = 0;
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (recogRef.current) {
      try { recogRef.current.abort(); } catch {}
      recogRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    onListeningChange?.(false);
  }, [onListeningChange]);

  const startListening = useCallback(() => {
    if (!enabled || activeRef.current) return;
    activeRef.current = true;
    retryRef.current = 0;
    onListeningChange?.(true);

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const MAX_RETRIES = 3;

    if (SR) {
      // Use native SpeechRecognition (works on Android WebView with Google Play Services)
      let micFailureCount = 0;
      const tryStart = () => {
        if (!activeRef.current) return;
        if (micFailureCount >= MAX_RETRIES) {
          activeRef.current = false;
          onListeningChange?.(false);
          return;
        }
        try {
          const r = new SR();
          recogRef.current = r;
          r.lang = 'es-CO';
          r.continuous = true;
          r.interimResults = false;

          r.onstart = () => {
            micFailureCount = 0;
            retryRef.current = 0;
          };

          r.onresult = (event: any) => {
            if (!activeRef.current) return;
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const text = event.results[i][0].transcript;
              if (/\bjabe?\b/i.test(text.trim())) {
                onWake(text);
              }
            }
          };

          r.onerror = () => {
            if (!activeRef.current) return;
            recogRef.current = null;
            micFailureCount++;
            if (micFailureCount < MAX_RETRIES) {
              timerRef.current = setTimeout(tryStart, 3000);
            } else {
              activeRef.current = false;
              onListeningChange?.(false);
            }
          };

          r.onend = () => {
            recogRef.current = null;
            if (activeRef.current && micFailureCount < MAX_RETRIES) {
              timerRef.current = setTimeout(tryStart, 2000);
            }
          };

          r.start();
        } catch {
          recogRef.current = null;
          micFailureCount++;
          if (micFailureCount < MAX_RETRIES) {
            timerRef.current = setTimeout(tryStart, 3000);
          } else {
            activeRef.current = false;
            onListeningChange?.(false);
          }
        }
      };

      tryStart();
    } else {
      // Fallback: MediaRecorder + Groq Whisper
      let micFailureCount = 0;
      const tryStart = async () => {
        if (!activeRef.current) return;
        if (micFailureCount >= MAX_RETRIES) {
          activeRef.current = false;
          onListeningChange?.(false);
          return;
        }
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (!activeRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
          streamRef.current = stream;
          micFailureCount = 0;

          const loop = () => {
            if (!activeRef.current) return;
            const mr = new MediaRecorder(stream);
            const chunks: BlobPart[] = [];
            mr.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
            mr.onstop = async () => {
              if (!activeRef.current) return;
              const blob = new Blob(chunks);
              if (blob.size > 400) {
                try {
                  const text = await transcribeAudio(blob);
                  if (text && /\bjabe?\b/i.test(text.trim())) {
                    onWake(text);
                  }
                } catch {}
              }
              if (activeRef.current) {
                timerRef.current = setTimeout(loop, 200);
              }
            };
            mr.start();
            setTimeout(() => { if (mr.state === 'recording') mr.stop(); }, 3000);
          };
          loop();
        } catch {
          micFailureCount++;
          if (micFailureCount < MAX_RETRIES) {
            timerRef.current = setTimeout(tryStart, 5000);
          } else {
            activeRef.current = false;
            onListeningChange?.(false);
          }
        }
      };

      tryStart();
    }
  }, [enabled, onWake, onListeningChange]);

  useEffect(() => {
    if (enabled) {
      const timer = setTimeout(startListening, 1000);
      return () => { clearTimeout(timer); stopListening(); };
    } else {
      stopListening();
    }
  }, [enabled, startListening, stopListening]);

  return { stopListening };
}
