'use client';

import { useState, useCallback } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Empleado } from '@/lib/firebase';
import { parseDateLocal } from '@/lib/utils';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const PW = 5011;

interface BirthdayPosterProps {
  empleados: Empleado[];
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('load fail'));
    img.src = src;
  });
}

function getInitials(emp: Empleado): string {
  return `${(emp.nombres?.[0] || '')}${(emp.apellidos?.[0] || '')}`.toUpperCase();
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

function isBirthdayToday(fechaNac: string): boolean {
  if (!fechaNac) return false;
  const t = new Date();
  const b = parseDateLocal(fechaNac);
  return b.getMonth() === t.getMonth() && b.getDate() === t.getDate();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawBalloon(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  color: string, opacity: number,
) {
  ctx.save();
  ctx.globalAlpha = opacity;
  const bg = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.3, r * 0.1, cx, cy, r);
  bg.addColorStop(0, '#ffffff');
  bg.addColorStop(0.3, color);
  bg.addColorStop(1, '#000000');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 0.82, r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - 4, cy + r);
  ctx.lineTo(cx, cy + r + 14);
  ctx.lineTo(cx + 4, cy + r);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy + r + 14);
  ctx.quadraticCurveTo(cx + 15, cy + r + 60, cx - 5, cy + r + 100);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.28, cy - r * 0.35, r * 0.15, r * 0.25, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawConfetti(
  ctx: CanvasRenderingContext2D,
  w: number, h: number, count: number,
) {
  const colors = [
    '#ff6b9d', '#c44dff', '#ffab40', '#00e5ff',
    '#69f0ae', '#ffd740', '#ff5252', '#448aff',
    '#ea80fc', '#ff6e40', '#18ffff', '#b388ff',
  ];
  for (let i = 0; i < count; i++) {
    const seed = i * 2654435761;
    const x = ((seed >>> 0) % (w | 0));
    const y = ((seed * 13 >>> 0) % (h | 0));
    const ci = (seed >>> 16) % colors.length;
    const size = 4 + (seed >>> 8) % 8;
    const rot = ((seed >>> 4) % 360) * Math.PI / 180;
    const alpha = 0.12 + ((seed >>> 12) % 15) / 100;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = colors[ci];
    if (i % 3 === 0) {
      ctx.fillRect(-size / 2, -size * 0.3, size, size * 0.6);
    } else if (i % 3 === 1) {
      ctx.beginPath();
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      for (let p = 0; p < 5; p++) {
        const angle = (p * 72 - 90) * Math.PI / 180;
        const ox = Math.cos(angle) * size / 2;
        const oy = Math.sin(angle) * size / 2;
        const ia = ((p * 72 + 36) - 90) * Math.PI / 180;
        const ix = Math.cos(ia) * size / 4;
        const iy = Math.sin(ia) * size / 4;
        if (p === 0) ctx.moveTo(ox, oy); else ctx.lineTo(ox, oy);
        ctx.lineTo(ix, iy);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawSparkle(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number, opacity: number,
) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.quadraticCurveTo(x + size * 0.15, y - size * 0.15, x + size, y);
  ctx.quadraticCurveTo(x + size * 0.15, y + size * 0.15, x, y + size);
  ctx.quadraticCurveTo(x - size * 0.15, y + size * 0.15, x - size, y);
  ctx.quadraticCurveTo(x - size * 0.15, y - size * 0.15, x, y - size);
  ctx.fill();
  ctx.restore();
}

function drawCakeIcon(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, scale: number, opacity: number,
) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath();
  ctx.ellipse(0, 40, 70, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  const cg = ctx.createLinearGradient(-50, -10, 50, 40);
  cg.addColorStop(0, '#2a1a4e');
  cg.addColorStop(1, '#1a0d3b');
  ctx.fillStyle = cg;
  roundRect(ctx, -50, -10, 100, 50, 8);
  ctx.fill();
  ctx.fillStyle = '#ff6b9d';
  ctx.beginPath();
  for (let i = 0; i <= 100; i += 5) {
    const fx = -50 + i;
    const fy = -10 + Math.sin(i * 0.15) * 8;
    if (i === 0) ctx.moveTo(fx, fy); else ctx.lineTo(fx, fy);
  }
  ctx.lineTo(50, -10);
  ctx.lineTo(-50, -10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#00e5ff';
  ctx.fillRect(-3, -35, 6, 28);
  ctx.fillStyle = '#ffab40';
  ctx.beginPath();
  ctx.ellipse(0, -42, 6, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff8e1';
  ctx.beginPath();
  ctx.ellipse(0, -42, 2.5, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCoffeeCup(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, scale: number, opacity: number,
) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#3d2b5a';
  ctx.beginPath();
  ctx.moveTo(-20, -15);
  ctx.lineTo(-16, 25);
  ctx.quadraticCurveTo(0, 35, 16, 25);
  ctx.lineTo(20, -15);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#8B4513';
  ctx.beginPath();
  ctx.ellipse(0, -12, 20, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3d2b5a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(24, 5, 12, -Math.PI * 0.4, Math.PI * 0.4);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2;
  for (let s = 0; s < 3; s++) {
    const sx = -8 + s * 8;
    ctx.beginPath();
    ctx.moveTo(sx, -18);
    ctx.quadraticCurveTo(sx + 5, -30, sx, -40);
    ctx.quadraticCurveTo(sx - 5, -50, sx, -58);
    ctx.stroke();
  }
  ctx.restore();
}

function drawLaptop(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, scale: number, opacity: number,
) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#1a1a3e';
  roundRect(ctx, -35, -30, 70, 45, 4);
  ctx.fill();
  ctx.strokeStyle = '#3d2b5a';
  ctx.lineWidth = 2;
  roundRect(ctx, -35, -30, 70, 45, 4);
  ctx.stroke();
  const sg = ctx.createLinearGradient(-30, -25, 30, 10);
  sg.addColorStop(0, 'rgba(0,238,255,0.12)');
  sg.addColorStop(1, 'rgba(196,77,255,0.06)');
  ctx.fillStyle = sg;
  roundRect(ctx, -30, -25, 60, 35, 2);
  ctx.fill();
  ctx.fillStyle = '#2a1a4e';
  ctx.beginPath();
  ctx.moveTo(-40, 18);
  ctx.lineTo(40, 18);
  ctx.lineTo(45, 28);
  ctx.lineTo(-45, 28);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawGiftBox(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, scale: number, opacity: number,
) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#ff6b9d';
  roundRect(ctx, -25, -5, 50, 35, 4);
  ctx.fill();
  ctx.fillStyle = '#e05585';
  roundRect(ctx, -28, -15, 56, 14, 4);
  ctx.fill();
  ctx.fillStyle = '#ffd740';
  ctx.fillRect(-4, -15, 8, 45);
  ctx.fillRect(-28, -2, 56, 6);
  ctx.beginPath();
  ctx.ellipse(-8, -20, 8, 5, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(8, -20, 8, 5, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -18, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPartyHat(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, scale: number, opacity: number,
) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#c44dff';
  ctx.beginPath();
  ctx.moveTo(0, -40);
  ctx.lineTo(-22, 20);
  ctx.lineTo(22, 20);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffd740';
  ctx.beginPath();
  ctx.moveTo(-4, -25);
  ctx.lineTo(-14, 10);
  ctx.lineTo(-8, 10);
  ctx.lineTo(2, -25);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ff6b9d';
  ctx.beginPath();
  ctx.moveTo(6, -15);
  ctx.lineTo(-2, 15);
  ctx.lineTo(8, 15);
  ctx.lineTo(16, -15);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffd740';
  ctx.beginPath();
  ctx.arc(0, -42, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#a030cc';
  ctx.beginPath();
  ctx.ellipse(0, 22, 26, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawStarShape(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, size: number, color: string, opacity: number,
) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * 144 - 90) * Math.PI / 180;
    const px = cx + Math.cos(angle) * size;
    const py = cy + Math.sin(angle) * size;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawOfficeItems(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
) {
  const balloonColors = ['#ff6b9d', '#c44dff', '#00e5ff', '#ffab40', '#69f0ae', '#ea80fc', '#ffd740', '#ff5252'];
  // Balloons distributed along the full height
  const balloonPositions = [
    { x: 120, yF: 0.02, r: 55, ci: 0, op: 0.30 },
    { x: 300, yF: 0.01, r: 42, ci: 1, op: 0.25 },
    { x: 480, yF: 0.025, r: 35, ci: 2, op: 0.22 },
    { x: w - 120, yF: 0.02, r: 52, ci: 3, op: 0.28 },
    { x: w - 300, yF: 0.012, r: 40, ci: 4, op: 0.24 },
    { x: w - 480, yF: 0.022, r: 38, ci: 5, op: 0.22 },
    // Scattered down the sides
    { x: 100, yF: 0.15, r: 30, ci: 6, op: 0.18 },
    { x: w - 100, yF: 0.18, r: 28, ci: 7, op: 0.18 },
    { x: 130, yF: 0.35, r: 25, ci: 0, op: 0.15 },
    { x: w - 130, yF: 0.38, r: 26, ci: 2, op: 0.15 },
    { x: 90, yF: 0.55, r: 22, ci: 4, op: 0.12 },
    { x: w - 90, yF: 0.58, r: 24, ci: 1, op: 0.12 },
    { x: 110, yF: 0.75, r: 20, ci: 3, op: 0.10 },
    { x: w - 110, yF: 0.78, r: 22, ci: 5, op: 0.10 },
  ];
  balloonPositions.forEach(b => {
    drawBalloon(ctx, b.x, h * b.yF, b.r, balloonColors[b.ci], b.op);
  });

  // Office items along the edges, position proportional to h
  const officeItems: Array<{
    type: 'cake' | 'coffee' | 'laptop' | 'gift' | 'hat' | 'star';
    xF: number; yF: number; scale?: number; opacity: number;
    size?: number; color?: string;
  }> = [
    // Left edge
    { type: 'hat', xF: 0.03, yF: 0.04, scale: 1.0, opacity: 0.22 },
    { type: 'coffee', xF: 0.02, yF: 0.12, scale: 1.0, opacity: 0.18 },
    { type: 'gift', xF: 0.025, yF: 0.22, scale: 0.9, opacity: 0.16 },
    { type: 'star', xF: 0.015, yF: 0.30, size: 12, color: '#ffd740', opacity: 0.20 },
    { type: 'hat', xF: 0.02, yF: 0.40, scale: 0.8, opacity: 0.15 },
    { type: 'coffee', xF: 0.025, yF: 0.50, scale: 0.85, opacity: 0.14 },
    { type: 'star', xF: 0.015, yF: 0.58, size: 10, color: '#00e5ff', opacity: 0.16 },
    { type: 'gift', xF: 0.02, yF: 0.66, scale: 0.75, opacity: 0.12 },
    { type: 'hat', xF: 0.025, yF: 0.76, scale: 0.7, opacity: 0.12 },
    { type: 'star', xF: 0.015, yF: 0.84, size: 9, color: '#c44dff', opacity: 0.14 },
    { type: 'coffee', xF: 0.02, yF: 0.92, scale: 0.7, opacity: 0.10 },

    // Right edge
    { type: 'laptop', xF: 0.97, yF: 0.05, scale: 0.9, opacity: 0.20 },
    { type: 'star', xF: 0.98, yF: 0.13, size: 11, color: '#ea80fc', opacity: 0.18 },
    { type: 'gift', xF: 0.975, yF: 0.23, scale: 0.85, opacity: 0.16 },
    { type: 'hat', xF: 0.97, yF: 0.33, scale: 0.8, opacity: 0.14 },
    { type: 'star', xF: 0.985, yF: 0.41, size: 10, color: '#ff5252', opacity: 0.16 },
    { type: 'laptop', xF: 0.975, yF: 0.51, scale: 0.75, opacity: 0.12 },
    { type: 'star', xF: 0.98, yF: 0.59, size: 9, color: '#448aff', opacity: 0.14 },
    { type: 'gift', xF: 0.97, yF: 0.67, scale: 0.7, opacity: 0.11 },
    { type: 'hat', xF: 0.975, yF: 0.77, scale: 0.65, opacity: 0.10 },
    { type: 'star', xF: 0.985, yF: 0.85, size: 8, color: '#18ffff', opacity: 0.12 },
    { type: 'coffee', xF: 0.98, yF: 0.93, scale: 0.65, opacity: 0.09 },

    // Mid-area scattered
    { type: 'cake', xF: 0.20, yF: 0.10, scale: 0.8, opacity: 0.14 },
    { type: 'cake', xF: 0.80, yF: 0.12, scale: 0.75, opacity: 0.13 },
    { type: 'star', xF: 0.35, yF: 0.18, size: 12, color: '#ff6b9d', opacity: 0.16 },
    { type: 'star', xF: 0.65, yF: 0.20, size: 10, color: '#c44dff', opacity: 0.15 },
    { type: 'gift', xF: 0.12, yF: 0.45, scale: 0.6, opacity: 0.10 },
    { type: 'gift', xF: 0.88, yF: 0.47, scale: 0.6, opacity: 0.10 },
    { type: 'coffee', xF: 0.25, yF: 0.60, scale: 0.6, opacity: 0.10 },
    { type: 'laptop', xF: 0.75, yF: 0.62, scale: 0.55, opacity: 0.09 },
    { type: 'star', xF: 0.50, yF: 0.70, size: 11, color: '#ffab40', opacity: 0.12 },
    { type: 'hat', xF: 0.15, yF: 0.80, scale: 0.55, opacity: 0.09 },
    { type: 'hat', xF: 0.85, yF: 0.82, scale: 0.55, opacity: 0.09 },
    { type: 'star', xF: 0.40, yF: 0.88, size: 9, color: '#69f0ae', opacity: 0.11 },
    { type: 'star', xF: 0.60, yF: 0.90, size: 8, color: '#ea80fc', opacity: 0.10 },
  ];

  officeItems.forEach(item => {
    const px = item.xF * w;
    const py = item.yF * h;
    const s = item.scale || 1;
    if (item.type === 'cake') drawCakeIcon(ctx, px, py, s, item.opacity);
    else if (item.type === 'coffee') drawCoffeeCup(ctx, px, py, s, item.opacity);
    else if (item.type === 'laptop') drawLaptop(ctx, px, py, s, item.opacity);
    else if (item.type === 'gift') drawGiftBox(ctx, px, py, s, item.opacity);
    else if (item.type === 'hat') drawPartyHat(ctx, px, py, s, item.opacity);
    else if (item.type === 'star' && item.size && item.color) drawStarShape(ctx, px, py, item.size, item.color, item.opacity);
  });
}

export function BirthdayPoster({ empleados }: BirthdayPosterProps) {
  const [generating, setGenerating] = useState(false);

  const generate = useCallback(async () => {
    setGenerating(true);
    try {
      const MARGIN = 100;
      const COLS = 6;
      const COL_GAP = 18;
      const CONTENT_W = PW - MARGIN * 2;
      const CARD_W = (CONTENT_W - COL_GAP * (COLS - 1)) / COLS;
      const CARD_H = 160;
      const CARD_GAP_Y = 10;
      const MONTH_HEADER_H = 95;
      const SECTION_GAP = 20;
      const HEADER_H = 130;
      const FOOTER_H = 100;

      const validEmps = empleados.filter(e => e.fechaNac && e.activo !== false);

      const monthGroups: Empleado[][] = Array.from({ length: 12 }, () => []);
      validEmps.forEach(emp => {
        monthGroups[parseDateLocal(emp.fechaNac).getMonth()].push(emp);
      });
      monthGroups.forEach(group => {
        group.sort((a, b) => parseDateLocal(a.fechaNac).getDate() - parseDateLocal(b.fechaNac).getDate());
      });

      let totalH = HEADER_H;
      monthGroups.forEach(group => {
        if (group.length > 0) {
          const rows = Math.ceil(group.length / COLS);
          totalH += MONTH_HEADER_H + rows * (CARD_H + CARD_GAP_Y) + SECTION_GAP;
        }
      });
      totalH += FOOTER_H;

      const canvas = document.createElement('canvas');
      canvas.width = PW;
      canvas.height = totalH;
      const ctx = canvas.getContext('2d')!;

      // ─── Background ───
      const bgGrad = ctx.createLinearGradient(0, 0, 0, totalH);
      bgGrad.addColorStop(0, '#0a0520');
      bgGrad.addColorStop(0.15, '#0f0a2a');
      bgGrad.addColorStop(0.3, '#150d28');
      bgGrad.addColorStop(0.5, '#120a25');
      bgGrad.addColorStop(0.7, '#0e0822');
      bgGrad.addColorStop(1, '#080418');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, PW, totalH);

      // Warm radial glows
      const g1 = ctx.createRadialGradient(PW * 0.15, totalH * 0.08, 0, PW * 0.15, totalH * 0.08, PW * 0.5);
      g1.addColorStop(0, 'rgba(255,107,157,0.15)');
      g1.addColorStop(0.5, 'rgba(196,77,255,0.05)');
      g1.addColorStop(1, 'transparent');
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, PW, totalH);

      const g2 = ctx.createRadialGradient(PW * 0.85, totalH * 0.05, 0, PW * 0.85, totalH * 0.05, PW * 0.45);
      g2.addColorStop(0, 'rgba(255,171,64,0.12)');
      g2.addColorStop(0.5, 'rgba(255,215,64,0.04)');
      g2.addColorStop(1, 'transparent');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, PW, totalH);

      const g3 = ctx.createRadialGradient(PW * 0.9, totalH * 0.95, 0, PW * 0.9, totalH * 0.95, PW * 0.5);
      g3.addColorStop(0, 'rgba(0,229,255,0.10)');
      g3.addColorStop(1, 'transparent');
      ctx.fillStyle = g3;
      ctx.fillRect(0, 0, PW, totalH);

      const g4 = ctx.createRadialGradient(PW * 0.5, totalH * 0.5, 0, PW * 0.5, totalH * 0.5, PW * 0.6);
      g4.addColorStop(0, 'rgba(196,77,255,0.06)');
      g4.addColorStop(1, 'transparent');
      ctx.fillStyle = g4;
      ctx.fillRect(0, 0, PW, totalH);

      // Confetti
      drawConfetti(ctx, PW, totalH, 150);

      // Bokeh circles
      for (let i = 0; i < 25; i++) {
        const bx = ((i * 2654435761) >>> 0) % PW;
        const by = ((i * 2654435761 * 7) >>> 0) % totalH;
        const br = 30 + ((i * 2654435761 * 13) >>> 0) % 60;
        const bAlpha = 0.02 + ((i * 2654435761 * 17) >>> 0) % 25 / 1000;
        const bgc = i % 3 === 0 ? '255,107,157' : i % 3 === 1 ? '0,229,255' : '196,77,255';
        const bg2 = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        bg2.addColorStop(0, `rgba(${bgc},${bAlpha * 3})`);
        bg2.addColorStop(1, 'transparent');
        ctx.fillStyle = bg2;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
      }

      // Sparkles
      for (let i = 0; i < 60; i++) {
        const sx = ((i * 2654435761 * 3) >>> 0) % PW;
        const sy = ((i * 2654435761 * 11) >>> 0) % totalH;
        const ss = 4 + ((i * 2654435761 * 19) >>> 0) % 10;
        const so = 0.10 + ((i * 2654435761 * 23) >>> 0) % 20 / 100;
        drawSparkle(ctx, sx, sy, ss, so);
      }

      // Office items distributed across full height
      drawOfficeItems(ctx, PW, totalH);

      // ─── Header ───
      ctx.strokeStyle = 'rgba(255,107,157,0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(MARGIN, 20); ctx.lineTo(PW - MARGIN, 20); ctx.stroke();

      ctx.strokeStyle = 'rgba(196,77,255,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(MARGIN, 30); ctx.lineTo(PW - MARGIN, 30); ctx.stroke();

      // Title with multi-layer glow
      ctx.textAlign = 'center';
      const titleY = 78;
      const year = new Date().getFullYear();

      // Outer glow layer
      ctx.shadowColor = 'rgba(255,107,157,0.6)';
      ctx.shadowBlur = 60;
      ctx.fillStyle = 'rgba(255,107,157,0.15)';
      ctx.font = 'bold 62px "Segoe UI", Arial, sans-serif';
      ctx.fillText('CUMPLEAÑEROS', PW / 2, titleY);

      // Mid glow layer
      ctx.shadowColor = 'rgba(196,77,255,0.5)';
      ctx.shadowBlur = 40;
      ctx.fillStyle = 'rgba(196,77,255,0.2)';
      ctx.fillText('CUMPLEAÑEROS', PW / 2, titleY);

      // Main text
      ctx.shadowColor = 'rgba(255,107,157,0.4)';
      ctx.shadowBlur = 25;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 62px "Segoe UI", Arial, sans-serif';
      ctx.fillText('CUMPLEAÑEROS', PW / 2, titleY);
      ctx.shadowBlur = 0;

      // Gradient color overlay on text
      const tg = ctx.createLinearGradient(PW / 2 - 450, titleY - 50, PW / 2 + 450, titleY);
      tg.addColorStop(0, 'rgba(255,107,157,0.0)');
      tg.addColorStop(0.25, 'rgba(255,107,157,0.35)');
      tg.addColorStop(0.5, 'rgba(196,77,255,0.3)');
      tg.addColorStop(0.75, 'rgba(255,171,64,0.35)');
      tg.addColorStop(1, 'rgba(255,107,157,0.0)');
      ctx.fillStyle = tg;
      ctx.fillText('CUMPLEAÑEROS', PW / 2, titleY);

      // Decorative lines flanking the title
      const titleW = 450;
      ctx.strokeStyle = 'rgba(255,107,157,0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(PW / 2 - titleW - 80, titleY - 15);
      ctx.lineTo(PW / 2 - titleW + 20, titleY - 15);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(PW / 2 + titleW - 20, titleY - 15);
      ctx.lineTo(PW / 2 + titleW + 80, titleY - 15);
      ctx.stroke();

      // Small decorative stars near title
      drawStarShape(ctx, PW / 2 - titleW - 100, titleY - 15, 8, '#ff6b9d', 0.4);
      drawStarShape(ctx, PW / 2 + titleW + 100, titleY - 15, 8, '#ff6b9d', 0.4);
      drawStarShape(ctx, PW / 2 - titleW - 130, titleY - 15, 5, '#ffd740', 0.3);
      drawStarShape(ctx, PW / 2 + titleW + 130, titleY - 15, 5, '#ffd740', 0.3);

      // Year
      ctx.font = 'bold 34px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = 'rgba(255,107,157,0.4)';
      ctx.fillText(String(year), PW / 2, 115);

      // Bottom header lines
      ctx.strokeStyle = 'rgba(196,77,255,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(MARGIN, HEADER_H - 8); ctx.lineTo(PW - MARGIN, HEADER_H - 8); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,107,157,0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(MARGIN, HEADER_H - 1); ctx.lineTo(PW - MARGIN, HEADER_H - 1); ctx.stroke();

      ctx.textAlign = 'left';

      // ─── Month sections ───
      let yPos = HEADER_H;
      const photoCache = new Map<string, HTMLImageElement>();

      const monthColors = [
        '#ff6b9d', '#c44dff', '#69f0ae', '#ffab40',
        '#00e5ff', '#ea80fc', '#ff6e40', '#448aff',
        '#ffd740', '#18ffff', '#b388ff', '#ff5252',
      ];

      for (let mi = 0; mi < 12; mi++) {
        const group = monthGroups[mi];
        if (group.length === 0) continue;

        await Promise.all(group.map(async emp => {
          if (emp.foto && !photoCache.has(emp.foto)) {
            try {
              const img = await loadImage(emp.foto);
              photoCache.set(emp.foto, img);
            } catch {}
          }
        }));

        const mc = monthColors[mi];

        // Month header bar
        const mGrad = ctx.createLinearGradient(MARGIN, yPos, PW - MARGIN, yPos);
        mGrad.addColorStop(0, `${mc}22`);
        mGrad.addColorStop(0.3, `${mc}10`);
        mGrad.addColorStop(1, `${mc}03`);
        ctx.fillStyle = mGrad;
        roundRect(ctx, MARGIN, yPos, CONTENT_W, MONTH_HEADER_H - 10, 12);
        ctx.fill();

        // Left accent bar
        ctx.fillStyle = `${mc}99`;
        roundRect(ctx, MARGIN, yPos, 8, MONTH_HEADER_H - 10, 4);
        ctx.fill();

        // Month name
        ctx.fillStyle = mc;
        ctx.font = 'bold 52px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(MONTHS[mi], MARGIN + 25, yPos + 58);

        // Employee count
        ctx.fillStyle = `${mc}80`;
        ctx.font = '24px "Segoe UI", Arial, sans-serif';
        ctx.fillText(
          `${group.length} cumpleañero${group.length > 1 ? 's' : ''}`,
          MARGIN + 25, yPos + 88
        );

        // Decorative dots
        ctx.fillStyle = `${mc}30`;
        for (let d = 0; d < 4; d++) {
          ctx.beginPath();
          ctx.arc(PW - MARGIN - 30 - d * 28, yPos + 48, 5, 0, Math.PI * 2);
          ctx.fill();
        }

        yPos += MONTH_HEADER_H;

        // Employee cards
        group.forEach((emp, idx) => {
          const col = idx % COLS;
          const row = Math.floor(idx / COLS);
          const x = MARGIN + col * (CARD_W + COL_GAP);
          const y = yPos + row * (CARD_H + CARD_GAP_Y);

          const isToday = isBirthdayToday(emp.fechaNac);

          // Card bg
          const cardGrad = ctx.createLinearGradient(x, y, x + CARD_W, y + CARD_H);
          cardGrad.addColorStop(0, 'rgba(18,10,40,0.88)');
          cardGrad.addColorStop(1, 'rgba(10,6,25,0.82)');
          ctx.fillStyle = cardGrad;
          roundRect(ctx, x, y, CARD_W, CARD_H, 10);
          ctx.fill();

          // Card border
          ctx.strokeStyle = isToday ? 'rgba(255,171,64,0.4)' : `${mc}25`;
          ctx.lineWidth = isToday ? 2.5 : 1.5;
          roundRect(ctx, x, y, CARD_W, CARD_H, 10);
          ctx.stroke();

          // Left accent
          ctx.fillStyle = isToday ? '#ffab40' : `${mc}80`;
          roundRect(ctx, x, y + 8, 5, CARD_H - 16, 2.5);
          ctx.fill();

          // Photo
          const photoR = 56;
          const photoX = x + 75;
          const photoY = y + CARD_H / 2;

          ctx.beginPath();
          ctx.arc(photoX, photoY, photoR + 5, 0, Math.PI * 2);
          ctx.strokeStyle = isToday ? 'rgba(255,171,64,0.4)' : `${mc}30`;
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(photoX, photoY, photoR + 2, 0, Math.PI * 2);
          ctx.strokeStyle = isToday ? 'rgba(255,171,64,0.2)' : `${mc}15`;
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.save();
          ctx.beginPath();
          ctx.arc(photoX, photoY, photoR, 0, Math.PI * 2);
          ctx.clip();

          const photo = emp.foto ? photoCache.get(emp.foto) : null;
          if (photo) {
            ctx.drawImage(photo, photoX - photoR, photoY - photoR, photoR * 2, photoR * 2);
          } else {
            const fg = ctx.createRadialGradient(photoX, photoY, 0, photoX, photoY, photoR);
            fg.addColorStop(0, mc);
            fg.addColorStop(1, '#120a28');
            ctx.fillStyle = fg;
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 38px "Segoe UI", Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(getInitials(emp), photoX, photoY + 13);
          }
          ctx.restore();

          // Text info
          const textX = x + 145;
          ctx.textAlign = 'left';

          // Name
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
          ctx.fillText(truncate(emp.nombres || '', 18), textX, y + 58);
          ctx.fillText(truncate(emp.apellidos || '', 18), textX, y + 88);

          // Date
          const bdate = parseDateLocal(emp.fechaNac);
          const day = bdate.getDate();
          const dateStr = `${day} de ${MONTHS[bdate.getMonth()]}`;
          ctx.fillStyle = isToday ? '#ffab40' : mc;
          ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
          ctx.fillText(dateStr, textX, y + 122);

          // Today badge
          if (isToday) {
            const badgeText = '★ HOY';
            ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
            const bw = ctx.measureText(badgeText).width + 20;
            ctx.fillStyle = '#ffab40';
            roundRect(ctx, x + CARD_W - bw - 12, y + 8, bw, 28, 7);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(badgeText, x + CARD_W - bw / 2 - 12, y + 27);
            ctx.textAlign = 'left';
          }
        });

        const rows = Math.ceil(group.length / COLS);
        yPos += rows * (CARD_H + CARD_GAP_Y) + SECTION_GAP;
      }

      // ─── Footer ───
      ctx.strokeStyle = 'rgba(196,77,255,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(MARGIN, totalH - FOOTER_H + 15); ctx.lineTo(PW - MARGIN, totalH - FOOTER_H + 15); ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,107,157,0.3)';
      ctx.font = '24px "Segoe UI", Arial, sans-serif';
      ctx.fillText('SCA — Sistema de Control Administrativo', PW / 2, totalH - 48);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.font = '18px "Segoe UI", Arial, sans-serif';
      ctx.fillText(
        `Generado el ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}`,
        PW / 2, totalH - 18
      );

      // Download
      const link = document.createElement('a');
      link.download = `cumpleanos-${year}-A3.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setGenerating(false);
    }
  }, [empleados]);

  return (
    <Button
      size="sm"
      onClick={generate}
      disabled={generating}
      className="bg-pink-500/10 text-pink-400 border border-pink-500/30 hover:bg-pink-500/20"
    >
      {generating ? (
        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-1 h-4 w-4" />
      )}
      Descargar Poster A3
    </Button>
  );
}
