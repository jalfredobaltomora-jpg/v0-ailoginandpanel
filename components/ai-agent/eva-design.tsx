'use client';

import { useRef, useEffect } from 'react';

export type EVAExpression = 'idle' | 'happy' | 'thinking' | 'surprised' | 'curious' | 'concerned' | 'scanning' | 'processing';

interface EVADesignProps {
  expression?: EVAExpression;
  isSpeaking?: boolean;
  isListening?: boolean;
  scale?: number;
  interactive?: boolean;
  onExpressionChange?: (expr: EVAExpression) => void;
  /** Pendientes del día anterior (Agenda) para mostrar en el HUD. */
  pending?: string[];
}

/**
 * JAB — visual estilo JARVIS (Iron Man / HUD angular).
 * Líneas rectas y pronunciadas, marco de esquinas en codo, paneles de datos
 * y escaneo de barrido horizontal, en lugar del diseño circular orgánico.
 */
export function EVARobotComponent(props: EVADesignProps) {
  const {
    expression = 'idle',
    isSpeaking = false,
    isListening = false,
    scale = 1,
    interactive = true,
    pending = [],
  } = props;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const isSpeakingRef = useRef(isSpeaking);
  const isListeningRef = useRef(isListening);
  const expressionRef = useRef(expression);
  const scaleRef = useRef(scale);
  const pendingRef = useRef(pending);
  isSpeakingRef.current = isSpeaking;
  isListeningRef.current = isListening;
  expressionRef.current = expression;
  scaleRef.current = scale;
  pendingRef.current = pending;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 150 * scaleRef.current;
    const H = 150 * scaleRef.current;
    canvas.width = W;
    canvas.height = H;

    const cx = W / 2;
    const cy = H / 2;
    const R = 58 * scaleRef.current;

    let time = 0;

    const render = () => {
      const speaking = isSpeakingRef.current;
      const listening = isListeningRef.current;
      const expr = expressionRef.current;
      time += 0.02;
      // La expresión modula la energía visual (más rápida en scanning/processing).
      const activity = expr === 'scanning' || expr === 'processing' ? 1.6
        : expr === 'thinking' || expr === 'curious' || expr === 'surprised' ? 1.2
        : 1;

      ctx.clearRect(0, 0, W, H);
      ctx.save();

      const accentRgb = listening ? '52,211,153' : speaking ? '251,146,60' : '0,238,255';
      const dim = (a: number) => `rgba(${accentRgb},${a})`;

      // ─── Visor redondo exterior (arc reactor JARVIS) ───
      const outerR = R * 1.18;
      // Círculo exterior pronunciado
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ctx.strokeStyle = dim(0.9);
      ctx.lineWidth = 2.4;
      ctx.stroke();
      // Segundo anillo tenue
      ctx.beginPath();
      ctx.arc(cx, cy, outerR + 5, 0, Math.PI * 2);
      ctx.strokeStyle = dim(0.18);
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // ─── Anillos concéntricos finos (arc reactor Iron Man, sin barrer) ───
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = dim(0.35);
      ctx.beginPath(); ctx.arc(cx, cy, outerR * 0.05, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, outerR * 0.1, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, outerR * 0.16, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, outerR * 0.24, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, outerR * 0.34, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, outerR * 0.46, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, outerR * 0.6, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, outerR * 0.76, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, outerR * 0.9, 0, Math.PI * 2); ctx.stroke();

      // ─── Anillos rotatorios (sentidos alternos CLAROS, lentos, con glow) ───
      // Se usan ticks asimétricos (marcas largas/cortas) + un marcador brillante
      // para que la dirección de giro sea inconfundible a la vista.
      const glowStr = speaking ? 8 : 3;
      const ringAlpha = (a: number) => `rgba(${accentRgb},${a})`;

      // Helper: dibuja un anillo de ticks rotatorio. dir = +1 horario, -1 antihorario.
      const drawTickRing = (radius: number, count: number, speed: number, dir: number, baseWidth: number, longEvery: number) => {
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2 + time * speed * dir * activity;
          const isLong = i % longEvery === 0;
          const isMarker = i === 0;
          const len = isMarker ? 8 : isLong ? 5 : 2.5;
          const inner = radius - len;
          const x1 = cx + Math.cos(a) * inner;
          const y1 = cy + Math.sin(a) * inner;
          const x2 = cx + Math.cos(a) * radius;
          const y2 = cy + Math.sin(a) * radius;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          const pulse = 0.5 + Math.sin(time * 1.5 + i * 0.5) * 0.5;
          const a1 = isMarker ? 0.9 : isLong ? 0.3 + 0.3 * pulse : 0.12 + 0.15 * pulse;
          ctx.strokeStyle = ringAlpha(a1 * (speaking ? 1.4 : 1));
          ctx.lineWidth = isMarker ? baseWidth + 1 : baseWidth;
          ctx.shadowBlur = isMarker ? glowStr + 4 : glowStr;
          ctx.shadowColor = ringAlpha(a1);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
      };

      // Anillo 1 — externo, ticks largos/cortos, HORARIO lento
      drawTickRing(R * 0.92, 24, 0.05, +1, 1.6, 4);

      // Anillo 2 — medio, más denso, ANTIHORARIO (dirección opuesta clara)
      drawTickRing(R * 0.74, 32, 0.035, -1, 1.2, 8);

      // Anillo 3 — interno, HORARIO muy lento
      drawTickRing(R * 0.56, 16, 0.04, +1, 1.8, 4);

      // Anillo 4 — reactor, ANTIHORARIO moderado (opuesto al anillo 3)
      drawTickRing(R * 0.42, 12, 0.055, -1, 2.0, 3);

      // ─── Marca cruz central (pronunciada) ───
      ctx.lineWidth = 2;
      ctx.strokeStyle = dim(0.9);
      ctx.beginPath();
      ctx.moveTo(cx - R * 0.22, cy); ctx.lineTo(cx - R * 0.08, cy);
      ctx.moveTo(cx + R * 0.08, cy); ctx.lineTo(cx + R * 0.22, cy);
      ctx.moveTo(cx, cy - R * 0.22); ctx.lineTo(cx, cy - R * 0.08);
      ctx.moveTo(cx, cy + R * 0.08); ctx.lineTo(cx, cy + R * 0.22);
      ctx.stroke();

      // ─── Núcleo reactivo ───
      const coreSize = R * (0.16 + (speaking ? 0.03 + Math.sin(time * 6) * 0.02 : 0));
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreSize * 3);
      coreGrad.addColorStop(0, `rgba(255,255,255,${speaking ? 0.95 : 0.8})`);
      coreGrad.addColorStop(0.25, dim(speaking ? 0.9 : 0.6));
      coreGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreSize * 3, 0, Math.PI * 2);
      ctx.fill();

      // ─── Audio visualizer (barras radiantes al hablar, con glow) ───
      if (speaking) {
        const barCount = 28;
        const innerR = R * 0.28;
        for (let i = 0; i < barCount; i++) {
          const a = (i / barCount) * Math.PI * 2;
          const h = 5 + Math.sin(time * 7 + i * 0.6) * 7 + Math.sin(time * 4.5 + i * 1.2) * 5;
          const x1 = cx + Math.cos(a) * innerR;
          const y1 = cy + Math.sin(a) * innerR;
          const x2 = cx + Math.cos(a) * (innerR + Math.abs(h));
          const y2 = cy + Math.sin(a) * (innerR + Math.abs(h));
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          const bAlpha = 0.4 + Math.sin(time * 7 + i) * 0.3;
          ctx.strokeStyle = `rgba(251,146,60,${bAlpha})`;
          ctx.lineWidth = 2.2;
          ctx.shadowBlur = 6;
          ctx.shadowColor = `rgba(251,146,60,${bAlpha})`;
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
      }

      // ─── Línea de enfoque cuando escucha (recta, pronunciada) ───
      if (listening) {
        for (let i = 0; i < 4; i++) {
          const phase = (time * 1.2 + i * 1.2) % 1;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(phase * Math.PI * 2 + i * (Math.PI / 2));
          ctx.beginPath();
          ctx.moveTo(0, -R * (0.6 + phase * 0.5));
          ctx.lineTo(0, -R * (0.6 + phase * 0.5) + 10);
          ctx.strokeStyle = `rgba(52,211,153,${(1 - phase) * 0.5})`;
          ctx.lineWidth = 1.6;
          ctx.stroke();
          ctx.restore();
        }
      }

      ctx.restore();
      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [scale]);

  const pendingList = pendingRef.current;

  return (
    <div
      className={`relative ${interactive ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
      style={{ width: `${150 * scale}px`, height: `${150 * scale}px` }}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      <div className="absolute -top-0.5 -right-0.5 w-[7px] h-[7px] rounded-full border border-[#0d1117]" style={{
        background: isListening ? '#4ade80' : isSpeaking ? '#fb923c' : '#00eeff',
        boxShadow: `0 0 8px rgba(${isListening ? '52,211,153' : isSpeaking ? '251,146,60' : '0,238,255'},0.9)`,
      }} />

      {pendingList.length > 0 && (
        <div
          className="absolute left-1/2 -translate-x-1/2 top-full mt-1 w-[180px] rounded-sm bg-[#050b14]/85 border border-cyan-400/30 p-1.5 backdrop-blur-sm"
          style={{ boxShadow: '0 0 12px rgba(0,238,255,0.15)' }}
        >
          <div className="flex items-center justify-between border-b border-cyan-400/30 pb-1 mb-1">
            <span className="text-[8px] font-bold tracking-widest text-cyan-300">PENDIENTES</span>
            <span className="text-[8px] font-mono text-cyan-300/60">{new Date().toLocaleDateString('es')}</span>
          </div>
          <ul className="space-y-0.5">
            {pendingList.slice(0, 3).map((p, i) => (
              <li key={i} className="flex items-start gap-1 text-[8px] leading-tight text-cyan-100/90">
                <span className="text-cyan-400 mt-[1px]">▸</span>
                <span className="line-clamp-1">{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
