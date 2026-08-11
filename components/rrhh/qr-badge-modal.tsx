'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Printer, QrCode, User, Hash, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { generateQRDataURL } from '@/lib/qrcode-generator';

interface QRBadgeModalProps {
  onClose: () => void;
  initialName?: string;
  initialCode?: string;
}

export function QRBadgeModal({ onClose, initialName = '', initialCode = '' }: QRBadgeModalProps) {
  const [nombre, setNombre] = useState(initialName);
  const [codigo, setCodigo] = useState(initialCode);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [generated, setGenerated] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (codigo.trim()) {
      try {
        const url = generateQRDataURL(codigo.trim(), 200);
        setQrDataUrl(url);
        setGenerated(true);
      } catch {
        setGenerated(false);
      }
    } else {
      setGenerated(false);
    }
  }, [codigo]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !badgeRef.current) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>QR - ${nombre || 'Empleado'}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; font-family: sans-serif; }
        .badge { width: 280px; border-radius: 28px; border: 5px solid #000; background: #ff6b6b; padding: 24px 16px 20px; text-align: center; }
        .badge-name { color: #fff; font-size: 20px; font-weight: 700; margin-bottom: 16px; word-break: break-word; }
        .qr-box { background: #fff; border-radius: 12px; padding: 10px; display: inline-block; }
        .qr-box img { width: 160px; height: 160px; display: block; }
        .home-btn { width: 36px; height: 36px; border-radius: 50%; background: #ff4444; border: 4px solid #fff; margin: 18px auto 0; }
      </style></head><body>
      <div class="badge">
        <div class="badge-name">${nombre || 'NOMBRE'}</div>
        <div class="qr-box"><img src="${qrDataUrl}" alt="QR"/></div>
        <div class="home-btn"></div>
      </div>
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 300);
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `qr-${codigo || 'codigo'}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-foreground">Generador de Codigo QR</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Nombre de la persona</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre completo"
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Codigo de trabajador (contenido del QR)</label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ej: EMP-001"
                className="pl-9"
              />
            </div>
          </div>

          {/* Preview del gafete */}
          {generated && qrDataUrl ? (
            <div className="flex justify-center pt-2">
              <div ref={badgeRef} className="w-[280px] rounded-[28px] border-[5px] border-black bg-[#ff6b6b] px-4 pt-6 pb-5 text-center shadow-xl">
                <p className="text-white text-lg font-bold mb-4 break-words leading-tight">
                  {nombre || 'NOMBRE'}
                </p>
                <div className="bg-white rounded-xl p-2.5 inline-block">
                  <img src={qrDataUrl} alt="Codigo QR" className="w-40 h-40 block" />
                </div>
                <div className="w-9 h-9 rounded-full bg-[#ff4444] border-4 border-white mx-auto mt-4" />
              </div>
            </div>
          ) : (
            <div className="flex justify-center pt-2">
              <div className="w-[280px] h-[340px] rounded-[28px] border-[5px] border-black/20 bg-muted/30 flex items-center justify-center">
                <p className="text-muted-foreground text-sm text-center px-4">
                  Ingresa el codigo de trabajador para generar el QR
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <Button variant="outline" onClick={handleDownload} disabled={!generated}>
            <Download className="mr-2 h-4 w-4" />
            Descargar QR
          </Button>
          <Button onClick={handlePrint} disabled={!generated} className="bg-primary text-primary-foreground">
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>
    </div>
  );
}
