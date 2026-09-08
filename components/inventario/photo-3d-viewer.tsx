'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, RotateCcw, Loader2, Download } from 'lucide-react';
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

// Bilinear sample from ImageData
function sampleBilinear(
  data: Uint8ClampedArray, w: number, h: number,
  u: number, v: number
): [number, number, number, number] {
  const x = u * (w - 1);
  const y = v * (h - 1);
  const x0 = Math.floor(x), x1 = Math.min(x0 + 1, w - 1);
  const y0 = Math.floor(y), y1 = Math.min(y0 + 1, h - 1);
  const fx = x - x0, fy = y - y0;

  const i00 = (y0 * w + x0) * 4;
  const i10 = (y0 * w + x1) * 4;
  const i01 = (y1 * w + x0) * 4;
  const i11 = (y1 * w + x1) * 4;

  const r = data[i00] * (1 - fx) * (1 - fy) + data[i10] * fx * (1 - fy) +
            data[i01] * (1 - fx) * fy + data[i11] * fx * fy;
  const g = data[i00 + 1] * (1 - fx) * (1 - fy) + data[i10 + 1] * fx * (1 - fy) +
            data[i01 + 1] * (1 - fx) * fy + data[i11 + 1] * fx * fy;
  const b = data[i00 + 2] * (1 - fx) * (1 - fy) + data[i10 + 2] * fx * (1 - fy) +
            data[i01 + 2] * (1 - fx) * fy + data[i11 + 2] * fx * fy;
  const a = data[i00 + 3] * (1 - fx) * (1 - fy) + data[i10 + 3] * fx * (1 - fy) +
            data[i01 + 3] * (1 - fx) * fy + data[i11 + 3] * fx * fy;

  return [r, g, b, a];
}

// PIL Image.QUAD: map source image onto a destination quadrilateral
// Uses horizontal strips with bilinear sampling for quality + speed
function quadWarp(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dst: [[number, number], [number, number], [number, number], [number, number]],
  canvasW: number, canvasH: number,
) {
  const [tl, tr, br, bl] = dst;

  // Read source pixels
  const tmp = document.createElement('canvas');
  tmp.width = img.width;
  tmp.height = img.height;
  const tmpCtx = tmp.getContext('2d')!;
  tmpCtx.drawImage(img, 0, 0);
  const srcData = tmpCtx.getImageData(0, 0, img.width, img.height);

  // Output pixel buffer
  const out = ctx.createImageData(canvasW, canvasH);
  const od = out.data;

  const minY = Math.floor(Math.min(tl[1], tr[1], br[1], bl[1]));
  const maxY = Math.ceil(Math.max(tl[1], tr[1], br[1], bl[1]));

  // Draw in horizontal strips of 2px for speed
  const STRIP = 2;
  for (let y = minY; y <= maxY; y += STRIP) {
    const yEnd = Math.min(y + STRIP, maxY + 1);

    // Left edge interpolation (tl → bl)
    const tLy = (y - tl[1]) / (bl[1] - tl[1] || 1);
    const tRy = (y - tr[1]) / (br[1] - tr[1] || 1);
    const lx = tl[0] + (bl[0] - tl[0]) * tLy;
    const rx = tr[0] + (br[0] - tr[0]) * tRy;

    const xStart = Math.floor(Math.min(lx, rx));
    const xEnd = Math.ceil(Math.max(lx, rx));
    if (xEnd <= xStart) continue;

    for (let yy = y; yy < yEnd; yy++) {
      const tLy2 = (yy - tl[1]) / (bl[1] - tl[1] || 1);
      const lx2 = tl[0] + (bl[0] - tl[0]) * tLy2;
      const rx2 = tr[0] + (br[0] - tr[0]) * ((yy - tr[1]) / (br[1] - tr[1] || 1));
      const xS = Math.floor(Math.min(lx2, rx2));
      const xE = Math.ceil(Math.max(lx2, rx2));
      const rw = xE - xS;
      if (rw <= 0 || yy < 0 || yy >= canvasH) continue;

      const fy = tLy2; // vertical parameter [0,1]

      for (let x = xS; x < xE; x++) {
        const fx = (x - lx2) / (rx2 - lx2 || 1);
        const [r, g, b, a] = sampleBilinear(srcData.data, img.width, img.height, fx, fy);

        if (a > 5 && x >= 0 && x < canvasW) {
          const di = (yy * canvasW + x) * 4;
          const srcA = a / 255;
          const dstA = od[di + 3] / 255;
          const outA = srcA + dstA * (1 - srcA);
          if (outA > 0) {
            od[di]     = (r * srcA + od[di]     * dstA * (1 - srcA)) / outA;
            od[di + 1] = (g * srcA + od[di + 1] * dstA * (1 - srcA)) / outA;
            od[di + 2] = (b * srcA + od[di + 2] * dstA * (1 - srcA)) / outA;
            od[di + 3] = outA * 255;
          }
        }
      }
    }
  }

  ctx.putImageData(out, 0, 0);
}

