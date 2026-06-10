'use client';

import { useRef, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SignaturePadProps {
  value: string;
  onChange: (dataUrl: string) => void;
  label?: string;
  disabled?: boolean;
}

export function SignaturePad({ value, onChange, label, disabled }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const hasDrawnRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If value provided externally and we haven't drawn yet, render it
    if (value && !hasDrawnRef.current) {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, 0, 0); hasDrawnRef.current = true; };
      img.src = value;
    }
  }, [value]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getPos = (e: MouseEvent | Touch) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const startDraw = (x: number, y: number) => {
      if (disabled) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      isDrawingRef.current = true;
      hasDrawnRef.current = true;
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const moveDraw = (x: number, y: number) => {
      if (!isDrawingRef.current || disabled) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#000';
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const endDraw = () => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      onChange(canvas.toDataURL('image/png'));
    };

    const onMouseDown = (e: MouseEvent) => { const p = getPos(e); startDraw(p.x, p.y); };
    const onMouseMove = (e: MouseEvent) => { const p = getPos(e); moveDraw(p.x, p.y); };
    const onMouseUp = () => endDraw();
    const onMouseLeave = () => { if (isDrawingRef.current) endDraw(); };

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseLeave);

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [disabled, onChange]);

  // Touch events in a separate effect to avoid mixing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getPos = (e: Touch) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onTouchStart = (e: TouchEvent) => {
      if (disabled) return;
      e.preventDefault();
      const t = e.touches[0];
      const p = getPos(t);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      isDrawingRef.current = true;
      hasDrawnRef.current = true;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDrawingRef.current || disabled) return;
      e.preventDefault();
      const t = e.touches[0];
      const p = getPos(t);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#000';
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      onChange(canvas.toDataURL('image/png'));
    };

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [disabled, onChange]);

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawnRef.current = false;
    isDrawingRef.current = false;
    onChange('');
  };

  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-medium text-primary">{label}</label>}
      <div className="relative rounded-lg border-2 border-border bg-white overflow-hidden w-full max-w-md" style={{ height: 160 }}>
        <canvas
          ref={canvasRef}
          width={500}
          height={160}
          className={`w-full h-full ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-crosshair'}`}
          style={{ touchAction: 'none' }}
        />
        {!value && !hasDrawnRef.current && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <span className="text-sm text-gray-400">Firme aquí</span>
          </div>
        )}
      </div>
      {!disabled && (
        <Button variant="ghost" size="sm" onClick={handleClear} className="text-destructive h-7">
          <Trash2 className="mr-1 h-3 w-3" />
          Limpiar firma
        </Button>
      )}
    </div>
  );
}
