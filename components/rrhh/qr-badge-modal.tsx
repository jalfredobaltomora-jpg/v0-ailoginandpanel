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

  // Nombre a mostrar en el gafete: 1er nombre + 1er apellido.
  const getQRContent = useCallback((emp: Empleado): string => {
    const primerNombre = emp.nombres?.split(' ')[0] || '';
    const primerApellido = emp.apellidos?.split(' ')[0] || '';
    return `${primerNombre} ${primerApellido}`.trim();
  }, []);

  // Contenido del QR: codigo del trabajador.
  const getQRData = useCallback((emp: Empleado): string => emp.code, []);

  // Generar QR cuando se selecciona empleado
  useEffect(() => {
    if (selectedEmp) {
      const contenido = getQRData(selectedEmp);
      if (contenido) {
        try {
          setQrDataUrl(generateQRDataURL(contenido, 280, 2));
          setGenerated(true);
        } catch { setGenerated(false); }
      }
    } else if (!initialName && !initialCode) {
      setGenerated(false);
    }
  }, [selectedEmp, initialName, initialCode, getQRData]);

  // Si viene con datos iniciales, generar QR directo (codigo del trabajador)
  useEffect(() => {
    if (initialName && initialCode) {
      const emp = empleados.find(e => e.code === initialCode);
      const contenido = emp
        ? getQRData(emp)
        : initialCode;
      try {
        setQrDataUrl(generateQRDataURL(contenido, 280, 2));
        setGenerated(true);
      } catch { /* ignore */ }
    }
  }, [initialName, initialCode, empleados, getQRData]);

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
    const W = 320, H = 470;
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

    // Nombre (blanco, negrita, centrado): 1er nombre y 1er apellido en dos lineas grandes
    const wordsLabel = (qrLabel || 'NOMBRE').toUpperCase().split(' ').filter(Boolean);
    const nombreLine = wordsLabel[0] || 'NOMBRE';
    const apellidoLine = wordsLabel.slice(1).join(' ');
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    // Linea 1: primer nombre
    let nombreFont = 34;
    ctx.font = `bold ${nombreFont}px sans-serif`;
    while (ctx.measureText(nombreLine).width > W - 24 && nombreFont > 16) {
      nombreFont -= 1;
      ctx.font = `bold ${nombreFont}px sans-serif`;
    }
    ctx.fillText(nombreLine, W / 2, 22);
    // Linea 2: primer apellido
    if (apellidoLine) {
      let apellidoFont = 34;
      ctx.font = `bold ${apellidoFont}px sans-serif`;
      while (ctx.measureText(apellidoLine).width > W - 24 && apellidoFont > 16) {
        apellidoFont -= 1;
        ctx.font = `bold ${apellidoFont}px sans-serif`;
      }
      ctx.fillText(apellidoLine, W / 2, 22 + 36);
    }

    // Caja blanca con QR (QR ocupa casi todo el ancho, borde blanco pequeño)
    const qrImg = new Image();
    qrImg.src = qrDataUrl;
    qrImg.onload = () => {
      const qrSize = 280;
      const qrX = (W - qrSize) / 2 - 2;
      const qrY = 118;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.roundRect(qrX, qrY, qrSize + 4, qrSize + 4, 8);
      ctx.fill();
      ctx.drawImage(qrImg, qrX + 2, qrY + 2, qrSize, qrSize);

      // Circulo (botón inicio) con color del gafete
      ctx.beginPath();
      ctx.arc(W / 2, H - 36, 20, 0, Math.PI * 2);
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
    const nombreMostrar = selectedEmp ? getQRContent(selectedEmp) : search || 'NOMBRE';
    const wordsPrint = nombreMostrar.split(' ').filter(Boolean);
    const nombreLine = wordsPrint[0] || 'NOMBRE';
    const apellidoLine = wordsPrint.slice(1).join(' ');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>QR - ${nombreMostrar}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; font-family: sans-serif; }
        .badge { width: 320px; border-radius: 28px; border: 5px solid #000; background: ${badgeColor}; padding: 16px 12px 20px; text-align: center; }
        .badge-name { color: #fff; font-size: 34px; font-weight: 700; line-height: 1.05; word-break: break-word; }
        .qr-box { background: #fff; border-radius: 8px; padding: 4px; display: block; margin-top: 12px; }
        .qr-box img { width: 100%; height: auto; display: block; }
        .home-btn { width: 36px; height: 36px; border-radius: 50%; background: ${badgeColor}; border: 4px solid #fff; margin: 18px auto 0; }
      </style></head><body>
      <div class="badge">
        <div class="badge-name">${nombreLine}</div>
        ${apellidoLine ? `<div class="badge-name">${apellidoLine}</div>` : ''}
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
    : (() => {
        const empInicial = initialCode ? empleados.find(e => e.code === initialCode) : undefined;
        if (empInicial) return getQRContent(empInicial);
        if (initialName) {
          const words = initialName.trim().split(/\s+/);
          return words.length > 1
            ? `${words[0]} ${words[words.length - 1]}`
            : initialName;
        }
        return search || '';
      })();

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
              <div ref={badgeRef} className="w-[320px] rounded-[28px] border-[5px] border-black px-3 pt-4 pb-5 text-center shadow-xl" style={{ backgroundColor: badgeColor }}>
                {(() => {
                  const words = (qrLabel || 'NOMBRE').split(' ').filter(Boolean);
                  return (
                    <>
                      <p className="text-white text-4xl font-bold leading-tight uppercase">{words[0] || 'NOMBRE'}</p>
                      {words.length > 1 && (
                        <p className="text-white text-4xl font-bold leading-tight uppercase">{words.slice(1).join(' ')}</p>
                      )}
                    </>
                  );
                })()}
                <div className="bg-white rounded-lg p-1 inline-block w-full mt-3">
                  <img src={qrDataUrl} alt="Codigo QR" className="w-full h-auto block" />
                </div>
                <div className="w-9 h-9 rounded-full border-4 border-white mx-auto mt-4" style={{ backgroundColor: badgeColor }} />
              </div>
            </div>
          ) : (
            <div className="flex justify-center pt-2">
              <div className="w-[320px] h-[380px] rounded-[28px] border-[5px] border-black/20 bg-muted/30 flex items-center justify-center">
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
