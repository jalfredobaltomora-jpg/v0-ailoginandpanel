'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Play, Pause, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AudioRecorderProps {
  onCapture: (blob: Blob, duration: number) => void;
}

export function AudioRecorder({ onCapture }: AudioRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const blobUrlRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
        cleanup();
      };

      recorder.start();
      setRecording(true);
      setDuration(0);
      setRecordedBlob(null);

      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } catch {
      // Permission denied
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const playAudio = () => {
    if (!recordedBlob) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); }
    const url = URL.createObjectURL(recordedBlob);
    blobUrlRef.current = url;
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onloadedmetadata = () => {
      audio.play();
      setPlaying(true);
      setCurrentTime(0);
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.onended = () => {
      setPlaying(false);
      setCurrentTime(0);
    };
  };

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
    setPlaying(false);
    setCurrentTime(0);
  };

  const sendAudio = () => {
    if (recordedBlob) {
      onCapture(recordedBlob, duration);
      setRecordedBlob(null);
      setDuration(0);
    }
  };

  const discardAudio = () => {
    if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
    setRecordedBlob(null);
    setDuration(0);
    setPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (recording) {
    return (
      <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950/30 rounded-lg">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
          </span>
          <span className="text-xs font-medium text-red-600 dark:text-red-400">
            {formatTime(duration)}
          </span>
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 ml-auto" onClick={stopRecording}>
          <Square className="h-3.5 w-3.5 fill-red-500 text-red-500" />
        </Button>
      </div>
    );
  }

  if (recordedBlob) {
    const progress = audioRef.current?.duration
      ? (currentTime / audioRef.current.duration) * 100
      : 0;
    return (
      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={playing ? stopPlayback : playAudio}>
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </Button>
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-[10px] text-muted-foreground w-8 text-right">
          {formatTime(Math.floor(currentTime || duration))}
        </span>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-green-600" onClick={sendAudio}>
          <Loader2 className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={discardAudio}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
      onClick={startRecording}
      title="Grabar audio"
    >
      <Mic className="h-4 w-4" />
    </Button>
  );
}

interface AudioPlayerProps {
  dataUrl: string;
  duration: number;
}

export function AudioPlayer({ dataUrl, duration: initDuration }: AudioPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initDuration || 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
    } else {
      if (audioRef.current) {
        audioRef.current.play();
      } else {
        const audio = new Audio(dataUrl);
        audioRef.current = audio;
        audio.onloadedmetadata = () => setDuration(audio.duration);
        audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
        audio.onended = () => { setPlaying(false); setCurrentTime(0); };
        audio.play();
      }
      setPlaying(true);
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-2 py-1">
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={togglePlay}>
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </Button>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground w-10 text-right">
        {formatSec(Math.floor(currentTime))} / {formatSec(Math.floor(duration))}
      </span>
    </div>
  );
}

function formatSec(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}
