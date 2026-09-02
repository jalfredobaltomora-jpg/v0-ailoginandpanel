'use client';

import { useRef, useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { EquipoInventario } from '@/lib/firebase';
import { generateQR, drawQRToCanvas } from '@/lib/qrcode-generator';

interface QRLabelProps {
  equipo: EquipoInventario;
  empleadoNombre: string;
  size?: number;
}

function buildQRUrl(equipo: EquipoInventario): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const serial = encodeURIComponent(equipo.serialNumber);
  return `${origin}/inventario/equipo?serial=${serial}`;
}

function buildLabelLines(equipo: EquipoInventario, empleadoNombre: string) {
  return {
    asignado: [
      { label: 'Código', value: equipo.empleadoAsignado || 'Sin asignar' },
      { label: 'Nombre', value: empleadoNombre || 'Sin asignar' },
    ],
    equipo: [
      { label: 'Marca', value: equipo.marca || '-' },
      { label: 'Modelo', value: equipo.modelo || '-' },
      { label: 'Serie', value: equipo.serialNumber },
      { label: 'Fecha', value: equipo.mesInventario || '-' },
    ],
  };
}

export function QRLabel({ equipo, empleadoNombre, size = 120 }: QRLabelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [qrError, setQrError] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setQrError(false);
    container.innerHTML = '';

    try {
      const qrUrl = buildQRUrl(equipo);
      const { matrix, size: qrSize } = generateQR(qrUrl);

      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      canvas.style.display = 'block';

      const ctx = canvas.getContext('2d');
      if (!ctx) { setQrError(true); return; }

      drawQRToCanvas(ctx, matrix, qrSize, size, { quietZone: 2 });
      container.appendChild(canvas);
    } catch (e) {
      console.warn('QR generation error:', e);
      setQrError(true);
    }
  }, [equipo, empleadoNombre, size]);

  const getCanvasDataUrl = (): string | null => {
    const canvas = containerRef.current?.querySelector('canvas');
    if (!canvas) return null;
    try { return canvas.toDataURL('image/png'); } catch { return null; }
  };

  const handlePrint = () => {
    const dataUrl = getCanvasDataUrl();
    if (!dataUrl) return;
    const { asignado, equipo: eqData } = buildLabelLines(equipo, empleadoNombre);
    const tipo = equipo.tipo === 'tablet' ? 'Tablet' : 'Scanner';
    const html = `<!DOCTYPE html><html><head>
      <title>Etiqueta - ${equipo.serialNumber}</title>
      <style>
        @page { size: 50mm 25mm; margin: 0; }
        body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; width: 50mm; height: 25mm; overflow: hidden; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .label { width: 50mm; height: 25mm; box-sizing: border-box; border: 1px solid #1a365d; display: flex; flex-direction: column; background: #fff; }
        .header { background: linear-gradient(135deg, #1a365d, #2b6cb0); color: #fff; padding: 1.5px 4px; display: flex; justify-content: space-between; align-items: center; font-size: 7px; letter-spacing: 0.5px; }
        .header .title { font-weight: 700; text-transform: uppercase; }
        .header .badge { background: rgba(255,255,255,0.2); padding: 2px 5px; border-radius: 3px; font-size: 6px; font-weight: 600; }
        .body { flex: 1; display: flex; min-height: 0; }
        .info { width: 30mm; padding: 2px 0 0 4px; display: flex; flex-direction: column; gap: 0; justify-content: flex-start; box-sizing: border-box; }
        .section-label { font-size: 5px; font-weight: 700; color: #2b6cb0; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.3; }
        .row { display: flex; font-size: 6px; line-height: 1.3; }
        .row .lbl { color: #718096; min-width: 22px; font-weight: 500; }
        .row .val { color: #1a202c; font-weight: 600; }
        .qr-side { width: 20mm; display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; }
        .qr-side img { width: 18mm; height: 18mm; display: block; }
        .footer { padding: 1px 4px; font-size: 5px; color: #a0aec0; display: flex; justify-content: space-between; }
        @media print { body { margin: 0; padding: 0; } }
      </style></head><body>
      <div class="label">
        <div class="header">
          <span class="title">Inventario de Equipo</span>
          <span class="badge">${tipo}</span>
        </div>
        <div class="body">
          <div class="info">
            <div class="section-label">Asignado a</div>
            ${asignado.map(r => `<div class="row"><span class="lbl">${r.label}:</span><span class="val">${r.value}</span></div>`).join('')}
            <div class="section-label">Equipo</div>
            ${eqData.map(r => `<div class="row"><span class="lbl">${r.label}:</span><span class="val">${r.value}</span></div>`).join('')}
          </div>
          <div class="qr-side">
            <img src="${dataUrl}" alt="QR" id="qr-img" />
          </div>
        </div>
        <div class="footer">
          <span>${equipo.serialNumber}</span>
          <span>${new Date().toLocaleDateString('es-MX')}</span>
        </div>
      </div>
    </body></html>`;
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:-9999px;bottom:-9999px;width:1px;height:1px;border:none';
    document.body.appendChild(iframe);
    const win = iframe.contentWindow;
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
    const cleanup = () => { if (iframe.parentNode) iframe.parentNode.removeChild(iframe); window.focus(); };
    const img = win.document.getElementById('qr-img') as HTMLImageElement | null;
    if (img) {
      const doPrint = () => { win.print(); cleanup(); };
      img.onload = doPrint;
      img.onerror = doPrint;
      if (img.complete) doPrint();
    } else {
      win.print(); cleanup();
    }
  };

  return (
    <div className="flex flex-col items-center gap-1" onClick={(e) => e.stopPropagation()}>
      {qrError ? (
        <div className="flex items-center justify-center rounded bg-destructive/10 text-destructive text-[10px] px-1" style={{width:size,height:size}}>
          Error QR
        </div>
      ) : (
        <div ref={containerRef} className="flex items-center justify-center" style={{width:size,height:size}} />
      )}
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handlePrint} title="Imprimir etiqueta">
        <Printer className="h-3 w-3" />
      </Button>
    </div>
  );
}
