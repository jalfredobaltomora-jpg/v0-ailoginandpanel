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

function calcEdad(fechaNac: string): number {
  const b = parseDateLocal(fechaNac);
  const t = new Date();
  let age = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
  return age;
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
  // Balloon body
  const bg = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.3, r * 0.1, cx, cy, r);
  bg.addColorStop(0, '#ffffff');
  bg.addColorStop(0.3, color);
  bg.addColorStop(1, '#000000');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 0.82, r, 0, 0, Math.PI * 2);
  ctx.fill();
  // Knot
  ctx.beginPath();
  ctx.moveTo(cx - 4, cy + r);
  ctx.lineTo(cx, cy + r + 14);
  ctx.lineTo(cx + 4, cy + r);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  // String
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy + r + 14);
  ctx.quadraticCurveTo(cx + 15, cy + r + 60, cx - 5, cy + r + 100);
  ctx.stroke();
  // Shine
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
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
    const alpha = 0.08 + ((seed >>> 12) % 12) / 100;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = colors[ci];

    if (i % 3 === 0) {
      // Rectangle confetti
      ctx.fillRect(-size / 2, -size * 0.3, size, size * 0.6);
    } else if (i % 3 === 1) {
      // Circle confetti
      ctx.beginPath();
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Star confetti
      ctx.beginPath();
      for (let p = 0; p < 5; p++) {
        const angle = (p * 72 - 90) * Math.PI / 180;
        const outerX = Math.cos(angle) * size / 2;
        const outerY = Math.sin(angle) * size / 2;
        const innerAngle = ((p * 72 + 36) - 90) * Math.PI / 180;
        const innerX = Math.cos(innerAngle) * size / 4;
        const innerY = Math.sin(innerAngle) * size / 4;
        if (p === 0) ctx.moveTo(outerX, outerY);
        else ctx.lineTo(outerX, outerY);
        ctx.lineTo(innerX, innerY);
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
  // 4-point star
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
  cx: number, cy: number, scale: number,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  // Plate
  ctx.fillStyle = 'rgba(0,238,255,0.15)';
  ctx.beginPath();
  ctx.ellipse(0, 40, 70, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cake body
  const cakeGrad = ctx.createLinearGradient(-50, -10, 50, 40);
  cakeGrad.addColorStop(0, '#1a1a3e');
  cakeGrad.addColorStop(1, '#0d0d2b');
  ctx.fillStyle = cakeGrad;
  roundRect(ctx, -50, -10, 100, 50, 8);
  ctx.fill();

  // Frosting
  ctx.fillStyle = '#ff6b9d';
  ctx.beginPath();
  for (let i = 0; i <= 100; i += 5) {
    const fx = -50 + i;
    const fy = -10 + Math.sin(i * 0.15) * 8;
    if (i === 0) ctx.moveTo(fx, fy);
    else ctx.lineTo(fx, fy);
  }
  ctx.lineTo(50, -10);
  ctx.lineTo(-50, -10);
  ctx.closePath();
  ctx.fill();

  // Candle
  ctx.fillStyle = '#00e5ff';
  ctx.fillRect(-3, -35, 6, 28);

  // Flame
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

export function BirthdayPoster({ empleados }: BirthdayPosterProps) {
  const [generating, setGenerating] = useState(false);

  const generate = useCallback(async () => {
    setGenerating(true);
    try {
      const MARGIN = 140;
      const COLS = 4;
      const COL_GAP = 50;
      const CONTENT_W = PW - MARGIN * 2;
      const CARD_W = (CONTENT_W - COL_GAP * (COLS - 1)) / COLS;
      const CARD_H = 200;
      const CARD_GAP_Y = 30;
      const MONTH_HEADER_H = 160;
      const SECTION_GAP = 60;
      const HEADER_H = 400;
      const FOOTER_H = 140;

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

      // ─── Rich background ───
      // Base dark gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, totalH);
      bgGrad.addColorStop(0, '#0a0520');
      bgGrad.addColorStop(0.15, '#0f0a2a');
      bgGrad.addColorStop(0.3, '#150d28');
      bgGrad.addColorStop(0.5, '#120a25');
      bgGrad.addColorStop(0.7, '#0e0822');
      bgGrad.addColorStop(1, '#080418');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, PW, totalH);

      // Warm radial glow top-left (pink/magenta)
      const g1 = ctx.createRadialGradient(PW * 0.15, totalH * 0.08, 0, PW * 0.15, totalH * 0.08, PW * 0.5);
      g1.addColorStop(0, 'rgba(255,107,157,0.12)');
      g1.addColorStop(0.5, 'rgba(196,77,255,0.04)');
      g1.addColorStop(1, 'transparent');
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, PW, totalH);

      // Warm radial glow top-right (gold/orange)
      const g2 = ctx.createRadialGradient(PW * 0.85, totalH * 0.05, 0, PW * 0.85, totalH * 0.05, PW * 0.45);
      g2.addColorStop(0, 'rgba(255,171,64,0.10)');
      g2.addColorStop(0.5, 'rgba(255,215,64,0.03)');
      g2.addColorStop(1, 'transparent');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, PW, totalH);

      // Cool glow bottom-right (cyan/teal)
      const g3 = ctx.createRadialGradient(PW * 0.9, totalH * 0.95, 0, PW * 0.9, totalH * 0.95, PW * 0.5);
      g3.addColorStop(0, 'rgba(0,229,255,0.08)');
      g3.addColorStop(1, 'transparent');
      ctx.fillStyle = g3;
      ctx.fillRect(0, 0, PW, totalH);

      // Mid-page warm glow
      const g4 = ctx.createRadialGradient(PW * 0.5, totalH * 0.5, 0, PW * 0.5, totalH * 0.5, PW * 0.6);
      g4.addColorStop(0, 'rgba(196,77,255,0.05)');
      g4.addColorStop(1, 'transparent');
      ctx.fillStyle = g4;
      ctx.fillRect(0, 0, PW, totalH);

      // Confetti layer
      drawConfetti(ctx, PW, totalH, 120);

      // Subtle radial bokeh circles
      for (let i = 0; i < 20; i++) {
        const bx = ((i * 2654435761) >>> 0) % PW;
        const by = ((i * 2654435761 * 7) >>> 0) % totalH;
        const br = 30 + ((i * 2654435761 * 13) >>> 0) % 60;
        const bAlpha = 0.015 + ((i * 2654435761 * 17) >>> 0) % 20 / 1000;
        const bgc = i % 3 === 0 ? '255,107,157' : i % 3 === 1 ? '0,229,255' : '196,77,255';
        const bg2 = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        bg2.addColorStop(0, `rgba(${bgc},${bAlpha * 2})`);
        bg2.addColorStop(1, 'transparent');
        ctx.fillStyle = bg2;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
      }

      // Sparkles scattered
      for (let i = 0; i < 50; i++) {
        const sx = ((i * 2654435761 * 3) >>> 0) % PW;
        const sy = ((i * 2654435761 * 11) >>> 0) % totalH;
        const ss = 3 + ((i * 2654435761 * 19) >>> 0) % 8;
        const so = 0.06 + ((i * 2654435761 * 23) >>> 0) % 15 / 100;
        drawSparkle(ctx, sx, sy, ss, so);
      }

      // ─── Header decorative lines ───
      ctx.strokeStyle = 'rgba(255,107,157,0.25)';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(MARGIN, 100); ctx.lineTo(PW - MARGIN, 100); ctx.stroke();

      ctx.strokeStyle = 'rgba(196,77,255,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(MARGIN, 115); ctx.lineTo(PW - MARGIN, 115); ctx.stroke();

      // Balloons in header corners
      drawBalloon(ctx, 280, 170, 55, '#ff6b9d', 0.35);
      drawBalloon(ctx, 400, 140, 45, '#c44dff', 0.25);
      drawBalloon(ctx, PW - 280, 170, 55, '#00e5ff', 0.30);
      drawBalloon(ctx, PW - 400, 145, 45, '#ffab40', 0.25);
      drawBalloon(ctx, 530, 160, 40, '#69f0ae', 0.20);
      drawBalloon(ctx, PW - 530, 155, 40, '#ea80fc', 0.20);

      // Cake icon center-top
      drawCakeIcon(ctx, PW / 2, 160, 1.4);

      // ─── Title ───
      ctx.textAlign = 'center';

      // Main title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 130px "Segoe UI", Arial, sans-serif';
      ctx.shadowColor = 'rgba(255,107,157,0.5)';
      ctx.shadowBlur = 50;
      ctx.fillText('CUMPLEAÑEROS', PW / 2, 260);
      ctx.shadowBlur = 0;

      // Gradient overlay on title
      const titleGrad = ctx.createLinearGradient(PW / 2 - 500, 230, PW / 2 + 500, 230);
      titleGrad.addColorStop(0, 'rgba(255,107,157,0.0)');
      titleGrad.addColorStop(0.3, 'rgba(255,107,157,0.35)');
      titleGrad.addColorStop(0.5, 'rgba(196,77,255,0.3)');
      titleGrad.addColorStop(0.7, 'rgba(255,171,64,0.35)');
      titleGrad.addColorStop(1, 'rgba(255,107,157,0.0)');
      ctx.fillStyle = titleGrad;
      ctx.fillText('CUMPLEAÑEROS', PW / 2, 260);

      // Subtitle
      ctx.font = 'bold 80px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = 'rgba(255,107,157,0.45)';
      ctx.fillText('DEL AÑO', PW / 2, 335);

      // Year
      const year = new Date().getFullYear();
      ctx.font = 'bold 140px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(196,77,255,0.4)';
      ctx.shadowBlur = 40;
      ctx.fillText(String(year), PW / 2, 405);
      ctx.shadowBlur = 0;

      // Bottom header lines
      ctx.strokeStyle = 'rgba(196,77,255,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(MARGIN, HEADER_H - 20); ctx.lineTo(PW - MARGIN, HEADER_H - 20); ctx.stroke();

      ctx.strokeStyle = 'rgba(255,107,157,0.3)';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(MARGIN, HEADER_H - 5); ctx.lineTo(PW - MARGIN, HEADER_H - 5); ctx.stroke();

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

        // ─── Month header bar ───
        const mGrad = ctx.createLinearGradient(MARGIN, yPos, PW - MARGIN, yPos);
        mGrad.addColorStop(0, `${mc}22`);
        mGrad.addColorStop(0.3, `${mc}10`);
        mGrad.addColorStop(1, `${mc}03`);
        ctx.fillStyle = mGrad;
        roundRect(ctx, MARGIN, yPos, CONTENT_W, MONTH_HEADER_H - 10, 16);
        ctx.fill();

        // Left accent bar
        ctx.fillStyle = `${mc}99`;
        roundRect(ctx, MARGIN, yPos, 10, MONTH_HEADER_H - 10, 5);
        ctx.fill();

        // Month abbr
        ctx.fillStyle = mc;
        ctx.font = 'bold 76px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(MONTHS[mi].slice(0, 3).toUpperCase(), MARGIN + 120, yPos + 90);

        // Month name
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 60px "Segoe UI", Arial, sans-serif';
        ctx.fillText(MONTHS[mi], MARGIN + 200, yPos + 75);

        // Employee count
        ctx.fillStyle = `${mc}80`;
        ctx.font = '32px "Segoe UI", Arial, sans-serif';
        ctx.fillText(
          `${group.length} cumpleañero${group.length > 1 ? 's' : ''}`,
          MARGIN + 200, yPos + 120
        );

        // Decorative dots
        ctx.fillStyle = `${mc}30`;
        for (let d = 0; d < 4; d++) {
          ctx.beginPath();
          ctx.arc(PW - MARGIN - 40 - d * 35, yPos + 70, 6, 0, Math.PI * 2);
          ctx.fill();
        }

        yPos += MONTH_HEADER_H;

        // ─── Employee cards ───
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
          roundRect(ctx, x, y, CARD_W, CARD_H, 14);
          ctx.fill();

          // Card border glow
          ctx.strokeStyle = isToday ? 'rgba(255,171,64,0.4)' : `${mc}25`;
          ctx.lineWidth = isToday ? 2.5 : 1.5;
          roundRect(ctx, x, y, CARD_W, CARD_H, 14);
          ctx.stroke();

          // Left accent
          ctx.fillStyle = isToday ? '#ffab40' : `${mc}80`;
          roundRect(ctx, x, y + 8, 6, CARD_H - 16, 3);
          ctx.fill();

          // ─── Photo ───
          const photoR = 56;
          const photoX = x + 100;
          const photoY = y + CARD_H / 2;

          // Outer glow ring
          ctx.beginPath();
          ctx.arc(photoX, photoY, photoR + 6, 0, Math.PI * 2);
          ctx.strokeStyle = isToday ? 'rgba(255,171,64,0.4)' : `${mc}30`;
          ctx.lineWidth = 2;
          ctx.stroke();

          // Inner ring
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
            ctx.font = 'bold 40px "Segoe UI", Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(getInitials(emp), photoX, photoY + 14);
          }
          ctx.restore();

          // ─── Text info ───
          const textX = x + 180;
          ctx.textAlign = 'left';

          // Name
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 34px "Segoe UI", Arial, sans-serif';
          ctx.fillText(truncate(emp.nombres || '', 24), textX, y + 78);
          ctx.fillText(truncate(emp.apellidos || '', 24), textX, y + 120);

          // Date
          const bdate = parseDateLocal(emp.fechaNac);
          const day = bdate.getDate();
          const dateStr = `${day} de ${MONTHS[bdate.getMonth()]}`;
          ctx.fillStyle = isToday ? '#ffab40' : mc;
          ctx.font = 'bold 28px "Segoe UI", Arial, sans-serif';
          ctx.fillText(dateStr, textX, y + 162);

          // Age
          const edad = calcEdad(emp.fechaNac);
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.font = '24px "Segoe UI", Arial, sans-serif';
          ctx.fillText(`${edad} años`, textX + ctx.measureText(dateStr).width + 20, y + 162);

          // Today badge
          if (isToday) {
            const badgeText = '★ HOY';
            ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
            const bw = ctx.measureText(badgeText).width + 30;
            ctx.fillStyle = '#ffab40';
            roundRect(ctx, x + CARD_W - bw - 25, y + 15, bw, 40, 10);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(badgeText, x + CARD_W - bw / 2 - 25, y + 42);
            ctx.textAlign = 'left';
          }
        });

        const rows = Math.ceil(group.length / COLS);
        yPos += rows * (CARD_H + CARD_GAP_Y) + SECTION_GAP;
      }

      // ─── Footer ───
      ctx.strokeStyle = 'rgba(196,77,255,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(MARGIN, totalH - FOOTER_H + 20); ctx.lineTo(PW - MARGIN, totalH - FOOTER_H + 20); ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,107,157,0.3)';
      ctx.font = '26px "Segoe UI", Arial, sans-serif';
      ctx.fillText('SCA — Sistema de Control Administrativo', PW / 2, totalH - 60);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.font = '20px "Segoe UI", Arial, sans-serif';
      ctx.fillText(
        `Generado el ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}`,
        PW / 2, totalH - 25
      );

      // ─── Download ───
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
