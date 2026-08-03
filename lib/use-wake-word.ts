'use client';

import { useEffect, useRef, useCallback } from 'react';
import { transcribeAudio } from './transcribe-client';
import { isNativeApp } from './native-speech';

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
  const nativeLoopRef = useRef<{ stop: () => Promise<void> } | null>(null);

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
    if (nativeLoopRef.current) {
      const loop = nativeLoopRef.current;
      nativeLoopRef.current = null;
      loop.stop().catch(() => {});
    }
    onListeningChange?.(false);
  }, [onListeningChange]);

  const startListening = useCallback(() => {
    if (!enabled || activeRef.current) return;
    activeRef.current = true;
    retryRef.current = 0;
    onListeningChange?.(true);

    if (isNativeApp()) {
      // Native Capacitor speech recognition loop (works in the APK webview)
      import('./native-speech')
        .then(({ startWakeLoop }) => startWakeLoop({
          language: 'es-CO',
          onWake: (text) => {
            if (!activeRef.current) return;
            onWake(text);
          },
          onError: () => {
            if (activeRef.current) {
              activeRef.current = false;
              onListeningChange?.(false);
            }
          },
        }))
        .then((loop) => {
          if (!activeRef.current) {
            loop.stop().catch(() => {});
            return;
          }
          nativeLoopRef.current = loop;
        })
        .catch(() => {
          if (activeRef.current) {
            activeRef.current = false;
            onListeningChange?.(false);
          }
        });
      return;
    }

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
      // Fallback: MediaRecorder + VAD + Groq Whisper (works on Android WebView / Capacitor)
      let micFailureCount = 0;
      let loopTimer: ReturnType<typeof setTimeout> | null = null;
      let vadCleanup: (() => void) | null = null;

      const stopStreamTracks = () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
      };

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

          const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : 'audio/webm';
          const mr = new MediaRecorder(stream, { mimeType });
          const chunks: BlobPart[] = [];
          let isStopped = false;
          let silenceTimer: ReturnType<typeof setTimeout> | null = null;
          let hardStopTimer: ReturnType<typeof setTimeout> | null = null;

          const stopRecording = () => {
            if (isStopped) return;
            isStopped = true;
            if (silenceTimer) clearTimeout(silenceTimer);
            if (hardStopTimer) clearTimeout(hardStopTimer);
            if (mr.state === 'recording') mr.stop();
          };

          // Silence detection via AudioContext (VAD)
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
              if (!silenceTimer) silenceTimer = setTimeout(stopRecording, 1400);
            } else {
              if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
            }
            if (!isStopped) requestAnimationFrame(detectSilence);
          };

          vadCleanup = () => {
            if (audioCtx.state !== 'closed') audioCtx.close().catch(() => {});
          };

          mr.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
          mr.onstop = async () => {
            vadCleanup?.();
            if (!activeRef.current) return;
            const blob = new Blob(chunks, { type: mimeType });
            if (blob.size > 400) {
              try {
                const text = await transcribeAudio(blob, 'es');
                if (text && /\bjabe?\b/i.test(text.trim())) {
                  onWake(text);
                }
              } catch {}
            }
            if (activeRef.current) {
              timerRef.current = setTimeout(tryStart, 150);
            }
          };

          mr.start(100);
          detectSilence();
          // Safety cap: max 15s per utterance
          hardStopTimer = setTimeout(stopRecording, 15000);
        } catch {
          micFailureCount++;
          if (micFailureCount < MAX_RETRIES) {
            timerRef.current = setTimeout(tryStart, 4000);
          } else {
            activeRef.current = false;
            onListeningChange?.(false);
          }
        }
      };

      tryStart();
      loopTimer = null;
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

  return { stopListening, restart: startListening };
}
