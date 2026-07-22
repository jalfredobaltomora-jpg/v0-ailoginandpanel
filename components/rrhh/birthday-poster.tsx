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

// A3 landscape @ 300 DPI → 5011 x 3543
const PW = 5011;
const PH = 3543;

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

function fallbackImg(initials: string): HTMLImageElement {
  const c = document.createElement('canvas');
  c.width = 200; c.height = 200;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(100, 100, 0, 100, 100, 100);
  g.addColorStop(0, '#00eeff');
  g.addColorStop(1, '#0a1628');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(100, 100, 100, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 56px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(initials, 100, 120);
  const img = new Image();
  img.src = c.toDataURL();
  return img;
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
      const CARD_H = 220;
      const CARD_GAP_Y = 35;
      const MONTH_HEADER_H = 170;
      const SECTION_GAP = 70;
      const HEADER_H = 380;
      const FOOTER_H = 140;

      const validEmps = empleados.filter(e => e.fechaNac && e.activo !== false);

      const monthGroups: Empleado[][] = Array.from({ length: 12 }, () => []);
      validEmps.forEach(emp => {
        monthGroups[parseDateLocal(emp.fechaNac).getMonth()].push(emp);
      });
      monthGroups.forEach(group => {
        group.sort((a, b) => parseDateLocal(a.fechaNac).getDate() - parseDateLocal(b.fechaNac).getDate());
      });

      // Calculate total height
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
      const bgGrad = ctx.createLinearGradient(0, 0, PW, totalH);
      bgGrad.addColorStop(0, '#070b15');
      bgGrad.addColorStop(0.25, '#0c1322');
      bgGrad.addColorStop(0.5, '#0a1020');
      bgGrad.addColorStop(0.75, '#0d1528');
      bgGrad.addColorStop(1, '#050810');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, PW, totalH);

      // ─── Grid pattern ───
      ctx.strokeStyle = 'rgba(0,238,255,0.018)';
      ctx.lineWidth = 0.8;
      for (let x = 0; x < PW; x += 80) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, totalH); ctx.stroke();
      }
      for (let y = 0; y < totalH; y += 80) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(PW, y); ctx.stroke();
      }

      // ─── Corner decorations ───
      const drawCornerDeco = (ox: number, oy: number, dx: number, dy: number) => {
        ctx.strokeStyle = 'rgba(0,238,255,0.15)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(ox, oy + dy * 60); ctx.lineTo(ox, oy); ctx.lineTo(ox + dx * 60, oy); ctx.stroke();
        ctx.strokeStyle = 'rgba(0,238,255,0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(ox, oy + dy * 40); ctx.lineTo(ox, oy); ctx.lineTo(ox + dx * 40, oy); ctx.stroke();
      };
      drawCornerDeco(MARGIN - 30, 80, 1, 1);
      drawCornerDeco(PW - MARGIN + 30, 80, -1, 1);
      drawCornerDeco(MARGIN - 30, totalH - 110, 1, -1);
      drawCornerDeco(PW - MARGIN + 30, totalH - 110, -1, -1);

      // ─── Header ───
      // Top decorative lines
      ctx.strokeStyle = 'rgba(0,238,255,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(MARGIN, 110); ctx.lineTo(PW - MARGIN, 110); ctx.stroke();

      ctx.strokeStyle = 'rgba(0,238,255,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(MARGIN, 125); ctx.lineTo(PW - MARGIN, 125); ctx.stroke();

      // Main title
      ctx.textAlign = 'center';
      ctx.fillStyle = '#00eeff';
      ctx.font = 'bold 120px "Segoe UI", Arial, sans-serif';
      ctx.shadowColor = 'rgba(0,238,255,0.3)';
      ctx.shadowBlur = 30;
      ctx.fillText('CUMPLEAÑEROS', PW / 2, 220);
      ctx.shadowBlur = 0;

      // Subtitle
      ctx.font = 'bold 80px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = 'rgba(0,238,255,0.5)';
      ctx.fillText('DEL AÑO', PW / 2, 300);

      // Year
      const year = new Date().getFullYear();
      ctx.font = 'bold 160px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,238,255,0.4)';
      ctx.shadowBlur = 40;
      ctx.fillText(String(year), PW / 2, 375);
      ctx.shadowBlur = 0;

      // Bottom header lines
      ctx.strokeStyle = 'rgba(0,238,255,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(MARGIN, HEADER_H - 25); ctx.lineTo(PW - MARGIN, HEADER_H - 25); ctx.stroke();

      ctx.strokeStyle = 'rgba(0,238,255,0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(MARGIN, HEADER_H - 10); ctx.lineTo(PW - MARGIN, HEADER_H - 10); ctx.stroke();

      ctx.textAlign = 'left';

      // ─── Month sections ───
      let yPos = HEADER_H;
      const photoCache = new Map<string, HTMLImageElement>();

      for (let mi = 0; mi < 12; mi++) {
        const group = monthGroups[mi];
        if (group.length === 0) continue;

        // Load photos
        await Promise.all(group.map(async emp => {
          if (emp.foto && !photoCache.has(emp.foto)) {
            try {
              const img = await loadImage(emp.foto);
              photoCache.set(emp.foto, img);
            } catch {}
          }
        }));

        // ─── Month header bar ───
        const mGrad = ctx.createLinearGradient(MARGIN, yPos, PW - MARGIN, yPos);
        mGrad.addColorStop(0, 'rgba(0,238,255,0.18)');
        mGrad.addColorStop(0.4, 'rgba(0,238,255,0.08)');
        mGrad.addColorStop(1, 'rgba(0,238,255,0.02)');
        ctx.fillStyle = mGrad;
        roundRect(ctx, MARGIN, yPos, CONTENT_W, MONTH_HEADER_H - 15, 16);
        ctx.fill();

        // Left accent bar
        ctx.fillStyle = 'rgba(0,238,255,0.6)';
        roundRect(ctx, MARGIN, yPos, 10, MONTH_HEADER_H - 15, 5);
        ctx.fill();

        // Month abbr
        ctx.fillStyle = '#00eeff';
        ctx.font = 'bold 80px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(MONTHS[mi].slice(0, 3).toUpperCase(), MARGIN + 120, yPos + 95);

        // Month name
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 64px "Segoe UI", Arial, sans-serif';
        ctx.fillText(MONTHS[mi], MARGIN + 200, yPos + 78);

        // Employee count
        ctx.fillStyle = 'rgba(0,238,255,0.45)';
        ctx.font = '34px "Segoe UI", Arial, sans-serif';
        ctx.fillText(
          `${group.length} cumpleañero${group.length > 1 ? 's' : ''}`,
          MARGIN + 200, yPos + 125
        );

        // Decorative dots
        ctx.fillStyle = 'rgba(0,238,255,0.15)';
        for (let d = 0; d < 4; d++) {
          ctx.beginPath();
          ctx.arc(PW - MARGIN - 40 - d * 35, yPos + 75, 6, 0, Math.PI * 2);
          ctx.fill();
        }

        yPos += MONTH_HEADER_H;

        // ─── Employee cards ───
        group.forEach((emp, idx) => {
          const col = idx % COLS;
          const row = Math.floor(idx / COLS);
          const x = MARGIN + col * (CARD_W + COL_GAP);
          const y = yPos + row * (CARD_H + CARD_GAP_Y);

          // Card bg
          const cardGrad = ctx.createLinearGradient(x, y, x + CARD_W, y);
          cardGrad.addColorStop(0, 'rgba(12,19,34,0.92)');
          cardGrad.addColorStop(1, 'rgba(8,13,25,0.8)');
          ctx.fillStyle = cardGrad;
          roundRect(ctx, x, y, CARD_W, CARD_H, 14);
          ctx.fill();

          // Card border
          ctx.strokeStyle = 'rgba(0,238,255,0.1)';
          ctx.lineWidth = 1.5;
          roundRect(ctx, x, y, CARD_W, CARD_H, 14);
          ctx.stroke();

          // Left accent
          const isToday = isBirthdayToday(emp.fechaNac);
          ctx.fillStyle = isToday ? '#fb923c' : 'rgba(0,238,255,0.5)';
          roundRect(ctx, x, y + 8, 6, CARD_H - 16, 3);
          ctx.fill();

          // ─── Photo ───
          const photoR = 58;
          const photoX = x + 105;
          const photoY = y + CARD_H / 2;

          // Photo outer ring
          ctx.beginPath();
          ctx.arc(photoX, photoY, photoR + 5, 0, Math.PI * 2);
          ctx.strokeStyle = isToday ? 'rgba(251,146,60,0.5)' : 'rgba(0,238,255,0.2)';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Inner ring
          ctx.beginPath();
          ctx.arc(photoX, photoY, photoR + 2, 0, Math.PI * 2);
          ctx.strokeStyle = isToday ? 'rgba(251,146,60,0.25)' : 'rgba(0,238,255,0.1)';
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
            fg.addColorStop(0, '#00eeff');
            fg.addColorStop(1, '#0a1628');
            ctx.fillStyle = fg;
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 40px "Segoe UI", Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(getInitials(emp), photoX, photoY + 14);
          }
          ctx.restore();

          // ─── Text info ───
          const textX = x + 190;
          ctx.textAlign = 'left';

          // Name
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
          ctx.fillText(truncate(emp.nombres || '', 22), textX, y + 80);
          ctx.fillText(truncate(emp.apellidos || '', 22), textX, y + 125);

          // Cargo
          ctx.fillStyle = 'rgba(0,238,255,0.4)';
          ctx.font = '26px "Segoe UI", Arial, sans-serif';
          ctx.fillText(emp.cargo || '', textX, y + 165);

          // Date
          const bdate = parseDateLocal(emp.fechaNac);
          const day = bdate.getDate();
          const dateStr = `${day} de ${MONTHS[bdate.getMonth()]}`;
          ctx.fillStyle = isToday ? '#fb923c' : '#00eeff';
          ctx.font = 'bold 30px "Segoe UI", Arial, sans-serif';
          ctx.fillText(dateStr, textX, y + 205);

          // Age
          const edad = calcEdad(emp.fechaNac);
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.font = '24px "Segoe UI", Arial, sans-serif';
          ctx.fillText(`${edad} años`, textX + ctx.measureText(dateStr).width + 20, y + 205);

          // Today badge
          if (isToday) {
            const badgeText = '★ HOY';
            ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
            const bw = ctx.measureText(badgeText).width + 30;
            ctx.fillStyle = '#fb923c';
            roundRect(ctx, x + CARD_W - bw - 25, y + 18, bw, 40, 10);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(badgeText, x + CARD_W - bw / 2 - 25, y + 45);
            ctx.textAlign = 'left';
          }
        });

        const rows = Math.ceil(group.length / COLS);
        yPos += rows * (CARD_H + CARD_GAP_Y) + SECTION_GAP;
      }

      // ─── Footer ───
      ctx.strokeStyle = 'rgba(0,238,255,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(MARGIN, totalH - FOOTER_H + 20); ctx.lineTo(PW - MARGIN, totalH - FOOTER_H + 20); ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,238,255,0.25)';
      ctx.font = '26px "Segoe UI", Arial, sans-serif';
      ctx.fillText('SCA — Sistema de Control Administrativo', PW / 2, totalH - 60);
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
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
      className="bg-[#00eeff]/10 text-[#00eeff] border border-[#00eeff]/30 hover:bg-[#00eeff]/20"
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
