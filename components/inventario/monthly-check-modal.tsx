'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Camera, Brain } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { updateEquipoInventario, type EquipoInventario, type HistorialMensual } from '@/lib/firebase';
import { analyzeFotos } from '@/lib/ai-client';

interface MonthlyCheckModalProps {
  equipo: EquipoInventario;
  empleadoNombre: string;
  onClose: () => void;
  onSaved: () => void;
}

const defaultFotos = { lateralIzquierdo: '', lateralDerecho: '', frontal: '', trasero: '' };
const fotoSlots: { key: keyof typeof defaultFotos; label: string }[] = [
  { key: 'lateralIzquierdo', label: 'Lateral Izq.' },
  { key: 'frontal', label: 'Frontal' },
  { key: 'lateralDerecho', label: 'Lateral Der.' },
  { key: 'trasero', label: 'Trasero' },
];

function getDefaultMes() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function MonthlyCheckModal({ equipo, empleadoNombre, onClose, onSaved }: MonthlyCheckModalProps) {
  const [fotos, setFotos] = useState({ ...defaultFotos });
  const [comentarios, setComentarios] = useState('');
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{ score: number; analisis: string } | null>(null);
  const [error, setError] = useState('');
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);

  const handlePhoto = (slot: keyof typeof defaultFotos) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          const maxSize = 300;
          if (width > maxSize || height > maxSize) {
            const ratio = Math.min(maxSize / width, maxSize / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, width, height);
          setFotos(prev => ({ ...prev, [slot]: canvas.toDataURL('image/jpeg', 0.7) }));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError('');
    const r = await analyzeFotos(fotos);
    if (r) {
      setResult(r);
    } else {
      setError('No se pudo analizar. Intenta de nuevo.');
    }
    setAnalyzing(false);
  };

  const handleSave = async () => {
    const mes = getDefaultMes();
    const entry: HistorialMensual = {
      mes,
      fotos: { ...fotos },
      comentarios,
      scoreJAB: result?.score ?? -1,
      timestamp: Date.now(),
    };
    setSaving(true);
    const ok = await updateEquipoInventario(equipo.id, {
      fotos: fotos as EquipoInventario['fotos'],
      estado: comentarios || equipo.estado,
      mesInventario: mes,
      historial: [...(equipo.historial || []), entry],
    });
    setSaving(false);
    if (ok) { onSaved(); onClose(); }
    else setError('Error al guardar. Intenta de nuevo.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl border-primary/20 bg-card max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex-row items-center justify-between border-b border-border sticky top-0 bg-card z-10">
          <CardTitle className="text-primary text-base">
            Inventario Mensual - {equipo.serialNumber} ({empleadoNombre || 'Sin asignar'})
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
        </CardHeader>
        <CardContent className="space-y-5 p-6">
          <p className="text-xs text-muted-foreground">Mes actual: <strong>{getDefaultMes()}</strong></p>

          {/* Fotos */}
          <div>
            <label className="mb-2 block text-sm font-medium text-primary">Fotos del equipo</label>
            <div className="grid grid-cols-4 gap-2">
              {fotoSlots.map(({ key, label }) => (
                <div key={key} className="relative flex flex-col items-center gap-1">
                  <div className={`relative flex h-24 w-full items-center justify-center rounded-lg border-2 overflow-hidden ${
                    fotos[key] ? 'border-primary/30' : 'border-dashed border-muted-foreground/30 bg-muted/10'
                  }`}>
                    {fotos[key] ? (
                      <img src={fotos[key]} alt={label} className="h-full w-full object-cover cursor-pointer" onClick={() => setViewingPhoto(fotos[key])} />
                    ) : (
                      <button onClick={() => handlePhoto(key)} className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground">
                        <Camera className="h-5 w-5" />
                        <span className="text-[10px]">{label}</span>
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Analisis JAB */}
          <div>
            <label className="mb-2 block text-sm font-medium text-primary">Analisis JAB</label>
            <div className="flex items-center gap-3">
              <Button onClick={handleAnalyze} disabled={analyzing || !Object.values(fotos).some(Boolean)} variant="outline" size="sm">
                {analyzing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Brain className="mr-1 h-3 w-3" />}
                Analizar
              </Button>
              {result && (
                <div className="flex items-center gap-2">
                  <div className={`text-lg font-bold ${result.score >= 80 ? 'text-green-400' : result.score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {result.score}%
                  </div>
                  <span className="text-xs text-muted-foreground">{result.analisis}</span>
                </div>
              )}
            </div>
          </div>

          {/* Comentarios */}
          <div>
            <label className="mb-2 block text-sm font-medium text-primary">Comentarios del mes</label>
            <Textarea value={comentarios} onChange={e => setComentarios(e.target.value)} placeholder="Detalles sobre el estado actual..." className="border-border bg-input" rows={3} />
          </div>

          {/* Historial previo */}
          {equipo.historial && equipo.historial.length > 0 && (
            <div>
              <label className="mb-2 block text-sm font-medium text-primary">Historial de meses anteriores</label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {equipo.historial.slice().reverse().map((h, i) => (
                  <div key={i} className="rounded border border-border bg-muted/20 p-2 text-xs">
                    <span className="font-mono text-primary">{h.mes}</span>
                    {h.scoreJAB >= 0 && <span className={`ml-2 font-bold ${h.scoreJAB >= 80 ? 'text-green-400' : h.scoreJAB >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>{h.scoreJAB}%</span>}
                    {h.comentarios && <span className="ml-2 text-muted-foreground">{h.comentarios}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <div className="rounded border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">{error}</div>}

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Inventario del Mes
            </Button>
          </div>
        </CardContent>
      </Card>

      {viewingPhoto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 cursor-pointer" onClick={() => setViewingPhoto(null)}>
          <img src={viewingPhoto} alt="Foto" className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}
