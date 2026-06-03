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

  const stopListening = useCallback(() => {
    activeRef.current = false;
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
    onListeningChange?.(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!activeRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = stream;

      const loop = () => {
        if (!activeRef.current) return;
        const mr = new MediaRecorder(stream);
        const chunks: BlobPart[] = [];
        mr.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
        mr.onstop = async () => {
          if (!activeRef.current) return;
          const blob = new Blob(chunks);
          if (blob.size > 400) {
            const text = await transcribeAudio(blob);
            if (text && /\bjabe?\b/i.test(text.trim())) {
              onWake(text);
            }
          }
          if (activeRef.current) {
            timerRef.current = setTimeout(loop, 200);
          }
        };
        mr.start();
        setTimeout(() => { if (mr.state === 'recording') mr.stop(); }, Math.min(intervalMs, 3000));
      };
      loop();
    } catch {
      activeRef.current = false;
      onListeningChange?.(false);
    }
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