export function Photo3DViewer({ photos, onClose }: Photo3DViewerProps) {
  const [processing, setProcessing] = useState(true);
  const [compositeUrl, setCompositeUrl] = useState('');
  const [skew, setSkew] = useState(40);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState('');
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
      setProgress('Quitando fondo frontal...');
      const fN = await removeBackground(frontal);
      if (cancelled) return;
      setProgress('Quitando fondo lateral...');
      const lN = await removeBackground(der);
      if (cancelled) return;
      setProgress('Generando vista 3D...');
      const [f, l] = await Promise.all([loadImage(fN), loadImage(lN)]);
      if (!cancelled) {
        imgsRef.current = { f, l };
        render(f, l, skew);
        setProcessing(false);
        setProgress('');
      }
    })();
    return () => { cancelled = true; };
  }, [frontal, der]);

  useEffect(() => {
    if (imgsRef.current && !processing) {
      render(imgsRef.current.f, imgsRef.current.l, skew);
    }
  }, [skew]);

  const render = useCallback((fImg: HTMLImageElement, lImg: HTMLImageElement, sk: number) => {
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

    const depth = Math.round(lW * (sk / 100) * 0.8);
    const lateralShrink = Math.round(lW * (sk / 100) * 0.35);

    const canvasW = fW + depth + 60;
    const canvasH = fH + 60;
    canvas.width = canvasW;
    canvas.height = canvasH;

    ctx.clearRect(0, 0, canvasW, canvasH);

    // Lateral QUAD: trapezoid perspective (narrower at the back)
    const latDst: [[number, number], [number, number], [number, number], [number, number]] = [
      [fW - 2, 20],                                        // top-left
      [fW + depth, 20 + lateralShrink * 0.4],              // top-right
      [fW + depth, 20 + fH - lateralShrink * 0.15],       // bottom-right
      [fW - 2, 20 + fH],                                   // bottom-left
    ];
    quadWarp(ctx, lImg, latDst, canvasW, canvasH);

    // Frontal on top
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
    setSkew(prev => Math.max(10, Math.min(80, prev + dx * 0.4)));
  };

  const handlePointerUp = () => setIsDragging(false);

  const handleDownload = () => {
    if (!compositeUrl) return;
    const a = document.createElement('a');
    a.href = compositeUrl;
    a.download = 'vista-3d.png';
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90" onClick={onClose}>
      <div className="absolute top-4 left-0 right-0 flex items-center justify-center gap-3 z-10">
        <span className="text-white/60 text-sm font-medium">Vista 3D — Arrastra para ajustar</span>
      </div>
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <button onClick={(e) => { e.stopPropagation(); setSkew(40); }}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition">
          <RotateCcw className="h-4 w-4" />
        </button>
        {compositeUrl && (
          <button onClick={(e) => { e.stopPropagation(); handleDownload(); }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition">
            <Download className="h-4 w-4" />
          </button>
        )}
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
            <span className="text-sm">{progress || 'Procesando...'}</span>
          </div>
        ) : compositeUrl ? (
          <img src={compositeUrl} alt="Vista 3D" className="max-w-[90vw] max-h-[80vh] object-contain drop-shadow-2xl" />
        ) : (
          <div className="text-white/40 text-sm">Necesita Frontal + Lateral Derecho</div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="absolute bottom-8 text-white/50 text-xs z-10 font-mono">
        Profundidad: {skew}%
      </div>
    </div>
  );
}
