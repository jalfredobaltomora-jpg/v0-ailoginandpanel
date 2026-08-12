'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Printer, QrCode, Search, Download, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { generateQRDataURL } from '@/lib/qrcode-generator';
import { getEmpleados, type Empleado } from '@/lib/firebase';

interface QRBadgeModalProps {
  onClose: () => void;
  initialName?: string;
  initialCode?: string;
}

export function QRBadgeModal({ onClose, initialName = '', initialCode = '' }: QRBadgeModalProps) {
  const [search, setSearch] = useState(initialName);
  const [codigo, setCodigo] = useState(initialCode);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [generated, setGenerated] = useState(false);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [suggestions, setSuggestions] = useState<Empleado[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Empleado | null>(null);
  const [badgeColor, setBadgeColor] = useState('#ff6b6b');
  const badgeRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const colorPalette = [
    { name: 'Coral', value: '#ff6b6b' },
    { name: 'Azul', value: '#0288d1' },
    { name: 'Verde', value: '#2e7d32' },
    { name: 'Morado', value: '#7b1fa2' },
    { name: 'Naranja', value: '#e65100' },
    { name: 'Negro', value: '#212121' },
    { name: 'Teal', value: '#00695c' },
    { name: 'Rosa', value: '#c2185b' },
    { name: 'Indigo', value: '#283593' },
    { name: 'Lima', value: '#9e9d24' },
  ];

  // Cargar empleados una sola vez
  useEffect(() => {
    getEmpleados().then(setEmpleados).catch(() => {});
  }, []);

  // Cerrar sugerencias al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Generar QR: contenido = 1er nombre + 1er apellido.
  // Si hay otro empleado con el mismo 1er nombre, usar 1er nombre + 2do nombre + apellido.
  const getQRContent = useCallback((emp: Empleado): string => {
    const primerNombre = emp.nombres?.split(' ')[0] || '';
    const segundoNombre = emp.nombres?.split(' ')[1] || '';
    const primerApellido = emp.apellidos?.split(' ')[0] || '';
    // Verificar si hay duplicado del primer nombre
    const hayDuplicado = empleados.some(e =>
      e.code !== emp.code &&
      (e.nombres?.split(' ')[0] || '').toLowerCase() === primerNombre.toLowerCase()
    );
    if (hayDuplicado && segundoNombre) {
      return `${primerNombre} ${segundoNombre} ${primerApellido}`.trim();
    }
    return `${primerNombre} ${primerApellido}`.trim();
  }, [empleados]);

  // Generar QR cuando se selecciona empleado
  useEffect(() => {
    if (selectedEmp) {
      const contenido = getQRContent(selectedEmp);
      if (contenido) {
        try {
          setQrDataUrl(generateQRDataURL(contenido, 200));
          setGenerated(true);
        } catch { setGenerated(false); }
      }
    } else if (!initialName && !initialCode) {
      setGenerated(false);
    }
  }, [selectedEmp, initialName, initialCode, getQRContent]);

  // Si viene con datos iniciales, generar QR directo
  useEffect(() => {
    if (initialName && initialCode) {
      const parts = initialName.split(' ');
      const contenido = `${parts[0] || ''} ${initialName.split(' ')[1] || ''}`.trim() || initialName;
      try {
        setQrDataUrl(generateQRDataURL(contenido, 200));
        setGenerated(true);
      } catch { /* ignore */ }
    }
  }, [initialName, initialCode]);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setSelectedEmp(null);
    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
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
    const fullName = `${emp.nombres} ${emp.apellidos}`.trim();
    setSearch(fullName);
    setCodigo(emp.code);
    setSelectedEmp(emp);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  // Descargar: captura el gafete completo (nombre + QR + diseño) como imagen
  const handleDownload = () => {
    if (!qrDataUrl || !badgeRef.current) return;
    const W = 280, H = 340;
    const canvas = document.createElement('canvas');
    canvas.width = W * 2;
    canvas.height = H * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(2, 2);

    // Fondo con color seleccionado + borde negro
    ctx.fillStyle = badgeColor;
    ctx.beginPath();
    ctx.roundRect(0, 0, W, H, 28);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 5;
    ctx.stroke();

    // Nombre (blanco, negrita, centrado)
    const nombreMostrar = (qrLabel || 'NOMBRE').toUpperCase();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    // Ajustar texto si es muy largo
    let fontSize = 20;
    while (ctx.measureText(nombreMostrar).width > W - 32 && fontSize > 10) {
      fontSize -= 1;
      ctx.font = `bold ${fontSize}px sans-serif`;
    }
    const lines: string[] = [];
    const words = nombreMostrar.split(' ');
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > W - 32) {
        if (line) lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    const lineH = fontSize + 4;
    const startY = 24;
    lines.forEach((l, i) => ctx.fillText(l, W / 2, startY + i * lineH));

    // Caja blanca con QR (QR grande, llena el marco)
    const qrImg = new Image();
    qrImg.src = qrDataUrl;
    qrImg.onload = () => {
      const qrSize = 180;
      const qrX = (W - qrSize) / 2 - 8;
      const qrY = 88;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.roundRect(qrX, qrY, qrSize + 16, qrSize + 16, 12);
      ctx.fill();
      ctx.drawImage(qrImg, qrX + 8, qrY + 8, qrSize, qrSize);

      // Circulo (botón inicio) con color del gafete
      ctx.beginPath();
      ctx.arc(W / 2, H - 33, 18, 0, Math.PI * 2);
      ctx.fillStyle = badgeColor;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Descargar
      const link = document.createElement('a');
      link.download = `gafete-${(qrLabel || 'empleado').replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !badgeRef.current) return;
    const primerNombre = selectedEmp?.nombres?.split(' ')[0] || search.split(' ')[0] || '';
    const primerApellido = selectedEmp?.apellidos?.split(' ')[0] || search.split(' ')[1] || '';
    const nombreMostrar = selectedEmp ? `${primerNombre} ${primerApellido}`.trim() : search || 'NOMBRE';
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>QR - ${nombreMostrar}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; font-family: sans-serif; }
        .badge { width: 280px; border-radius: 28px; border: 5px solid #000; background: ${badgeColor}; padding: 24px 16px 20px; text-align: center; }
        .badge-name { color: #fff; font-size: 20px; font-weight: 700; margin-bottom: 16px; word-break: break-word; }
        .qr-box { background: #fff; border-radius: 12px; padding: 8px; display: inline-block; }
        .qr-box img { width: 180px; height: 180px; display: block; }
        .home-btn { width: 36px; height: 36px; border-radius: 50%; background: ${badgeColor}; border: 4px solid #fff; margin: 18px auto 0; }
      </style></head><body>
      <div class="badge">
        <div class="badge-name">${nombreMostrar}</div>
        <div class="qr-box"><img src="${qrDataUrl}" alt="QR"/></div>
        <div class="home-btn"></div>
      </div>
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 300);
  };

  const qrLabel = selectedEmp
    ? getQRContent(selectedEmp)
    : (initialName || search || '');

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
          {/* Buscador con autocompletado */}
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

          {/* Codigo (auto-llenado al seleccionar) */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Codigo de trabajador</label>
            <Input
              value={codigo}
              readOnly
              className="bg-muted/30 text-muted-foreground"
              placeholder="Se llena al seleccionar un empleado"
            />
          </div>

          {/* Paleta de colores del gafete */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Color del gafete</label>
            <div className="flex flex-wrap gap-2">
              {colorPalette.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setBadgeColor(c.value)}
                  title={c.name}
                  className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${badgeColor === c.value ? 'border-white ring-2 ring-primary scale-110' : 'border-black/20'}`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>

          {/* Preview del gafete */}
          {generated && qrDataUrl ? (
            <div className="flex justify-center pt-2">
              <div ref={badgeRef} className="w-[280px] rounded-[28px] border-[5px] border-black px-4 pt-6 pb-5 text-center shadow-xl" style={{ backgroundColor: badgeColor }}>
                <p className="text-white text-lg font-bold mb-4 break-words leading-tight uppercase">
                  {qrLabel || 'NOMBRE'}
                </p>
                <div className="bg-white rounded-xl p-2 inline-block">
                  <img src={qrDataUrl} alt="Codigo QR" className="w-48 h-48 block" />
                </div>
                <div className="w-9 h-9 rounded-full border-4 border-white mx-auto mt-4" style={{ backgroundColor: badgeColor }} />
              </div>
            </div>
          ) : (
            <div className="flex justify-center pt-2">
              <div className="w-[280px] h-[340px] rounded-[28px] border-[5px] border-black/20 bg-muted/30 flex items-center justify-center">
                <p className="text-muted-foreground text-sm text-center px-4">
                  Busca y selecciona un empleado para generar su QR
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
