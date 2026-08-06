'use client';

import { useEffect, useRef, useCallback } from 'react';
import { transcribeAudio } from './transcribe-client';
import { isNativeApp } from './native-speech';
import type { VoiceListeningState } from './voice-types';

interface UseWakeWordOptions {
  enabled: boolean;
  onWake: (text: string) => void;
  onListeningChange?: (listening: boolean) => void;
  onState?: (state: VoiceListeningState) => void;
  /** Live audio level 0..1 for waveform UI (web paths only). */
  onLevel?: (level: number) => void;
}

export interface UseWakeWordReturn {
  stopListening: () => void;
  restart: () => void;
  resumeListening: () => void;
}

const MAX_RETRIES = 4;

export function useWakeWord(options: UseWakeWordOptions): UseWakeWordReturn {
  const { enabled, onWake, onListeningChange, onState, onLevel } = options;
  const activeRef = useRef(false);
  const recogRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const vadCtxRef = useRef<AudioContext | null>(null);
  const vadRunningRef = useRef(true);
  const retryRef = useRef(0);
  const nativeLoopRef = useRef<{ stop: () => Promise<void>; resume?: () => Promise<void> } | null>(null);
  const runningRef = useRef(false);
  const cbRef = useRef({ onWake, onListeningChange, onState, onLevel });
  cbRef.current = { onWake, onListeningChange, onState, onLevel };

  const stopListening = useCallback(() => {
    activeRef.current = false;
    retryRef.current = 0;
    runningRef.current = false;
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (recogRef.current) {
      try { recogRef.current.abort(); } catch {}
      recogRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (vadCtxRef.current) {
      try { if (vadCtxRef.current.state !== 'closed') vadCtxRef.current.close(); } catch {}
      vadCtxRef.current = null;
    }
    vadRunningRef.current = false;
    if (nativeLoopRef.current) {
      const loop = nativeLoopRef.current;
      nativeLoopRef.current = null;
      loop.stop().catch(() => {});
    }
    cbRef.current.onListeningChange?.(false);
    cbRef.current.onState?.('stopped');
  }, []);

  /**
   * Reopens the mic after JAB finishes speaking/processing.
   * Native: calls resume() on the loop (single session restart).
   * Web: restarts the same recognizer or the persistent recorder.
   */
  const startListening = useCallback(() => {
    if (!enabled || activeRef.current) return;
    activeRef.current = true;
    retryRef.current = 0;
    cbRef.current.onListeningChange?.(true);

    if (isNativeApp()) {
      // Native Capacitor speech recognition loop (works in the APK webview).
      import('./native-speech')
        .then(({ startWakeLoop }) => startWakeLoop({
          language: 'es-CO',
          onWake: (text) => {
            if (!activeRef.current) return;
            cbRef.current.onWake(text);
          },
          onError: () => {
            if (activeRef.current) {
              activeRef.current = false;
              cbRef.current.onListeningChange?.(false);
              cbRef.current.onState?.('stopped');
            }
          },
          onState: (state) => {
            if (activeRef.current) cbRef.current.onState?.(state);
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
            cbRef.current.onListeningChange?.(false);
            cbRef.current.onState?.('stopped');
          }
        });
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SR) {
      // Native web SpeechRecognition: keep a SINGLE instance with continuous
      // mode so the mic stays open instead of being recreated on every end.
      const tryStart = () => {
        if (!activeRef.current || runningRef.current) return;
        if (retryRef.current >= MAX_RETRIES) {
          activeRef.current = false;
          cbRef.current.onListeningChange?.(false);
          cbRef.current.onState?.('stopped');
          return;
        }
        try {
          const r = new SR();
          recogRef.current = r;
          r.lang = 'es-CO';
          r.continuous = true;
          r.interimResults = false;

          r.onstart = () => {
            runningRef.current = true;
            retryRef.current = 0;
            cbRef.current.onState?.('listening');
          };

          r.onresult = (event: any) => {
            if (!activeRef.current) return;
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const text = event.results[i][0].transcript;
              if (/\bjabe?\b/i.test(text.trim())) {
                cbRef.current.onWake(text);
              }
            }
          };

          r.onerror = () => {
            if (!activeRef.current) return;
            runningRef.current = false;
            recogRef.current = null;
            retryRef.current++;
            if (retryRef.current < MAX_RETRIES) {
              timerRef.current = setTimeout(tryStart, 3000);
            } else {
              activeRef.current = false;
              cbRef.current.onListeningChange?.(false);
              cbRef.current.onState?.('stopped');
            }
          };

          r.onend = () => {
            runningRef.current = false;
            recogRef.current = null;
            if (activeRef.current && retryRef.current < MAX_RETRIES) {
              timerRef.current = setTimeout(tryStart, 2000);
            }
          };

          r.start();
          runningRef.current = true;
        } catch {
          recogRef.current = null;
          runningRef.current = false;
          retryRef.current++;
          if (retryRef.current < MAX_RETRIES) {
            timerRef.current = setTimeout(tryStart, 3000);
          } else {
            activeRef.current = false;
            cbRef.current.onListeningChange?.(false);
            cbRef.current.onState?.('stopped');
          }
        }
      };

      tryStart();
      return;
    }

    // Fallback: persistent MediaRecorder + VAD + Groq Whisper.
    // The MediaStream is acquired ONCE and kept open ("buffer persistente").
    // Only the MediaRecorder stops/restarts around silence, never the stream,
    // so there are no audio pops from reopening the microphone.
    const ensureStream = async (): Promise<MediaStream | null> => {
      if (streamRef.current) return streamRef.current;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!activeRef.current) { stream.getTracks().forEach(t => t.stop()); return null; }
        streamRef.current = stream;
        return stream;
      } catch {
        return null;
      }
    };

    const tryStart = async () => {
      if (!activeRef.current) return;
      if (retryRef.current >= MAX_RETRIES) {
        activeRef.current = false;
        cbRef.current.onListeningChange?.(false);
        cbRef.current.onState?.('stopped');
        return;
      }
      const stream = await ensureStream();
      if (!stream) {
        retryRef.current++;
        timerRef.current = setTimeout(() => { void tryStart(); }, 4000);
        return;
      }
      retryRef.current = 0;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      // VAD once per stream, not per utterance.
      const audioCtx = new AudioContext();
      vadCtxRef.current = audioCtx;
      vadRunningRef.current = true;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const vadLoop = () => {
        if (!vadRunningRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        cbRef.current.onLevel?.(Math.min(1, avg / 128));
        requestAnimationFrame(vadLoop);
      };
      vadLoop();

      const runUtterance = () => {
        if (!activeRef.current || !streamRef.current) return;
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

        const detectSilence = () => {
          if (isStopped || !activeRef.current) return;
          analyser.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          if (avg < 5) {
            if (!silenceTimer) silenceTimer = setTimeout(stopRecording, 1200);
          } else {
            if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
          }
          if (!isStopped) requestAnimationFrame(detectSilence);
        };

        mr.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
        mr.onstop = async () => {
          if (!activeRef.current) return;
          const blob = new Blob(chunks, { type: mimeType });
          if (blob.size > 400) {
            try {
              const text = await transcribeAudio(blob, 'es');
              if (text && /\bjabe?\b/i.test(text.trim())) {
                cbRef.current.onWake(text);
              }
            } catch {}
          }
          // Restart the recorder on the SAME persistent stream (no mic churn).
          if (activeRef.current) {
            timerRef.current = setTimeout(runUtterance, 150);
          }
        };

        mr.start(100);
        detectSilence();
        hardStopTimer = setTimeout(stopRecording, 15000);
      };

      cbRef.current.onState?.('listening');
      runUtterance();
    };

    tryStart();
  }, [enabled]);

  /**
   * Reopens the mic after JAB finishes speaking/processing.
   * Native: calls resume() on the loop (single session restart).
   * Web: restarts the same recognizer or the persistent recorder.
   */
  const resumeListening = useCallback(() => {
    if (!activeRef.current) {
      startListening();
      return;
    }
    if (nativeLoopRef.current?.resume) {
      nativeLoopRef.current.resume().catch(() => {});
      return;
    }
    // Web paths
    if (recogRef.current && !runningRef.current) {
      runningRef.current = true;
      try {
        recogRef.current.start();
        cbRef.current.onState?.('listening');
        cbRef.current.onListeningChange?.(true);
      } catch {
        runningRef.current = false;
      }
      return;
    }
    if (streamRef.current) {
      // Persistent stream path: recorder handles its own restart loop.
      cbRef.current.onState?.('listening');
      cbRef.current.onListeningChange?.(true);
    }
  }, [startListening]);

  useEffect(() => {
    if (enabled) {
      const timer = setTimeout(startListening, 1000);
      return () => { clearTimeout(timer); stopListening(); };
    } else {
      stopListening();
    }
  }, [enabled, startListening, stopListening]);

  return { stopListening, restart: startListening, resumeListening };
}
