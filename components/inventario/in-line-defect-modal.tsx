'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { X, Loader2, Save, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getStoredUser } from '@/lib/auth-store';
import { getEmpleadosActivos, getQADHURecords, getQADHUDefectCatalogItems, saveInLineDefectRecord, updateInLineDefectRecord, type Empleado, type QADHUDefectCatalogItem } from '@/lib/firebase';

interface InLineDefectModalProps {
  onClose: () => void;
  onSaved: () => void;
  record?: any;
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

export function InLineDefectModal({ onClose, onSaved, record }: InLineDefectModalProps) {
  const isEditing = !!record;
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [defectCatalog, setDefectCatalog] = useState<QADHUDefectCatalogItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchResults, setSearchResults] = useState<QADHUDefectCatalogItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [item, setItem] = useState(record?.item || '');
  const [inspectionDate, setInspectionDate] = useState(record?.inspectionDate || new Date().toISOString().split('T')[0]);
  const [month, setMonth] = useState(record?.month || '');
  const [factory, setFactory] = useState(record?.factory || '');
  const [line, setLine] = useState(record?.line || '');
  const [po, setPo] = useState(record?.po || '');
  const [color, setColor] = useState(record?.color || '');
  const [buyer, setBuyer] = useState(record?.buyer || '');
  const [auditor, setAuditor] = useState(record?.auditor || '');
  const [style, setStyle] = useState(record?.style || '');
  const [defect, setDefect] = useState(record?.defect || '');
  const [total, setTotal] = useState(record?.total ?? 0);
  const [defectCode, setDefectCode] = useState(record?.defectCode || '');
  const [defectDescription, setDefectDescription] = useState(record?.defectDescription || '');
  const [catEnglish, setCatEnglish] = useState(record?.catEnglish || '');
  const [acr, setAcr] = useState(record?.acr || '');
  const [defectCatEnglish, setDefectCatEnglish] = useState(record?.defectCatEnglish || '');
  const [descripcionDefecto, setDescripcionDefecto] = useState(record?.descripcionDefecto || '');
  const [catEspanol, setCatEspanol] = useState(record?.catEspanol || '');
  const [acrSpanish, setAcrSpanish] = useState(record?.acrSpanish || '');
  const [defectCatSpanish, setDefectCatSpanish] = useState(record?.defectCatSpanish || '');
  const [dropdownOpen, setDropdownOpen] = useState<'factory' | 'buyer' | 'auditor' | null>(null);

  useEffect(() => {
    getEmpleadosActivos().then(setEmpleados);
    getQADHUDefectCatalogItems().then(items => setDefectCatalog(items));
  }, []);

  useEffect(() => {
    if (isEditing) return;
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
  }, [isEditing]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (q.length === 0) {
      setSearchResults([]);
      return;
    }
    const qLower = q.toLowerCase();
    const results = defectCatalog.filter(c =>
      c.defectCode.toLowerCase().includes(qLower) ||
      (c.defectDescription || '').toLowerCase().includes(qLower)
    );
    setSearchResults(results);
    setShowSearch(true);
  };

  const selectDefectCode = (c: QADHUDefectCatalogItem) => {
    setDefectCode(c.defectCode);
    setDefectDescription(c.defectDescription || '');
    setCatEnglish(c.catEnglish || '');
    setAcr(c.acr || '');
    setDefectCatEnglish(c.defectCatEnglish || '');
    setDescripcionDefecto(c.descripcionDefecto || '');
    setCatEspanol(c.catEspanol || '');
    setAcrSpanish(c.acrSpanish || '');
    setDefectCatSpanish(c.defectCatSpanish || '');
    setShowSearch(false);
    setSearchQuery(c.defectCode);
  };

  const dateObj = useMemo(() => new Date(inspectionDate + 'T12:00:00'), [inspectionDate]);
  const week = useMemo(() => getISOWeekNumber(dateObj), [dateObj]);

  const handleSave = async () => {
    if (!item || !factory || !buyer || !auditor || !defectCode) {
      setError('Completa los campos requeridos: ITEM, Factory, Buyer, Auditor, Código de Defecto');
      return;
    }
    setSaving(true);
    setError('');
    const user = getStoredUser();
    const data = {
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
      defect,
      total,
      defectCode,
      defectDescription,
      catEnglish,
      acr,
      defectCatEnglish,
      descripcionDefecto,
      catEspanol,
      acrSpanish,
      defectCatSpanish,
      createdAt: record?.createdAt || Date.now(),
      createdBy: record?.createdBy || user?.codigo || '',
    };
    let ok: boolean;
    if (isEditing) {
      ok = await updateInLineDefectRecord(record.id, data);
    } else {
      ok = !!(await saveInLineDefectRecord(data));
    }
    setSaving(false);
    if (ok) { onSaved(); onClose(); }
    else setError('Error al guardar. Intenta de nuevo.');
  };

  const selectFactory = (v: string) => { setFactory(v); setDropdownOpen(null); };
  const selectBuyer = (v: string) => { setBuyer(v); setDropdownOpen(null); };
  const selectAuditor = (v: string) => { setAuditor(v); setDropdownOpen(null); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-4xl border-primary/20 bg-card max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex-row items-center justify-between border-b border-border sticky top-0 bg-card z-10">
          <CardTitle className="flex items-center gap-2 text-primary text-base">
            {isEditing ? 'Editar In Line Defect' : 'In Line Defect - Nuevo Registro'}
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

            {/* Defect specific fields */}
            <Field label="Defecto" value={defect} onChange={setDefect} />
            <Field label="Total" type="number" value={String(total)} onChange={v => setTotal(Number(v) || 0)} />

            {/* Defect Code Search */}
            <div className="relative" ref={searchRef}>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Código de Defecto *</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); handleSearchChange(e.target.value); }}
                  onFocus={() => { if (searchResults.length > 0) setShowSearch(true); }}
                  placeholder="Buscar código o descripción..."
                  className="border-border bg-input pl-10"
                />
              </div>
              {showSearch && searchResults.length > 0 && (
                <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
                  {searchResults.map(c => (
                    <button key={c.id} onClick={() => selectDefectCode(c)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted/20 border-b border-border last:border-0">
                      <span className="font-medium">{c.defectCode}</span>
                      {c.defectDescription && <span className="text-muted-foreground ml-2">- {c.defectDescription}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Auto-filled fields from defect catalog */}
            <Field label="Descripción de Defecto" value={defectDescription} readOnly />
            <Field label="CAT ENGLISH" value={catEnglish} readOnly />
            <Field label="ACR" value={acr} readOnly />
            <Field label="Defecto CAT Inglés" value={defectCatEnglish} readOnly />
            <Field label="Descripción de Defecto" value={descripcionDefecto} readOnly />
            <Field label="CAT ESPAÑOL" value={catEspanol} readOnly />
            <Field label="ACR Español" value={acrSpanish} readOnly />
            <Field label="Defecto CAT Español" value={defectCatSpanish} readOnly />
          </div>

          {error && <div className="mt-4 rounded border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">{error}</div>}

          <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" /> {isEditing ? 'Actualizar' : 'Guardar'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', readOnly, required, placeholder }: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  type?: string;
  readOnly?: boolean;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {readOnly ? (
        <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 px-3 py-2 text-sm text-cyan-400">{value || '-'}</div>
      ) : (
        <Input type={type} value={value} onChange={e => onChange?.(e.target.value)}
          className="border-border bg-input" required={required} placeholder={placeholder} />
      )}
    </div>
  );
}