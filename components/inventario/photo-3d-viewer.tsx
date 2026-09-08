'use client';

import { useState, useRef, useEffect } from 'react';
import { X, RotateCcw } from 'lucide-react';

interface Photo3DViewerProps {
  photos: { url: string; label: string }[];
  onClose: () => void;
}

export function Photo3DViewer({ photos, onClose }: Photo3DViewerProps) {
  const [rotateY, setRotateY] = useState(0);
  const [rotateX, setRotateX] = useState(-20);
  const [autoRotate, setAutoRotate] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const animRef = useRef<number>(0);

  const frontal = photos.find(p => p.label === 'Frontal')?.url || '';
  const trasero = photos.find(p => p.label === 'Trasero')?.url || '';
  const der = photos.find(p => p.label.includes('Der'))?.url || '';
  const izq = photos.find(p => p.label.includes('Izq'))?.url || '';

  const faces = [frontal, der, trasero, izq];

  useEffect(() => {
    if (!autoRotate || isDragging) return;
    const tick = () => {
      setRotateY(prev => prev + 0.3);
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [autoRotate, isDragging]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setAutoRotate(false);
    lastPos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setRotateY(prev => prev + dx * 0.8);
    setRotateX(prev => Math.max(-60, Math.min(60, prev - dy * 0.5)));
  };

  const handlePointerUp = () => setIsDragging(false);

  const resetView = () => {
    setRotateX(-20);
    setRotateY(0);
    setAutoRotate(true);
  };

  const faceWidth = 240;
  const faceHeight = 320;
  const radius = faceWidth / (2 * Math.tan(Math.PI / 4));

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90" onClick={onClose}>
      {/* Header */}
      <div className="absolute top-4 left-0 right-0 flex items-center justify-center gap-3 z-10">
        <span className="text-white/60 text-sm font-medium">Vista 3D — Arrastra para girar</span>
      </div>
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <button onClick={(e) => { e.stopPropagation(); resetView(); }}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition">
          <RotateCcw className="h-4 w-4" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 3D Cylindrical Viewer */}
      <div
        className="cursor-grab active:cursor-grabbing select-none"
        style={{ perspective: '900px', width: faceWidth + 80, height: faceHeight + 80 }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={(e) => {
          e.stopPropagation();
          setAutoRotate(false);
          setRotateX(prev => Math.max(-60, Math.min(60, prev + e.deltaY * 0.1)));
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            width: faceWidth,
            height: faceHeight,
            margin: '40px',
            position: 'relative',
            transformStyle: 'preserve-3d',
            transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
            transition: isDragging ? 'none' : 'transform 0.1s linear',
          }}
        >
          {faces.map((url, i) => {
            const angle = (i * 360) / 4;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  width: faceWidth,
                  height: faceHeight,
                  backfaceVisibility: 'hidden',
                  transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
                  overflow: 'hidden',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  boxShadow: 'inset 0 0 20px rgba(0,0,0,0.3)',
                }}
              >
                {url ? (
                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white/30 text-sm">
                    Sin foto
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Angle indicator */}
      <div className="absolute bottom-8 text-white/50 text-xs z-10 font-mono">
        Ángulo: {Math.round(((rotateY % 360) + 360) % 360)}°
      </div>
      <div className="absolute bottom-14 text-white/30 text-xs z-10">
        Scroll para inclinar · Arrastra para rotar
      </div>
    </div>
  );
}
