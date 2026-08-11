'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Printer, CreditCard, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Empleado } from '@/lib/firebase';
import { generateQRDataURL } from '@/lib/qrcode-generator';

interface IDCarnetModalProps {
  empleado: Empleado;
  onClose: () => void;
}

export function IDCarnetModal({ empleado, onClose }: IDCarnetModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const carnetRef = useRef<HTMLDivElement>(null);

  const nombreCompleto = `${empleado.nombres || ''} ${empleado.apellidos || ''}`.trim();
  const initials = `${empleado.nombres?.charAt(0) || ''}${empleado.apellidos?.charAt(0) || ''}`.toUpperCase();

  useEffect(() => {
    if (empleado.code) {
      try {
        setQrDataUrl(generateQRDataURL(empleado.code, 180));
      } catch { /* ignore */ }
    }
  }, [empleado.code]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !carnetRef.current) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Carné - ${nombreCompleto}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f0f0; font-family: 'Segoe UI', sans-serif; }
        .carnet { width: 340px; height: 215px; border-radius: 16px; border: 3px solid #1a1a2e; background: linear-gradient(135deg, #16213e 0%, #0f3460 50%, #1a1a2e 100%); padding: 16px; display: flex; gap: 14px; color: #fff; position: relative; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
        .carnet::before { content: ''; position: absolute; top: -30px; right: -30px; width: 100px; height: 100px; border-radius: 50%; background: rgba(0,238,255,0.08); }
        .carnet::after { content: ''; position: absolute; bottom: -40px; left: -20px; width: 120px; height: 120px; border-radius: 50%; background: rgba(0,238,255,0.05); }
        .photo-section { display: flex; flex-direction: column; align-items: center; gap: 6px; z-index: 1; }
        .photo { width: 72px; height: 85px; border-radius: 8px; border: 2px solid rgba(0,238,255,0.4); background: #fff; object-fit: cover; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: #0f3460; overflow: hidden; }
        .photo img { width: 100%; height: 100%; object-fit: cover; }
        .code-label { font-size: 8px; color: rgba(0,238,255,0.8); text-transform: uppercase; letter-spacing: 1px; text-align: center; }
        .data-section { flex: 1; display: flex; flex-direction: column; justify-content: space-between; z-index: 1; min-width: 0; }
        .company { font-size: 10px; font-weight: 700; color: rgba(0,238,255,0.9); text-transform: uppercase; letter-spacing: 2px; }
        .name { font-size: 15px; font-weight: 700; line-height: 1.2; word-break: break-word; }
        .cedula { font-size: 9px; color: rgba(255,255,255,0.6); }
        .info-grid { font-size: 8.5px; line-height: 1.5; color: rgba(255,255,255,0.75); }
        .info-grid span { color: rgba(0,238,255,0.8); font-weight: 600; }
        .qr-section { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; z-index: 1; }
        .qr-box { background: #fff; border-radius: 6px; padding: 4px; }
        .qr-box img { width: 68px; height: 68px; display: block; }
        .qr-label { font-size: 7px; color: rgba(0,238,255,0.7); text-transform: uppercase; letter-spacing: 0.5px; }
      </style></head><body>
      <div class="carnet">
        <div class="photo-section">
          <div class="photo">${empleado.foto ? `<img src="${empleado.foto}" alt="${nombreCompleto}"/>` : initials}</div>
          <div class="code-label">Cod. ${empleado.code || '---'}</div>
        </div>
        <div class="data-section">
          <div>
            <div class="company">Sistema de Control Administrativo</div>
            <div class="name">${nombreCompleto}</div>
            <div class="cedula">Cedula: ${empleado.cedula || '---'}</div>
          </div>
          <div class="info-grid">
            <div><span>Codigo:</span> ${empleado.code || '---'}</div>
            <div><span>Departamento:</span> ${empleado.area || '---'}</div>
            <div><span>Fecha contratacion:</span> ${empleado.fechaIng || '---'}</div>
          </div>
        </div>
        <div class="qr-section">
          <div class="qr-box"><img src="${qrDataUrl}" alt="QR"/></div>
          <div class="qr-label">Marcacion E/S</div>
        </div>
      </div>
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 300);
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `carne-${empleado.code || 'empleado'}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-foreground">Carné de Trabajador</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 flex justify-center">
          <div
            ref={carnetRef}
            className="w-[340px] h-[215px] rounded-2xl border-[3px] border-[#1a1a2e] p-4 flex gap-3.5 text-white relative overflow-hidden select-none"
            style={{ background: 'linear-gradient(135deg, #16213e 0%, #0f3460 50%, #1a1a2e 100%)' }}
          >
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-[#00eeff]/8" />
            <div className="absolute -bottom-10 -left-5 w-28 h-28 rounded-full bg-[#00eeff]/5" />

            {/* Foto + codigo */}
            <div className="flex flex-col items-center gap-1.5 z-10">
              <Avatar className="w-[72px] h-[85px] rounded-lg border-2 border-[#00eeff]/40">
                <AvatarImage src={empleado.foto} alt={nombreCompleto} className="object-cover" />
                <AvatarFallback className="bg-white text-[#0f3460] text-xl font-bold rounded-lg">
                  {initials || 'EM'}
                </AvatarFallback>
              </Avatar>
              <span className="text-[8px] text-[#00eeff]/80 uppercase tracking-widest text-center">
                Cod. {empleado.code || '---'}
              </span>
            </div>

            {/* Datos personales */}
            <div className="flex-1 flex flex-col justify-between z-10 min-w-0">
              <div>
                <p className="text-[10px] font-bold text-[#00eeff]/90 uppercase tracking-[2px]">
                  Control Administrativo
                </p>
                <p className="text-[15px] font-bold leading-tight break-words">
                  {nombreCompleto}
                </p>
                <p className="text-[9px] text-white/60">
                  Cedula: {empleado.cedula || '---'}
                </p>
              </div>
              <div className="text-[8.5px] leading-[1.6] text-white/75 space-y-0">
                <div><span className="text-[#00eeff]/80 font-semibold">Codigo:</span> {empleado.code || '---'}</div>
                <div><span className="text-[#00eeff]/80 font-semibold">Departamento:</span> {empleado.area || '---'}</div>
                <div><span className="text-[#00eeff]/80 font-semibold">Fecha contratacion:</span> {empleado.fechaIng || '---'}</div>
              </div>
            </div>

            {/* QR para marcacion */}
            <div className="flex flex-col items-center justify-center gap-1 z-10">
              <div className="bg-white rounded-md p-1">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Marcacion" className="w-[68px] h-[68px] block" />
                ) : (
                  <div className="w-[68px] h-[68px] bg-gray-200 animate-pulse rounded" />
                )}
              </div>
              <span className="text-[7px] text-[#00eeff]/70 uppercase tracking-wide">Marcacion E/S</span>
            </div>
          </div>
        </div>

        <div className="text-center px-6 pb-2">
          <p className="text-xs text-muted-foreground">
            Escanea el QR para registro de entrada y salida del trabajador
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <Button variant="outline" onClick={handleDownload} disabled={!qrDataUrl}>
            <Download className="mr-2 h-4 w-4" />
            Descargar QR
          </Button>
          <Button onClick={handlePrint} disabled={!qrDataUrl} className="bg-primary text-primary-foreground">
            <Printer className="mr-2 h-4 w-4" />
            Imprimir Carné
          </Button>
        </div>
      </div>
    </div>
  );
}
