'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, RotateCcw, Loader2 } from 'lucide-react';
import { removeBackground } from '@/lib/remove-bg';

interface Photo3DViewerProps {
  photos: { url: string; label: string }[];
  onClose: () => void;
}

export function Photo3DViewer({ photos, onClose }: Photo3DViewerProps) {
  const [processing, setProcessing] = useState(true);
  const [compositeUrl, setCompositeUrl] = useState('');
  const [perspective, setPerspective] = useState(0.45);
  const [isDragging, setIsDragging] = useState(false);
  const lastX = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frontalRef = useRef<HTMLImageElement | null>(null);
  const lateralRef = useRef<HTMLImageElement | null>(null);
  const animRef = useRef<number>(0);

  const frontal = photos.find(p => p.label === 'Frontal')?.url || '';
  const der = photos.find(p => p.label.includes('Der'))?.url || '';

  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  useEffect(() => {
    if (!frontal || !der) { setProcessing(false); return; }

    let cancelled = false;
    (async () => {
      try {
        setProcessing(true);
        const [fRaw, lRaw] = await Promise.all([
          loadImage(frontal),
          loadImage(der),
        ]);

        const [fN, lN] = await Promise.all([
          removeBackground(fRaw.src),
          removeBackground(lRaw.src),
        ]);

        if (cancelled) return;
        const [fImg, lImg] = await Promise.all([loadImage(fN), loadImage(lN)]);
        frontalRef.current = fImg;
        lateralRef.current = lImg;
        buildComposite(fImg, lImg, perspective);
        setProcessing(false);
      } catch {
        if (!cancelled) setProcessing(false);
      }
    })();
    return () => { cancelled = true; };
  }, [frontal, der]);

  useEffect(() => {
    if (frontalRef.current && lateralRef.current && !processing) {
      buildComposite(frontalRef.current, lateralRef.current, perspective);
    }
  }, [perspective]);

  const buildComposite = useCallback((fImg: HTMLImageElement, lImg: HTMLImageElement, persp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Scale images to fit
    const maxH = 400;
    const fScale = Math.min(1, maxH / fImg.height);
    const fW = Math.round(fImg.width * fScale);
    const fH = Math.round(fImg.height * fScale);

    const lScale = fH / lImg.height;
    const lW = Math.round(lImg.width * lScale);
    const lH = fH;

    // Perspective deformation
    const depth = Math.round(lW * persp);
    const elev = Math.round(fH * 0.06);

    const canvasW = fW + depth + 40;
    const canvasH = fH + elev * 2 + 20;
    canvas.width = canvasW;
    canvas.height = canvasH;

    ctx.clearRect(0, 0, canvasW, canvasH);

    // Draw lateral with perspective transform using Canvas matrix
    ctx.save();
    // Map source corners to destination (perspective skew)
    // Source: (0,0) (lW,0) (lW,lH) (0,lH)
    // Dest:   (fW-4, elev) (fW+depth, elev*2) (fW+depth, fH-elev) (fW-4, fH)
    const sx = [0, lW, lW, 0];
    const sy = [0, 0, lH, lH];
    const dx = [fW - 4, fW + depth, fW + depth, fW - 4];
    const dy = [elev, elev * 2, fH - elev, fH];

    // Bilinear interpolation: draw lateral row by row with perspective
    drawPerspectiveImage(ctx, lImg, sx, sy, dx, dy, canvasW, canvasH);
    ctx.restore();

    // Draw frontal on top
    ctx.drawImage(fImg, 0, elev, fW, fH);

    setCompositeUrl(canvas.toDataURL('image/png'));
  }, []);

  // Manual perspective warp using scanlines (no WebGL needed)
  function drawPerspectiveImage(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    sx: number[], sy: number[],
    dx: number[], dy: number[],
    _cw: number, _ch: number
  ) {
    const imgCanvas = document.createElement('canvas');
    imgCanvas.width = img.width;
    imgCanvas.height = img.height;
    const imgCtx = imgCanvas.getContext('2d')!;
    imgCtx.drawImage(img, 0, 0);
    const srcData = imgCtx.getImageData(0, 0, img.width, img.height);

    // For each row in destination
    const minY = Math.min(...dy);
    const maxY = Math.max(...dy);

    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      // Interpolate left and right x bounds at this y
      const xL = lerp4(sx[0], sx[3], sy[0], sy[3], y);
      const xR = lerp4(sx[1], sx[2], sy[1], sy[2], y);
      const rowW = Math.ceil(xR - xL);
      if (rowW <= 0) continue;

      // Source row
      const srcY = Math.round(lerp4(0, img.height, Math.min(sy[0], sy[3]), Math.max(sy[0], sy[3]), y));
      const clampedSrcY = Math.max(0, Math.min(img.height - 1, srcY));

      // Draw this row scaled
      for (let x = 0; x < rowW; x++) {
        const srcX = Math.round((x / rowW) * img.width);
        const clampedSrcX = Math.max(0, Math.min(img.width - 1, srcX));
        const si = (clampedSrcY * img.width + clampedSrcX) * 4;

        const r = srcData.data[si];
        const g = srcData.data[si + 1];
        const b = srcData.data[si + 2];
        const a = srcData.data[si + 3];

        if (a > 10) {
          ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
          ctx.fillRect(xL + x, y, 1, 1);
        }
      }
    }
  }

  function lerp4(x1: number, x2: number, y1: number, y2: number, y: number): number {
    if (y2 === y1) return x1;
    return x1 + ((y - y1) / (y2 - y1)) * (x2 - x1);
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    lastX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastX.current;
    lastX.current = e.clientX;
    setPerspective(prev => Math.max(0.1, Math.min(0.8, prev + dx * 0.002)));
  };

  const handlePointerUp = () => setIsDragging(false);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90" onClick={onClose}>
      <div className="absolute top-4 left-0 right-0 flex items-center justify-center gap-3 z-10">
        <span className="text-white/60 text-sm font-medium">Vista 3D — Arrastra para rotar</span>
      </div>
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <button onClick={(e) => { e.stopPropagation(); setPerspective(0.45); }}
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
          <div className="text-white/40 text-sm">No hay suficientes fotos (necesita Frontal + Lateral Derecho)</div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="absolute bottom-8 text-white/50 text-xs z-10 font-mono">
        Perspectiva: {Math.round(perspective * 100)}%
      </div>
      <div className="absolute bottom-14 text-white/30 text-xs z-10">
        ← Arrastra para ajustar profundidad →
      </div>
    </div>
  );
}
