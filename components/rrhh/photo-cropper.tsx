'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, Move, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PhotoCropperProps {
  imageUrl: string;
  onConfirm: (croppedBase64: string) => void;
  onCancel: () => void;
}

const CROP_WIDTH = 300;
const CROP_HEIGHT = 360;

export function PhotoCropper({ imageUrl, onConfirm, onCancel }: PhotoCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      setImgLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const renderPreview = useCallback(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = CROP_WIDTH, h = CROP_HEIGHT;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.max(w / iw, h / ih) * zoom;
    const sw = iw * scale;
    const sh = ih * scale;
    const cx = (w - sw) / 2 + pan.x;
    const cy = (h - sh) / 2 + pan.y;
    ctx.drawImage(img, cx, cy, sw, sh);
  }, [zoom, pan]);

  useEffect(() => {
    if (imgLoaded) renderPreview();
  }, [imgLoaded, renderPreview]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    setDragging(true);
    setDragStart({ x: t.clientX - pan.x, y: t.clientY - pan.y });
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return;
    const t = e.touches[0];
    setPan({ x: t.clientX - dragStart.x, y: t.clientY - dragStart.y });
  };
  const handleTouchEnd = () => setDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(z => Math.max(0.5, Math.min(3, z + delta)));
  };

  const handleConfirm = () => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = CROP_WIDTH, h = CROP_HEIGHT;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.max(w / iw, h / ih) * zoom;
    const sw = iw * scale;
    const sh = ih * scale;
    const cx = (w - sw) / 2 + pan.x;
    const cy = (h - sh) / 2 + pan.y;
    ctx.drawImage(img, cx, cy, sw, sh);

    onConfirm(canvas.toDataURL('image/jpeg', 0.85));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-xl border border-primary/20 bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Move className="h-4 w-4" />
            Ajustar Foto
          </h3>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div
          ref={containerRef}
          className="relative mx-auto mb-4 overflow-hidden rounded-lg border-2 border-primary/30 bg-black cursor-grab active:cursor-grabbing"
          style={{ width: CROP_WIDTH, height: CROP_HEIGHT, maxWidth: '100%', aspectRatio: '3/3.6' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
        >
          <canvas
            ref={canvasRef}
            width={CROP_WIDTH}
            height={CROP_HEIGHT}
            className="pointer-events-none"
            style={{ width: '100%', height: '100%' }}
          />
          {!imgLoaded && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
              Cargando imagen...
            </div>
          )}
        </div>

        <div className="mb-4 flex items-center gap-3 px-2">
          <ZoomOut className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.05"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-full accent-primary"
          />
          <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
        </div>

        <p className="mb-4 text-center text-xs text-muted-foreground">
          Arrastra para mover · Rueda o slider para zoom
        </p>

        <div className="flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
          <Button size="sm" className="bg-primary text-primary-foreground" onClick={handleConfirm}>
            <Check className="mr-1.5 h-4 w-4" />
            Confirmar
          </Button>
        </div>
      </div>
    </div>
  );
}
