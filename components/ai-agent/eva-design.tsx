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
}

export function EVARobotComponent(props: EVADesignProps) {
  const {
    expression = 'idle',
    isSpeaking = false,
    isListening = false,
    scale = 1,
    interactive = true,
  } = props;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const isSpeakingRef = useRef(isSpeaking);
  const isListeningRef = useRef(isListening);
  const expressionRef = useRef(expression);
  isSpeakingRef.current = isSpeaking;
  isListeningRef.current = isListening;
  expressionRef.current = expression;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 140 * scale;
    const H = 140 * scale;
    canvas.width = W;
    canvas.height = H;
    const cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) * 0.44;

    let time = 0;
    const particles: { angle: number; speed: number; radius: number; size: number; phase: number; orbit: number }[] = [];
    for (let i = 0; i < 35; i++) {
      particles.push({
        angle: Math.random() * Math.PI * 2,
        speed: (0.2 + Math.random() * 0.5) * (Math.random() > 0.5 ? 1 : -1),
        radius: R * (0.3 + Math.random() * 0.7),
        size: 0.8 + Math.random() * 1.8,
        phase: Math.random() * Math.PI * 2,
        orbit: Math.random() * Math.PI * 2,
      });
    }

    const render = () => {
      const speaking = isSpeakingRef.current;
      const listening = isListeningRef.current;
      time += 0.02;
      ctx.clearRect(0, 0, W, H);
      ctx.save();

      const baseHue = 185;
      const elBlue = '0,238,255';
      const cyan = '0,255,255';
      const accentRgb = listening ? '52,211,153' : speaking ? '251,146,60' : elBlue;

      // ─── Background scan grid ───
      ctx.strokeStyle = `rgba(${accentRgb},0.04)`;
      ctx.lineWidth = 0.3;
      for (let i = -5; i <= 5; i++) {
        const x = cx + (i / 5) * R * 0.7;
        ctx.beginPath();
        ctx.moveTo(x, cy - R * 0.7);
        ctx.lineTo(x, cy + R * 0.7);
        ctx.stroke();
        const y = cy + (i / 5) * R * 0.7;
        ctx.beginPath();
        ctx.moveTo(cx - R * 0.7, y);
        ctx.lineTo(cx + R * 0.7, y);
        ctx.stroke();
      }

      // ─── Outer segmented ring ───
      const segments = 24;
      for (let i = 0; i < segments; i++) {
        const a0 = (i / segments) * Math.PI * 2 + time * 0.05;
        const a1 = a0 + (Math.PI * 2 / segments) * 0.6;
        ctx.beginPath();
        ctx.arc(cx, cy, R, a0, a1);
        const alpha = 0.08 + 0.15 * (0.5 + Math.sin(time * 0.5 + i * 0.5) * 0.5);
        ctx.strokeStyle = `rgba(${accentRgb},${alpha})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }

      // ─── Data arc 1 ───
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.87, -Math.PI * 0.4 + Math.sin(time * 0.3) * 0.1, Math.PI * 0.7 + Math.sin(time * 0.3 + 1) * 0.1);
      ctx.strokeStyle = `rgba(${accentRgb},0.2)`;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // ─── Data arc 2 ───
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.72, Math.PI * 0.6 + Math.sin(time * 0.4) * 0.1, Math.PI * 1.4 + Math.sin(time * 0.4 + 1) * 0.1);
      ctx.strokeStyle = `rgba(${accentRgb},0.15)`;
      ctx.lineWidth = 0.4;
      ctx.stroke();

      // ─── Data arc 3 (inner) ───
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.58, Math.PI * 1.1 + Math.sin(time * 0.35) * 0.08, Math.PI * 1.8 + Math.sin(time * 0.35) * 0.08);
      ctx.strokeStyle = `rgba(${accentRgb},0.18)`;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // ─── Rotating scan line ───
      const scanAngle = time * 0.6;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(scanAngle) * R * 1.2, cy + Math.sin(scanAngle) * R * 1.2);
      ctx.strokeStyle = `rgba(${accentRgb},${0.08 + Math.sin(time * 1.5) * 0.04})`;
      ctx.lineWidth = 0.4;
      ctx.stroke();

      // ─── Secondary scan line (opposite) ───
      const scanAngle2 = scanAngle + Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(scanAngle2) * R * 0.8, cy + Math.sin(scanAngle2) * R * 0.8);
      ctx.strokeStyle = `rgba(${accentRgb},0.04)`;
      ctx.lineWidth = 0.3;
      ctx.stroke();

      // ─── Tick marks ───
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2;
        const len = i % 3 === 0 ? 4 : 2;
        const inner = R + 3;
        const outer = R + 3 + len;
        const alpha = i % 3 === 0 ? 0.4 : 0.12;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
        ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
        ctx.strokeStyle = `rgba(${accentRgb},${alpha})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // ─── Data node markers ───
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + time * 0.08 + Math.sin(time * 0.2 + i) * 0.03;
        const x = cx + Math.cos(a) * (R + 8);
        const y = cy + Math.sin(a) * (R + 8);
        const pulse = 0.3 + Math.sin(time * 1.5 + i * 0.8) * 0.2;
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${accentRgb},${pulse})`;
        ctx.fill();
        if (i % 2 === 0) {
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${accentRgb},${pulse * 0.3})`;
          ctx.lineWidth = 0.3;
          ctx.stroke();
        }
      }

      // ─── Particles ───
      const speechBoost = speaking ? 1 + Math.sin(time * 4) * 0.3 : 1;
      const listenBoost = listening ? 1.2 : 1;
      particles.forEach((p) => {
        p.angle += p.speed * 0.025 * speechBoost * listenBoost;
        p.radius += Math.sin(time * 0.5 + p.phase) * 0.02;
        const x = cx + Math.cos(p.angle) * p.radius;
        const y = cy + Math.sin(p.angle) * p.radius;
        const bright = 0.2 + Math.sin(time * 2 + p.phase) * 0.15;
        ctx.beginPath();
        ctx.arc(x, y, p.size * (0.5 + Math.sin(time + p.phase) * 0.25), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${accentRgb},${bright * speechBoost})`;
        ctx.fill();
      });

      // ─── Audio visualizer when speaking ───
      if (speaking) {
        const vizR = R * 0.45;
        const barCount = 32;
        for (let i = 0; i < barCount; i++) {
          const angle = (i / barCount) * Math.PI * 2;
          const height = 3 + Math.sin(time * 5 + i * 0.8) * 4 + Math.sin(time * 3 + i * 1.3) * 3;
          const x1 = cx + Math.cos(angle) * (vizR);
          const y1 = cy + Math.sin(angle) * (vizR);
          const x2 = cx + Math.cos(angle) * (vizR + Math.abs(height));
          const y2 = cy + Math.sin(angle) * (vizR + Math.abs(height));
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = `rgba(251,146,60,${0.15 + Math.sin(time * 5 + i) * 0.1})`;
          ctx.lineWidth = 1.2;
          ctx.shadowColor = 'rgba(251,146,60,0.15)';
          ctx.shadowBlur = 4;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // Speaking arcs
        for (let i = 0; i < 3; i++) {
          const sweep = Math.PI * 0.3;
          const offset = time * 0.4 + i * 2.1;
          const r = R * (0.7 + i * 0.08);
          ctx.beginPath();
          ctx.arc(cx, cy, r, offset, offset + sweep);
          ctx.strokeStyle = `rgba(251,146,60,${0.25 + Math.sin(time * 2.5 + i) * 0.1})`;
          ctx.lineWidth = 1.5;
          ctx.shadowColor = 'rgba(251,146,60,0.25)';
          ctx.shadowBlur = 8;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }

      // ─── Listening sonar rings ───
      if (listening) {
        for (let i = 0; i < 4; i++) {
          const phase = (time * 1.2 + i * 1.6) % 3;
          const r = R * 0.2 + R * 0.7 * phase;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(52,211,153,${(1 - phase / 3) * 0.25})`;
          ctx.lineWidth = 0.4;
          ctx.stroke();
        }
      }

      // ─── Center glow ───
      const coreSize = R * 0.12 * (speaking ? 1 + Math.sin(time * 4) * 0.15 : 1);
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreSize);
      coreGrad.addColorStop(0, `rgba(255,255,255,${speaking ? 0.9 : 0.7})`);
      coreGrad.addColorStop(0.15, `rgba(${accentRgb},${speaking ? 0.8 : 0.5})`);
      coreGrad.addColorStop(0.5, `rgba(${accentRgb},${speaking ? 0.3 : 0.15})`);
      coreGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreSize, 0, Math.PI * 2);
      ctx.fill();

      // ─── Core dot ───
      ctx.shadowColor = `rgba(${accentRgb},0.8)`;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.shadowBlur = 0;

      // ─── Holo ring ───
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.35 + Math.sin(time * 0.5) * 2, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${accentRgb},${0.08 + Math.sin(time * 0.7) * 0.04})`;
      ctx.lineWidth = 0.3;
      ctx.stroke();

      ctx.restore();
      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [scale]);

  return (
    <div
      className={`relative ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
      style={{ width: `${140 * scale}px`, height: `${140 * scale}px` }}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      <div className="absolute -top-0.5 -right-0.5 w-[7px] h-[7px] rounded-full border border-[#0d1117]" style={{
        background: isListening ? '#4ade80' : isSpeaking ? '#fb923c' : '#00eeff',
        boxShadow: `0 0 8px rgba(${isListening ? '52,211,153' : isSpeaking ? '251,146,60' : '0,238,255'},0.9)`,
      }} />
    </div>
  );
}
