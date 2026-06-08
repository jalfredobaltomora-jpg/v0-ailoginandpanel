'use client';

import { useRef, useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { EquipoInventario } from '@/lib/firebase';
import QRCode from '@/lib/qrcode-engine';

// The bundled qrcode-engine has a buggy makeImage() that crashes after draw().
// The canvas is already drawn by draw(), so makeImage is unnecessary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const QRCodeAny = QRCode as any;
if (QRCodeAny.prototype?.makeImage) {
  QRCodeAny.prototype.makeImage = function () {};
}


interface QRLabelProps {
  equipo: EquipoInventario;
  empleadoNombre: string;
  size?: number;
}

const accesorioLabelsQR: Record<string, string> = {
  usbCable: 'Cable USB',
  chargerCube: 'Cubo Cargador',
  microSDTrayKey: 'Llave MicroSD',
  cableOTG: 'Cable OTG',
};

function truncate(v: string | undefined | null, max: number): string {
  if (!v) return '-';
  return v.length > max ? v.slice(0, max) + '…' : v;
}

function buildQRLines(equipo: EquipoInventario, empleadoNombre: string): string {
  const emp = (empleadoNombre || '-').slice(0, 40).replace(/[^ -~]/g, '');
  const cod = (equipo.empleadoAsignado || '-').slice(0, 15);
  const tipo = equipo.tipo === 'tablet' ? 'T' : 'S';
  const marca = (equipo.marca || '-').slice(0, 20).replace(/[^ -~]/g, '');
  const modelo = (equipo.modelo || '-').slice(0, 20).replace(/[^ -~]/g, '');
  const serie = equipo.serialNumber.slice(0, 30);
  const estado = (equipo.estado || '-').slice(0, 60).replace(/[^ -~]/g, '');
  const mes = (equipo.mesInventario || '-').slice(0, 10);
  return [
    `${serie}`,
    `${cod}|${emp}`,
    `${tipo}|${marca} ${modelo}`,
    `${estado}`,
    `${mes}`,
  ].join('\n');
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
      new QRCode(container, {
        text: buildQRLines(equipo, empleadoNombre),
        width: size,
        height: size,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel?.L || 1,
      });
    } catch (e) {
      console.warn('QR non-fatal error (canvas may still be drawn):', e);
      // If the canvas was drawn before the error, keep it visible
      if (!container.querySelector('canvas')) {
        setQrError(true);
      }
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
        @page { size: 62mm 42mm; margin: 0; }
        body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; width: 62mm; height: 42mm; overflow: hidden; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .label { width: 62mm; height: 42mm; box-sizing: border-box; border: 1.5px solid #1a365d; display: flex; flex-direction: column; background: #fff; }
        .header { background: linear-gradient(135deg, #1a365d, #2b6cb0); color: #fff; padding: 3px 6px; display: flex; justify-content: space-between; align-items: center; font-size: 7px; letter-spacing: 0.8px; }
        .header .title { font-weight: 700; text-transform: uppercase; }
        .header .badge { background: rgba(255,255,255,0.2); padding: 1px 5px; border-radius: 3px; font-size: 6px; font-weight: 600; letter-spacing: 0.5px; }
        .body { flex: 1; display: flex; }
        .info { flex: 1; padding: 4px 6px 3px; display: flex; flex-direction: column; gap: 2px; justify-content: center; }
        .section-label { font-size: 5.5px; font-weight: 700; color: #2b6cb0; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 1px; }
        .row { display: flex; font-size: 6px; line-height: 1.5; }
        .row .lbl { color: #718096; min-width: 28px; font-weight: 500; }
        .row .val { color: #1a202c; font-weight: 600; }
        .qr-side { width: 38px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3px 5px 3px 2px; border-left: 1px solid #e2e8f0; }
        .qr-side img { width: 32px; height: 32px; display: block; border-radius: 2px; }
        .qr-side .hint { font-size: 4px; color: #a0aec0; margin-top: 1px; letter-spacing: 0.3px; }
        .footer { border-top: 1px solid #e2e8f0; padding: 2px 6px; font-size: 5px; color: #a0aec0; display: flex; justify-content: space-between; }
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
            <div class="section-label" style="margin-top:2px">Equipo</div>
            ${eqData.map(r => `<div class="row"><span class="lbl">${r.label}:</span><span class="val">${r.value}</span></div>`).join('')}
          </div>
          <div class="qr-side">
            <img src="${dataUrl}" alt="QR" />
            <span class="hint">Escanea para ver detalle</span>
          </div>
        </div>
        <div class="footer">
          <span>Serie: ${equipo.serialNumber}</span>
          <span>${new Date().toLocaleDateString('es-MX')}</span>
        </div>
      </div>
    </body></html>`;
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:-9999px;bottom:-9999px;width:1px;height:1px;border:none';
    document.body.appendChild(iframe);
    const win = iframe.contentWindow;
    if (!win) return;
    const doc = win.document;
    doc.open();
    doc.write(html);
    doc.close();
    const cleanup = () => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      window.focus();
    };
    const doPrint = () => {
      if (!win) return;
      win.print();
      win.addEventListener('afterprint', cleanup, { once: true });
      setTimeout(cleanup, 2000);
    };
    if (win.document.readyState === 'complete') {
      doPrint();
    } else {
      iframe.onload = doPrint;
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
