'use client';

import { useState, useRef, useEffect } from 'react';
import { X, RotateCcw, Loader2, Download } from 'lucide-react';
import { removeBackground } from '@/lib/remove-bg';

interface Photo3DViewerProps {
  photos: { url: string; label: string }[];
  onClose: () => void;
}

export function Photo3DViewer({ photos, onClose }: Photo3DViewerProps) {
  const [processing, setProcessing] = useState(true);
  const [cleanUrls, setCleanUrls] = useState<Record<string, string>>({});
  const [rotateY, setRotateY] = useState(-25);
  const [rotateX, setRotateX] = useState(-15);
  const [isDragging, setIsDragging] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [progress, setProgress] = useState('');
  const lastPos = useRef({ x: 0, y: 0 });
  const animRef = useRef<number>(0);

  const frontal = photos.find(p => p.label === 'Frontal')?.url || '';
  const trasero = photos.find(p => p.label === 'Trasero')?.url || '';
  const der = photos.find(p => p.label.includes('Der'))?.url || '';
  const izq = photos.find(p => p.label.includes('Izq'))?.url || '';

  const labels: Record<string, string> = {
    Frontal: frontal,
    Trasero: trasero,
    'Lateral Der.': der,
    'Lateral Izq.': izq,
  };

  useEffect(() => {
    const urls = Object.entries(labels).filter(([, url]) => url);
    if (urls.length < 2) { setProcessing(false); return; }

    let cancelled = false;
    (async () => {
      setProcessing(true);
      const result: Record<string, string> = {};

      for (const [label, url] of urls) {
        if (cancelled) return;
        setProgress(`Quitando fondo: ${label}...`);
        result[label] = await removeBackground(url);
      }

      if (!cancelled) {
        setCleanUrls(result);
        setProcessing(false);
        setProgress('');
      }
    })();

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!autoRotate || isDragging) return;
    const tick = () => {
      setRotateY(prev => prev + 0.25);
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
    setRotateY(prev => prev + dx * 0.7);
    setRotateX(prev => Math.max(-60, Math.min(60, prev - dy * 0.5)));
  };

  const handlePointerUp = () => setIsDragging(false);

  const resetView = () => {
    setRotateX(-15);
    setRotateY(-25);
    setAutoRotate(true);
  };

  // Cuboid dimensions (scaled to fit screen)
  const W = 200; // width (frontal face)
  const H = 300; // height
  const D = 60;  // depth (side face)

  const hasFrontal = !!cleanUrls['Frontal'];
  const hasTrasero = !!cleanUrls['Trasero'];
  const hasDer = !!cleanUrls['Lateral Der.'];
  const hasIzq = !!cleanUrls['Lateral Izq.'];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90" onClick={onClose}>
      <div className="absolute top-4 left-0 right-0 flex items-center justify-center z-10">
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

      {processing ? (
        <div className="flex flex-col items-center gap-3 text-white/60">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-sm">{progress || 'Procesando...'}</span>
        </div>
      ) : (
        <div
          className="cursor-grab active:cursor-grabbing select-none"
          style={{ perspective: '1200px' }}
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
              width: W,
              height: H,
              position: 'relative',
              transformStyle: 'preserve-3d',
              transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
              transition: isDragging ? 'none' : 'transform 0.1s linear',
            }}
          >
            {/* Front */}
            <div style={{
              position: 'absolute',
              width: W,
              height: H,
              transform: `translateZ(${D / 2}px)`,
              backfaceVisibility: 'hidden',
              overflow: 'hidden',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              {hasFrontal ? (
                <img src={cleanUrls['Frontal']} alt="Frontal" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white/30 text-xs">Sin frontal</div>
              )}
            </div>

            {/* Back */}
            <div style={{
              position: 'absolute',
              width: W,
              height: H,
              transform: `rotateY(180deg) translateZ(${D / 2}px)`,
              backfaceVisibility: 'hidden',
              overflow: 'hidden',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              {hasTrasero ? (
                <img src={cleanUrls['Trasero']} alt="Trasero" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white/30 text-xs">Sin trasero</div>
              )}
            </div>

            {/* Right */}
            <div style={{
              position: 'absolute',
              width: D,
              height: H,
              transform: `rotateY(90deg) translateZ(${W / 2}px)`,
              backfaceVisibility: 'hidden',
              overflow: 'hidden',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              {hasDer ? (
                <img src={cleanUrls['Lateral Der.']} alt="Lateral Der." style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white/30 text-[8px]">Sin der.</div>
              )}
            </div>

            {/* Left */}
            <div style={{
              position: 'absolute',
              width: D,
              height: H,
              transform: `rotateY(-90deg) translateZ(${W / 2}px)`,
              backfaceVisibility: 'hidden',
              overflow: 'hidden',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              {hasIzq ? (
                <img src={cleanUrls['Lateral Izq.']} alt="Lateral Izq." style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white/30 text-[8px]">Sin izq.</div>
              )}
            </div>

            {/* Top */}
            <div style={{
              position: 'absolute',
              width: W,
              height: D,
              transform: `rotateX(90deg) translateZ(${H / 2}px)`,
              backfaceVisibility: 'hidden',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 8,
            }} />

            {/* Bottom */}
            <div style={{
              position: 'absolute',
              width: W,
              height: D,
              transform: `rotateX(-90deg) translateZ(${H / 2}px)`,
              backfaceVisibility: 'hidden',
              background: 'rgba(0,0,0,0.1)',
              borderRadius: 8,
            }} />
          </div>
        </div>
      )}

      <div className="absolute bottom-16 text-white/40 text-xs z-10">
        {processing ? '' : 'Arrastra para girar • Scroll para inclinar'}
      </div>
      <div className="absolute bottom-8 text-white/50 text-xs z-10 font-mono">
        {processing ? '' : `X: ${Math.round(rotateX)}° Y: ${Math.round(((rotateY % 360) + 360) % 360)}°`}
      </div>
    </div>
  );
}
