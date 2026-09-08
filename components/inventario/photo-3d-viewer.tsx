'use client';

import { useState, useRef, useEffect } from 'react';
import { X, RotateCcw } from 'lucide-react';

interface Photo3DViewerProps {
  photos: { url: string; label: string }[];
  onClose: () => void;
}

export function Photo3DViewer({ photos, onClose }: Photo3DViewerProps) {
  const [rotateX, setRotateX] = useState(-15);
  const [rotateY, setRotateY] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const animRef = useRef<number>(0);

  const frontal = photos.find(p => p.label === 'Frontal')?.url || '';
  const trasero = photos.find(p => p.label === 'Trasero')?.url || '';
  const der = photos.find(p => p.label.includes('Der'))?.url || '';
  const izq = photos.find(p => p.label.includes('Izq'))?.url || '';

  useEffect(() => {
    if (!autoRotate || isDragging) return;
    const tick = () => {
      setRotateY(prev => prev + 0.4);
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
    setRotateY(prev => prev + dx * 0.6);
    setRotateX(prev => Math.max(-60, Math.min(60, prev - dy * 0.6)));
  };

  const handlePointerUp = () => setIsDragging(false);

  const resetView = () => {
    setRotateX(-15);
    setRotateY(0);
    setAutoRotate(true);
  };

  const size = 280;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90" onClick={onClose}>
      {/* Header */}
      <div className="absolute top-4 left-0 right-0 flex items-center justify-center gap-3 z-10">
        <span className="text-white/60 text-sm font-medium">Vista 3D del Equipo</span>
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

      {/* Hint */}
      <div className="absolute bottom-8 text-white/40 text-xs z-10">
        Arrastra para girar • Scroll para inclinar
      </div>

      {/* 3D Scene */}
      <div
        className="cursor-grab active:cursor-grabbing select-none"
        style={{ perspective: '1000px', width: size + 40, height: size + 40 }}
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
          className="relative"
          style={{
            width: size,
            height: size,
            margin: '20px',
            transformStyle: 'preserve-3d',
            transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
            transition: isDragging ? 'none' : 'transform 0.08s linear',
          }}
        >
          {/* Front */}
          <div className="absolute inset-0 rounded-xl overflow-hidden border border-white/20"
            style={{ transform: `translateZ(${size / 2}px)`, backfaceVisibility: 'hidden' }}>
            {frontal ? <img src={frontal} className="w-full h-full object-cover" alt="Frontal" /> :
              <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white/30 text-sm">Frontal</div>}
          </div>

          {/* Back */}
          <div className="absolute inset-0 rounded-xl overflow-hidden border border-white/20"
            style={{ transform: `rotateY(180deg) translateZ(${size / 2}px)`, backfaceVisibility: 'hidden' }}>
            {trasero ? <img src={trasero} className="w-full h-full object-cover" alt="Trasero" /> :
              <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white/30 text-sm">Trasero</div>}
          </div>

          {/* Right */}
          <div className="absolute inset-0 rounded-xl overflow-hidden border border-white/20"
            style={{ transform: `rotateY(90deg) translateZ(${size / 2}px)`, backfaceVisibility: 'hidden' }}>
            {der ? <img src={der} className="w-full h-full object-cover" alt="Lateral Derecho" /> :
              <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white/30 text-sm">Lateral Der.</div>}
          </div>

          {/* Left */}
          <div className="absolute inset-0 rounded-xl overflow-hidden border border-white/20"
            style={{ transform: `rotateY(-90deg) translateZ(${size / 2}px)`, backfaceVisibility: 'hidden' }}>
            {izq ? <img src={izq} className="w-full h-full object-cover" alt="Lateral Izquierdo" /> :
              <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white/30 text-sm">Lateral Izq.</div>}
          </div>

          {/* Top */}
          <div className="absolute inset-0 rounded-xl overflow-hidden border border-white/20"
            style={{ transform: `rotateX(90deg) translateZ(${size / 2}px)`, backfaceVisibility: 'hidden' }}>
            <div className="w-full h-full bg-gradient-to-b from-slate-700 to-slate-800" />
          </div>

          {/* Bottom */}
          <div className="absolute inset-0 rounded-xl overflow-hidden border border-white/20"
            style={{ transform: `rotateX(-90deg) translateZ(${size / 2}px)`, backfaceVisibility: 'hidden' }}>
            <div className="w-full h-full bg-gradient-to-t from-slate-700 to-slate-800" />
          </div>
        </div>
      </div>

      {/* Angle indicator */}
      <div className="absolute bottom-14 text-white/50 text-xs z-10 font-mono">
        X: {Math.round(rotateX)}°  Y: {Math.round(rotateY % 360)}°
      </div>
    </div>
  );
}
