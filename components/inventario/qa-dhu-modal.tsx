'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Loader2, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getStoredUser } from '@/lib/auth-store';
import { getEmpleadosActivos, getQADHURecords, saveQADHURecord, type Empleado } from '@/lib/firebase';

interface QADHUModalProps {
  onClose: () => void;
  onSaved: () => void;
}

function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

const factories = ['TECHNOTEX #2', 'EINS', 'DASOLTEX SA'];
const buyers = ['Target', "Kohl's", 'Walmart'];

export function QADHUModal({ onClose, onSaved }: QADHUModalProps) {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [item, setItem] = useState('');
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [month, setMonth] = useState('');
  const [factory, setFactory] = useState('');
  const [line, setLine] = useState('');
  const [po, setPo] = useState('');
  const [color, setColor] = useState('');
  const [buyer, setBuyer] = useState('');
  const [auditor, setAuditor] = useState('');
  const [style, setStyle] = useState('');
  const [visualSample, setVisualSample] = useState(0);
  const [visualReject, setVisualReject] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState<'factory' | 'buyer' | 'auditor' | null>(null);

  useEffect(() => {
    getEmpleadosActivos().then(setEmpleados);
  }, []);

  useEffect(() => {
    getQADHURecords().then(records => {
      let maxNum = 0;
      for (const r of records) {
        const match = r.item?.match(/^#(\d+)$/);
        if (match) {
          const n = parseInt(match[1], 10);
          if (n > maxNum) maxNum = n;
        }
      }
      setItem(`#${String(maxNum + 1).padStart(3, '0')}`);
    });
  }, []);

  const dateObj = useMemo(() => new Date(inspectionDate + 'T12:00:00'), [inspectionDate]);
  const week = useMemo(() => getISOWeekNumber(dateObj), [dateObj]);
  const visualApproved = useMemo(() => Math.max(0, visualSample - visualReject), [visualSample, visualReject]);
  const dhuScorePercent = useMemo(() => visualSample > 0 ? visualReject / visualSample : 0, [visualReject, visualSample]);
  const performanceDHU = useMemo(() => {
    if (dhuScorePercent <= 0.03) return 'Excellent';
    if (dhuScorePercent <= 0.05) return 'Good';
    return 'Very Bad';
  }, [dhuScorePercent]);
  const passRateScorePercent = useMemo(() => visualSample > 0 ? visualApproved / visualSample : 0, [visualApproved, visualSample]);

  const handleSave = async () => {
    if (!item || !factory || !buyer || !auditor) {
      setError('Completa los campos requeridos: ITEM, Factory, Buyer, Auditor');
      return;
    }
    if (visualSample <= 0) {
      setError('Visual Sample debe ser mayor a 0');
      return;
    }
    setSaving(true);
    setError('');
    const user = getStoredUser();
    const ok = await saveQADHURecord({
      item,
      inspectionDate,
      week,
      month,
      factory,
      line,
      po,
      color,
      buyer,
      auditor,
      style,
      visualSample,
      visualReject,
      visualApproved,
      dhuScorePercent: Math.round(dhuScorePercent * 10000) / 10000,
      performanceDHU,
      passRateScorePercent: Math.round(passRateScorePercent * 10000) / 10000,
      createdAt: Date.now(),
      createdBy: user?.codigo || '',
    });
    setSaving(false);
    if (ok) { onSaved(); onClose(); }
    else setError('Error al guardar. Intenta de nuevo.');
  };

  const selectFactory = (v: string) => { setFactory(v); setDropdownOpen(null); };
  const selectBuyer = (v: string) => { setBuyer(v); setDropdownOpen(null); };
  const selectAuditor = (v: string) => { setAuditor(v); setDropdownOpen(null); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-3xl border-primary/20 bg-card max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex-row items-center justify-between border-b border-border sticky top-0 bg-card z-10">
          <CardTitle className="flex items-center gap-2 text-primary text-base">
            QA - DHU % SAE - Indicator IN LINE
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Field label="ITEM" value={item} onChange={setItem} required />
            <Field label="Inspection Date" type="date" value={inspectionDate} onChange={setInspectionDate} required />
            <Field label="Week" value={`#${week}`} readOnly />
            <Field label="Month" value={month} onChange={setMonth} placeholder="Ej: May 2026" required />

            {/* Factory */}
            <div className="relative">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Factory *</label>
              <button onClick={() => setDropdownOpen(dropdownOpen === 'factory' ? null : 'factory')}
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-left text-sm text-foreground hover:bg-muted/20">
                {factory || <span className="text-muted-foreground">Seleccionar...</span>}
              </button>
              {dropdownOpen === 'factory' && (
                <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
                  {factories.map(f => (
                    <button key={f} onClick={() => selectFactory(f)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted/20 border-b border-border last:border-0">
                      {f}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Field label="Line" value={line} onChange={setLine} />
            <Field label="PO" value={po} onChange={setPo} />
            <Field label="Color" value={color} onChange={setColor} />

            {/* Buyer */}
            <div className="relative">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Buyer *</label>
              <button onClick={() => setDropdownOpen(dropdownOpen === 'buyer' ? null : 'buyer')}
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-left text-sm text-foreground hover:bg-muted/20">
                {buyer || <span className="text-muted-foreground">Seleccionar...</span>}
              </button>
              {dropdownOpen === 'buyer' && (
                <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
                  {buyers.map(b => (
                    <button key={b} onClick={() => selectBuyer(b)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted/20 border-b border-border last:border-0">
                      {b}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Auditor */}
            <div className="relative">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Auditor *</label>
              <button onClick={() => setDropdownOpen(dropdownOpen === 'auditor' ? null : 'auditor')}
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-left text-sm text-foreground hover:bg-muted/20">
                {auditor ? (empleados.find(e => e.code === auditor) ? `${empleados.find(e => e.code === auditor)!.nombres} ${empleados.find(e => e.code === auditor)!.apellidos}` : auditor) : <span className="text-muted-foreground">Seleccionar...</span>}
              </button>
              {dropdownOpen === 'auditor' && (
                <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
                  {empleados.map(e => (
                    <button key={e.code} onClick={() => selectAuditor(e.code)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted/20 border-b border-border last:border-0">
                      {e.nombres} {e.apellidos} - {e.cargo}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Field label="Style" value={style} onChange={setStyle} />

            {/* Numeric fields */}
            <Field label="Visual Sample *" type="number" value={String(visualSample)} onChange={v => setVisualSample(Number(v) || 0)} />
            <Field label="Visual Reject" type="number" value={String(visualReject)} onChange={v => setVisualReject(Number(v) || 0)} />

            {/* Auto-calculated */}
            <Field label="Visual Approved" value={String(visualApproved)} readOnly accent />
            <Field label="DHU Score %" value={visualSample > 0 ? `${(dhuScorePercent * 100).toFixed(2)}%` : '0%'} readOnly accent />
            <Field label="Performance DHU" value={performanceDHU} readOnly accent highlight />
            <Field label="Pass Rate Score %" value={visualSample > 0 ? `${(passRateScorePercent * 100).toFixed(2)}%` : '0%'} readOnly accent />
          </div>

          {error && <div className="mt-4 rounded border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">{error}</div>}

          <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" /> Guardar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', readOnly, required, accent, highlight, placeholder }: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  type?: string;
  readOnly?: boolean;
  required?: boolean;
  accent?: boolean;
  highlight?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {readOnly ? (
        <div className={`rounded-lg border px-3 py-2 text-sm ${
          highlight ? 'border-primary/30 bg-primary/5 font-semibold text-primary' :
          accent ? 'border-cyan-500/30 bg-cyan-500/5 text-cyan-400' :
          'border-border bg-muted/20 text-foreground'
        }`}>{value}</div>
      ) : (
        <Input type={type} value={value} onChange={e => onChange?.(e.target.value)}
          className="border-border bg-input" required={required} placeholder={placeholder} />
      )}
    </div>
  );
}
