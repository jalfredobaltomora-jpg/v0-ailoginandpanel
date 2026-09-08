'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, RotateCcw, Loader2 } from 'lucide-react';
import { removeBackground } from '@/lib/remove-bg';

interface Photo3DViewerProps {
  photos: { url: string; label: string }[];
  onClose: () => void;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Draw image with perspective warp (trapezoid) onto canvas
function drawPerspective(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number, y: number,
  w: number, h: number,
  shrinkTop: number,   // how much narrower the top is (0-1)
  shrinkBot: number,   // how much narrower the bottom is (0-1)
) {
  const slices = Math.max(1, Math.round(h / 2));
  for (let i = 0; i < slices; i++) {
    const t1 = i / slices;
    const t2 = (i + 1) / slices;
    const midT = (t1 + t2) / 2;

    const wTop = w * (1 - shrinkTop * (1 - t1));
    const wBot = w * (1 - shrinkBot * (1 - t2));
    const wSlice = (wTop + wBot) / 2;

    const xOff = (w - wSlice) / 2;

    const srcY = Math.round(t1 * img.height);
    const srcH = Math.max(1, Math.round((t2 - t1) * img.height));
    const dstY = y + t1 * h;
    const dstH = Math.max(1, Math.ceil((t2 - t1) * h));

    ctx.drawImage(img, 0, srcY, img.width, srcH, x + xOff, dstY, wSlice, dstH);
  }
}

export function Photo3DViewer({ photos, onClose }: Photo3DViewerProps) {
  const [processing, setProcessing] = useState(true);
  const [compositeUrl, setCompositeUrl] = useState('');
  const [depth, setDepth] = useState(45);
  const [isDragging, setIsDragging] = useState(false);
  const lastX = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgsRef = useRef<{ f: HTMLImageElement; l: HTMLImageElement } | null>(null);

  const frontal = photos.find(p => p.label === 'Frontal')?.url || '';
  const der = photos.find(p => p.label.includes('Der'))?.url || '';

  useEffect(() => {
    if (!frontal || !der) { setProcessing(false); return; }
    let cancelled = false;
    (async () => {
      setProcessing(true);
      const [fN, lN] = await Promise.all([removeBackground(frontal), removeBackground(der)]);
      const [f, l] = await Promise.all([loadImage(fN), loadImage(lN)]);
      if (!cancelled) {
        imgsRef.current = { f, l };
        render(f, l, depth);
        setProcessing(false);
      }
    })();
    return () => { cancelled = true; };
  }, [frontal, der]);

  useEffect(() => {
    if (imgsRef.current && !processing) {
      render(imgsRef.current.f, imgsRef.current.l, depth);
    }
  }, [depth]);

  const render = useCallback((fImg: HTMLImageElement, lImg: HTMLImageElement, d: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const maxH = 500;
    const fScale = Math.min(1, maxH / fImg.height);
    const fW = Math.round(fImg.width * fScale);
    const fH = Math.round(fImg.height * fScale);

    const lScale = fH / lImg.height;
    const lW = Math.round(lImg.width * lScale);

    // Depth controls how much the lateral recedes
    const depthPx = Math.round(lW * (d / 100) * 0.8);
    const lateralWidth = Math.round(lW * (d / 100));

    const canvasW = fW + depthPx + 40;
    const canvasH = fH + 40;
    canvas.width = canvasW;
    canvas.height = canvasH;

    ctx.clearRect(0, 0, canvasW, canvasH);

    // 1. Draw lateral with perspective (trapezoid: narrower at the back)
    const latX = fW - 4;
    const latY = 20;
    drawPerspective(ctx, lImg, latX, latY, lateralWidth, fH, 0.45, 0.1);

    // 2. Draw frontal on top
    ctx.drawImage(fImg, 0, 20, fW, fH);

    setCompositeUrl(canvas.toDataURL('image/png'));
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    lastX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastX.current;
    lastX.current = e.clientX;
    setDepth(prev => Math.max(10, Math.min(80, prev + dx * 0.4)));
  };

  const handlePointerUp = () => setIsDragging(false);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90" onClick={onClose}>
      <div className="absolute top-4 left-0 right-0 flex items-center justify-center gap-3 z-10">
        <span className="text-white/60 text-sm font-medium">Vista 3D — Arrastra para ajustar</span>
      </div>
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <button onClick={(e) => { e.stopPropagation(); setDepth(45); }}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition">
          <RotateCcw className="h-4 w-4" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div
        className="cursor-grab active:cursor-grabbing select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={(e) => e.stopPropagation()}
      >
        {processing ? (
          <div className="flex flex-col items-center gap-3 text-white/60">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-sm">Procesando imágenes...</span>
          </div>
        ) : compositeUrl ? (
          <img src={compositeUrl} alt="Vista 3D" className="max-w-[90vw] max-h-[80vh] object-contain drop-shadow-2xl" />
        ) : (
          <div className="text-white/40 text-sm">Necesita Frontal + Lateral Derecho</div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="absolute bottom-8 text-white/50 text-xs z-10 font-mono">
        Profundidad: {depth}%
      </div>
    </div>
  );
}
