'use client';

import { useState, useRef, useEffect } from 'react';
import { X, RotateCcw } from 'lucide-react';

interface Photo3DViewerProps {
  photos: { url: string; label: string }[];
  onClose: () => void;
}

export function Photo3DViewer({ photos, onClose }: Photo3DViewerProps) {
  const [angle, setAngle] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const lastX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);

  const validPhotos = photos.filter(p => p.url);
  const count = validPhotos.length;
  const angleStep = count > 0 ? 360 / count : 0;

  useEffect(() => {
    if (!autoRotate || isDragging || count === 0) return;
    const tick = () => {
      setAngle(prev => prev + 0.3);
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [autoRotate, isDragging, count]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setAutoRotate(false);
    lastX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastX.current;
    lastX.current = e.clientX;
    setAngle(prev => prev + dx * 0.5);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setAngle(0);
    setAutoRotate(true);
  };

  if (count === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
        <div className="text-white text-center">
          <p className="text-lg mb-4">No hay fotos disponibles</p>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    );
  }

  const radius = 200;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={onClose}>
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

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {validPhotos.map((p, i) => (
          <button key={i}
            onClick={(e) => { e.stopPropagation(); setAngle(i * angleStep); setAutoRotate(false); }}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition">
            {p.label}
          </button>
        ))}
      </div>

      <div className="text-white/50 text-xs absolute bottom-16 left-1/2 -translate-x-1/2 z-10">
        Arrastra para rotar • Clic en nombre para ir a esa vista
      </div>

      <div ref={containerRef}
        className="relative w-[400px] h-[400px] cursor-grab active:cursor-grabbing"
        style={{ perspective: '800px' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0" style={{
          transformStyle: 'preserve-3d',
          transform: `rotateY(${angle}deg)`,
          transition: isDragging ? 'none' : 'transform 0.05s linear',
        }}>
          {validPhotos.map((photo, i) => {
            const faceAngle = i * angleStep;
            const isActive = Math.abs(((angle % 360) + 360) % 360 - faceAngle) < angleStep / 2 ||
              Math.abs(((angle % 360) + 360) % 360 - faceAngle - 360) < angleStep / 2;
            return (
              <div key={i} className="absolute inset-0 flex items-center justify-center"
                style={{
                  transform: `rotateY(${faceAngle}deg) translateZ(${radius}px)`,
                  backfaceVisibility: 'hidden',
                }}>
                <div className={`relative transition-all duration-300 ${isActive ? 'scale-100 opacity-100' : 'scale-75 opacity-40'}`}>
                  <img src={photo.url} alt={photo.label}
                    className="max-w-[300px] max-h-[300px] object-contain rounded-xl shadow-2xl"
                    style={{ filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.5))' }} />
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-white text-xs font-medium bg-black/50 px-3 py-1 rounded-full whitespace-nowrap">
                    {photo.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Button({ children, onClick, className, ...props }: any) {
  return <button onClick={onClick} className={className} {...props}>{children}</button>;
}
