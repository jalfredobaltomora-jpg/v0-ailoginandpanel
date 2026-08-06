'use client';

/**
 * Shared voice/agent state machine for JAB.
 *
 * `idle`        – nothing happening, mic can be listening for the wake word
 * `listening`   – mic open, recognizer active (wake word always-on)
 * `ptt`         – push-to-talk recording (user holds the button)
 * `processing`  – JAB is thinking / analyzing data
 * `executing`   – JAB is running a tool/action on screen (navigate, report, ...)
 * `speaking`    – JAB is speaking (TTS), mic intentionally released
 */
export type JABStatus = 'idle' | 'listening' | 'ptt' | 'processing' | 'executing' | 'speaking';

export type VoiceListeningState = 'starting' | 'listening' | 'stopped';

export interface VoiceLevelCallback {
  (level: number): void;
}

export function isActiveStatus(status: JABStatus): boolean {
  return status === 'listening' || status === 'ptt';
}
