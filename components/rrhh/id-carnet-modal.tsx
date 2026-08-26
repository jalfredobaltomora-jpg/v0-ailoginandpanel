'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Printer, CreditCard, Download, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Empleado } from '@/lib/firebase';
import { getEmpleados } from '@/lib/firebase';
import { generateQRDataURL } from '@/lib/qrcode-generator';

interface IDCarnetModalProps {
  empleado?: Empleado | null;
  onClose: () => void;
}

export function IDCarnetModal({ empleado = null, onClose }: IDCarnetModalProps) {
  const [current, setCurrent] = useState<Empleado | null>(empleado);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [search, setSearch] = useState('');
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [suggestions, setSuggestions] = useState<Empleado[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const carnetRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getEmpleados().then(setEmpleados).catch(() => {});
  }, []);

  useEffect(() => {
    if (empleado) setCurrent(empleado);
  }, [empleado]);

  useEffect(() => {
    if (current?.code) {
      try {
        setQrDataUrl(generateQRDataURL(current.code, 180));
      } catch { /* ignore */ }
    }
  }, [current]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    if (value.trim().length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    const q = value.toLowerCase().trim();
    const matches = empleados.filter(e =>
      `${e.nombres} ${e.apellidos}`.toLowerCase().includes(q) ||
      e.code.toLowerCase().includes(q) ||
      e.cedula.includes(q)
    ).slice(0, 6);
    setSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  }, [empleados]);

  const handleSelect = (emp: Empleado) => {
    setCurrent(emp);
    setSearch('');
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const nombreCompleto = `${current?.nombres || ''} ${current?.apellidos || ''}`.trim();
  const initials = `${current?.nombres?.charAt(0) || ''}${current?.apellidos?.charAt(0) || ''}`.toUpperCase();

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !carnetRef.current) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Carné - ${nombreCompleto}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f0f0; font-family: 'Segoe UI', sans-serif; }
        .carnet { width: 340px; height: 215px; border-radius: 16px; border: 3px solid #1a1a2e; background: linear-gradient(135deg, #16213e 0%, #0f3460 50%, #1a1a2e 100%); padding: 12px 16px; color: #fff; position: relative; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.3); display: flex; flex-direction: column; }
        .carnet::before { content: ''; position: absolute; top: -30px; right: -30px; width: 100px; height: 100px; border-radius: 50%; background: rgba(0,238,255,0.08); }
        .carnet::after { content: ''; position: absolute; bottom: -40px; left: -20px; width: 120px; height: 120px; border-radius: 50%; background: rgba(0,238,255,0.05); }
        .company { font-size: 10px; font-weight: 700; color: rgba(0,238,255,0.9); text-transform: uppercase; letter-spacing: 2px; text-align: center; z-index: 1; }
        .body { display: flex; gap: 14px; flex: 1; margin-top: 6px; }
        .photo { width: 72px; height: 85px; border-radius: 8px; border: 2px solid rgba(0,238,255,0.4); background: #fff; object-fit: cover; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: #0f3460; overflow: hidden; flex-shrink: 0; }
        .photo img { width: 100%; height: 100%; object-fit: cover; }
        .data { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 8px; min-width: 0; }
        .name { font-size: 15px; font-weight: 700; line-height: 1.2; word-break: break-word; }
        .cedula { font-size: 9px; color: rgba(255,255,255,0.6); }
        .info { font-size: 8.5px; line-height: 1.5; color: rgba(255,255,255,0.75); }
        .info span { color: rgba(0,238,255,0.8); font-weight: 600; }
        .qr-box { background: #fff; border-radius: 6px; padding: 4px; flex-shrink: 0; }
        .qr-box img { width: 68px; height: 68px; display: block; }
      </style></head><body>
      <div class="carnet">
        <div class="company">Sistema de Control Administrativo</div>
        <div class="body">
          <div class="photo">${current?.foto ? `<img src="${current.foto}" alt="${nombreCompleto}"/>` : initials}</div>
          <div class="data">
            <div>
              <div class="name">${nombreCompleto}</div>
              <div class="cedula">Cedula: ${current?.cedula || '---'}</div>
            </div>
            <div class="info">
              <div><span>Codigo:</span> ${current?.code || '---'}</div>
              <div><span>Departamento:</span> ${current?.area || '---'}</div>
              <div><span>Fecha contratacion:</span> ${current?.fechaIng || '---'}</div>
            </div>
          </div>
          <div class="qr-box"><img src="${qrDataUrl}" alt="QR"/></div>
        </div>
      </div>
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 300);
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

        <div className="p-6 space-y-4">
          {/* Buscador (solo si no vino empleado precargado) */}
          {!current && (
            <div ref={searchRef} className="relative">
              <label className="text-sm font-medium text-foreground mb-1 block">Buscar empleado</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  placeholder="Escribe nombre, codigo o cedula..."
                  className="pl-9"
                />
              </div>
              {showSuggestions && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {suggestions.map((emp) => (
                    <button
                      key={emp.code}
                      onClick={() => handleSelect(emp)}
                      className="w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center gap-2 border-b border-border/50 last:border-0 transition-colors"
                    >
                      <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-foreground truncate block">
                          {emp.nombres} {emp.apellidos}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {emp.code} · {emp.cedula}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Preview del carné */}
          {current ? (
            <div className="flex justify-center">
              <div
                ref={carnetRef}
                className="w-[340px] h-[215px] rounded-2xl border-[3px] border-[#1a1a2e] p-4 flex flex-col text-white relative overflow-hidden select-none"
                style={{ background: 'linear-gradient(135deg, #16213e 0%, #0f3460 50%, #1a1a2e 100%)' }}
              >
                <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-[#00eeff]/8" />
                <div className="absolute -bottom-10 -left-5 w-28 h-28 rounded-full bg-[#00eeff]/5" />

                {/* Cabecera empresa centrada */}
                <p className="text-[10px] font-bold text-[#00eeff]/90 uppercase tracking-[2px] text-center z-10">
                  Sistema de Control Administrativo
                </p>

                {/* Contenido: foto + datos + QR */}
                <div className="flex gap-3 flex-1 mt-2">
                <div className="flex flex-col items-center gap-1.5 z-10">
                  <Avatar className="w-[72px] h-[85px] rounded-lg border-2 border-[#00eeff]/40">
                    <AvatarImage src={current.foto} alt={nombreCompleto} className="object-cover" />
                    <AvatarFallback className="bg-white text-[#0f3460] text-xl font-bold rounded-lg">
                      {initials || 'EM'}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <div className="flex-1 flex flex-col justify-center gap-2 z-10 min-w-0">
                  <div>
                    <p className="text-[15px] font-bold leading-tight break-words">
                      {nombreCompleto}
                    </p>
                    <p className="text-[9px] text-white/60">
                      Cedula: {current.cedula || '---'}
                    </p>
                  </div>
                  <div className="text-[8.5px] leading-[1.6] text-white/75 space-y-0">
                    <div><span className="text-[#00eeff]/80 font-semibold">Codigo:</span> {current.code || '---'}</div>
                    <div><span className="text-[#00eeff]/80 font-semibold">Departamento:</span> {current.area || '---'}</div>
                    <div><span className="text-[#00eeff]/80 font-semibold">Fecha contratacion:</span> {current.fechaIng || '---'}</div>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center gap-1 z-10">
                  <div className="bg-white rounded-md p-1">
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt="QR" className="w-[68px] h-[68px] block" />
                    ) : (
                      <div className="w-[68px] h-[68px] bg-gray-200 animate-pulse rounded" />
                    )}
                  </div>
                </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-[340px] h-[215px] rounded-2xl border-[3px] border-black/20 bg-muted/30 flex items-center justify-center">
                <p className="text-muted-foreground text-sm text-center px-4">
                  Busca y selecciona un empleado para ver su carné
                </p>
              </div>
            </div>
          )}
        </div>

        {current && (
          <>
            <div className="text-center px-6 pb-2">
              <p className="text-xs text-muted-foreground">
                Escanea el QR para registro de entrada y salida del trabajador
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
              <Button variant="outline" onClick={() => {
                if (!qrDataUrl) return;
                const W = 340, H = 215;
                const canvas = document.createElement('canvas');
                canvas.width = W * 2;
                canvas.height = H * 2;
                const c = canvas.getContext('2d');
                if (!c) return;
                c.scale(2, 2);

                // Fondo degradado + borde
                const grad = c.createLinearGradient(0, 0, W, H);
                grad.addColorStop(0, '#16213e');
                grad.addColorStop(0.5, '#0f3460');
                grad.addColorStop(1, '#1a1a2e');
                c.fillStyle = grad;
                c.beginPath(); c.roundRect(0, 0, W, H, 16); c.fill();
                c.strokeStyle = '#1a1a2e'; c.lineWidth = 3; c.stroke();

                // Círculos decorativos
                c.fillStyle = 'rgba(0,238,255,0.08)';
                c.beginPath(); c.arc(W + 30, -30, 50, 0, Math.PI * 2); c.fill();
                c.fillStyle = 'rgba(0,238,255,0.05)';
                c.beginPath(); c.arc(-20, H + 40, 60, 0, Math.PI * 2); c.fill();

                // Empresa centrada cabecera
                c.fillStyle = 'rgba(0,238,255,0.9)';
                c.font = 'bold 10px sans-serif';
                c.textAlign = 'center';
                c.fillText('SISTEMA DE CONTROL ADMINISTRATIVO', W / 2, 18);

                // Foto placeholder
                c.fillStyle = '#fff';
                c.beginPath(); c.roundRect(16, 32, 72, 85, 8); c.fill();
                c.strokeStyle = 'rgba(0,238,255,0.4)'; c.lineWidth = 2; c.stroke();

                // Dibujar foto si existe, si no iniciales
                const drawRest = () => {
                  // Nombre
                  c.fillStyle = '#fff';
                  c.font = 'bold 15px sans-serif';
                  c.textAlign = 'left';
                  c.fillText(nombreCompleto, 100, 50);
                  c.fillStyle = 'rgba(255,255,255,0.6)';
                  c.font = '9px sans-serif';
                  c.fillText(`Cedula: ${current?.cedula || '---'}`, 100, 64);
                  // Datos
                  c.fillStyle = 'rgba(255,255,255,0.75)';
                  c.font = '8.5px sans-serif';
                  c.fillText(`Codigo: ${current?.code || '---'}`, 100, 82);
                  c.fillText(`Departamento: ${current?.area || '---'}`, 100, 94);
                  c.fillText(`Fecha contratacion: ${current?.fechaIng || '---'}`, 100, 106);
                  // QR
                  const qrImg = new Image();
                  qrImg.src = qrDataUrl;
                  qrImg.onload = () => {
                    c.fillStyle = '#fff';
                    c.beginPath(); c.roundRect(W - 88, 32, 76, 76, 6); c.fill();
                    c.drawImage(qrImg, W - 84, 36, 68, 68);
                    const link = document.createElement('a');
                    link.download = `carne-${(current?.code || 'empleado')}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                  };
                };

                if (current?.foto) {
                  const img = new Image();
                  img.crossOrigin = 'anonymous';
                  img.src = current.foto;
                  img.onload = () => { c.drawImage(img, 16, 32, 72, 85); drawRest(); };
                  img.onerror = drawRest;
                } else {
                  c.fillStyle = '#0f3460';
                  c.font = 'bold 24px sans-serif';
                  c.textAlign = 'center';
                  c.fillText(initials || 'EM', 52, 80);
                  drawRest();
                }
              }} disabled={!qrDataUrl}>
                <Download className="mr-2 h-4 w-4" />
                Descargar QR
              </Button>
              <Button onClick={handlePrint} disabled={!qrDataUrl} className="bg-primary text-primary-foreground">
                <Printer className="mr-2 h-4 w-4" />
                Imprimir Carné
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
