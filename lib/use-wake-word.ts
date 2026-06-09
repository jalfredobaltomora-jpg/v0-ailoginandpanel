'use client';

import { useEffect, useRef, useCallback } from 'react';
import { transcribeAudio } from './transcribe-client';

interface UseWakeWordOptions {
  enabled: boolean;
  onWake: (text: string) => void;
  onListeningChange?: (listening: boolean) => void;
  intervalMs?: number;
}

export function useWakeWord({ enabled, onWake, onListeningChange, intervalMs = 4000 }: UseWakeWordOptions) {
  const activeRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);

  const stopListening = useCallback(() => {
    activeRef.current = false;
    retryCountRef.current = 0;
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    onListeningChange?.(false);
  }, [onListeningChange]);

  const startListening = useCallback(async () => {
    if (!enabled || activeRef.current) return;
    activeRef.current = true;
    retryCountRef.current = 0;
    onListeningChange?.(true);

    const tryStart = async () => {
      if (!activeRef.current) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!activeRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        retryCountRef.current = 0;

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
              } catch (e) { console.warn('JAB wake: transcribe error', e); }
            }
            if (activeRef.current) {
              timerRef.current = setTimeout(loop, 200);
            }
          };
          mr.start();
          setTimeout(() => { if (mr.state === 'recording') mr.stop(); }, Math.min(intervalMs, 3000));
        };
        loop();
      } catch (err) {
        console.warn('JAB wake: mic access failed, retrying...', err);
        activeRef.current = false;
        onListeningChange?.(false);
        if (retryCountRef.current < 5) {
          retryCountRef.current++;
          timerRef.current = setTimeout(tryStart, 5000);
        }
      }
    };

    tryStart();
  }, [enabled, intervalMs, onWake, onListeningChange]);

  useEffect(() => {
    if (enabled) {
      const timer = setTimeout(startListening, 2000);
      return () => { clearTimeout(timer); stopListening(); };
    } else {
      stopListening();
    }
  }, [enabled, startListening, stopListening]);

  return { stopListening };
}
