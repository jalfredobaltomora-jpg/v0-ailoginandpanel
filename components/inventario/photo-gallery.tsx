'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

interface PhotoGalleryProps {
  photos: { url: string; label: string }[];
  initialIndex: number;
  onClose: () => void;
}

export function PhotoGallery({ photos, initialIndex, onClose }: PhotoGalleryProps) {
  const [index, setIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const lastTouchDist = useRef(0);

  const current = photos[index];

  const goNext = useCallback(() => {
    if (index < photos.length - 1) {
      setIndex(i => i + 1);
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [index, photos.length]);

  const goPrev = useCallback(() => {
    if (index > 0) {
      setIndex(i => i - 1);
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [index]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, goNext, goPrev]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? -0.25 : 0.25;
    setScale(s => Math.max(0.5, Math.min(5, s + delta)));
  };

  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragging && scale > 1) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setDragging(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist.current = Math.hypot(dx, dy);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const delta = (dist - lastTouchDist.current) * 0.01;
      setScale(s => Math.max(0.5, Math.min(5, s + delta)));
      lastTouchDist.current = dist;
    }
  }, []);

  const adjustPosition = () => {
    if (scale <= 1) {
      setPosition({ x: 0, y: 0 });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 select-none"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <button
        onClick={onClose}
        className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/60 text-white hover:bg-white/20 transition-colors"
      >
        <X className="h-6 w-6" />
      </button>

      <div className="absolute top-3 left-3 z-20 px-3 py-1.5 rounded-full bg-black/60 text-white text-sm">
        {current.label} ({index + 1}/{photos.length})
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 rounded-full bg-black/60">
        <button onClick={() => setScale(s => Math.max(0.5, s - 0.5))} className="p-1 text-white hover:text-primary transition-colors">
          <ZoomOut className="h-5 w-5" />
        </button>
        <span className="text-white text-xs min-w-[4ch] text-center tabular-nums">{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale(s => Math.min(5, s + 0.5))} className="p-1 text-white hover:text-primary transition-colors">
          <ZoomIn className="h-5 w-5" />
        </button>
        <button
          onClick={() => { setScale(1); setPosition({ x: 0, y: 0 }); }}
          className="ml-2 px-2 py-0.5 rounded text-xs text-white hover:bg-white/20 transition-colors"
        >
          Reset
        </button>
      </div>

      {index > 0 && (
        <button
          onClick={goPrev}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/60 text-white hover:bg-white/20 transition-colors"
        >
          <ChevronLeft className="h-8 w-8" />
        </button>
      )}
      {index < photos.length - 1 && (
        <button
          onClick={goNext}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/60 text-white hover:bg-white/20 transition-colors"
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      )}

      <div
        className="w-full h-full flex items-center justify-center p-4"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTransitionEnd={adjustPosition}
        style={{ cursor: scale > 1 ? 'grab' : 'default' }}
      >
        <img
          src={current.url}
          alt={current.label}
          draggable={false}
          onDoubleClick={() => {
            if (scale > 1) {
              setScale(1);
              setPosition({ x: 0, y: 0 });
            } else {
              setScale(2.5);
            }
          }}
          style={{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            transition: dragging || lastTouchDist.current !== 0 ? 'none' : 'transform 0.15s ease-out',
            borderRadius: '4px',
          }}
        />
      </div>
    </div>
  );
}
