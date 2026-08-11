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
    // Marco exterior angular (deja espacio para el HUD).
    const L = 8 * scaleRef.current;
    const R = 58 * scaleRef.current;

    let time = 0;

    // Dibuja una esquina en codo (estilo Iron Man): dos líneas perpendiculares
    // que dejan una abertura de 90 grados en una esquina de un rectángulo.
    const drawCorner = (
      x: number, y: number, dx: number, dy: number, len: number, color: string, lw: number,
    ) => {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + dx * len, y);
      ctx.lineTo(x + dx * len, y + dy * len);
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.stroke();
    };

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

      // ─── Barrido de escaneo horizontal (pronunciado, recto) ───
      const sweepY = L + ((time * 18) % (H - 2 * L));
      const grad = ctx.createLinearGradient(0, sweepY - 2, 0, sweepY + 14);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(0.5, dim(0.5));
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(L, sweepY - 2, W - 2 * L, 14);
      ctx.beginPath();
      ctx.moveTo(L, sweepY);
      ctx.lineTo(W - L, sweepY);
      ctx.strokeStyle = dim(0.7);
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // ─── Marco exterior angular (esquinas en codo) ───
      const m = 4 * scaleRef.current;
      ctx.lineWidth = 1.5 * scaleRef.current;
      // laterales verticales
      ctx.beginPath(); ctx.moveTo(L + m, L); ctx.lineTo(L + m, H - L); ctx.strokeStyle = dim(0.85); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W - L - m, L); ctx.lineTo(W - L - m, H - L); ctx.strokeStyle = dim(0.85); ctx.stroke();
      // horizontales superiores e inferiores
      ctx.beginPath(); ctx.moveTo(L, H - L - m); ctx.lineTo(W - L, H - L - m); ctx.strokeStyle = dim(0.6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(L, L + m); ctx.lineTo(W - L, L + m); ctx.strokeStyle = dim(0.6); ctx.stroke();

      // ─── Esquinas pronunciadas (ticks angulares en cada esquina) ───
      const cor = 4;
      const cornerColor = dim(1);
      // superior-izquierda
      drawCorner(L, L, 1, 1, 10 * cor * 0.6, cornerColor, 2);
      drawCorner(L, L, 1, 0, 20 * cor * 0.6, cornerColor, 2);
      drawCorner(L, L, 0, 1, 20, cornerColor, 2);
      // superior-derecha
      drawCorner(W - L, L, -1, 1, 20, cornerColor, 2);
      drawCorner(W - L, L, -1, 0, 20, cornerColor, 2);
      // inferior-izquierda
      drawCorner(L, H - L, 1, -1, 20, cornerColor, 2);
      drawCorner(L, H - L, 0, -1, 20, cornerColor, 2);
      // inferior-derecha
      drawCorner(W - L, H - L, -1, -1, 20, cornerColor, 2);

      // ─── Ticks de medición a lo largo del marco (pronunciados) ───
      for (let i = 0; i <= 10; i++) {
        const tx = L + ((W - 2 * L) / 10) * i;
        const th = i % 5 === 0 ? 8 : 4;
        ctx.beginPath();
        ctx.moveTo(tx, H - L - m);
        ctx.lineTo(tx, H - L - m + th);
        ctx.strokeStyle = dim(i % 5 === 0 ? 0.8 : 0.35);
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // ─── Barras HUD laterales (elementos de datos rectos) ───
      const barH = R * 0.5;
      const barX = L + m + 4;
      const bars = 5;
      for (let i = 0; i < bars; i++) {
        const seg = (time * 0.8 + i * 0.6) % 1;
        ctx.beginPath();
        ctx.moveTo(barX, cy - barH / 2 + (barH / (bars - 1)) * i);
        ctx.lineTo(barX + (W * 0.16) * seg, cy - barH / 2 + (barH / (bars - 1)) * i);
        ctx.strokeStyle = dim(0.4);
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // ─── Anillo marcador central (cuadrado rotado, no círculo) ───
      const rot = time * 0.2 * activity;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.strokeStyle = dim(0.5);
      ctx.lineWidth = 1.2;
      ctx.strokeRect(-R * 0.95, -R * 0.95, R * 1.9, R * 1.9);
      ctx.restore();

      // ─── Arco de reactor (arc reactor Iron Man) en el centro ───
      const reactorR = R * 0.62;
      for (let i = 0; i < 12; i++) {
        const a0 = (i / 12) * Math.PI * 2 + time * 0.3 * activity;
        ctx.beginPath();
        ctx.arc(cx, cy, reactorR, a0, a0 + (Math.PI * 2 / 12) * 0.5);
        const alpha = 0.3 + 0.5 * (0.5 + Math.sin(time * 2 + i * 1.2) * 0.5) * (speaking ? 1.2 : 1);
        ctx.strokeStyle = dim(alpha);
        ctx.lineWidth = 2.2;
        ctx.stroke();
      }

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

      // ─── Audio visualizer (barras rectas al hablar) ───
      if (speaking) {
        const barCount = 24;
        const innerR = R * 0.3;
        for (let i = 0; i < barCount; i++) {
          const a = (i / barCount) * Math.PI * 2;
          const h = 4 + Math.sin(time * 6 + i * 0.7) * 6 + Math.sin(time * 4 + i * 1.1) * 4;
          const x1 = cx + Math.cos(a) * innerR;
          const y1 = cy + Math.sin(a) * innerR;
          const x2 = cx + Math.cos(a) * (innerR + Math.abs(h));
          const y2 = cy + Math.sin(a) * (innerR + Math.abs(h));
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = `rgba(251,146,60,${0.3 + Math.sin(time * 6 + i) * 0.2})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
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
