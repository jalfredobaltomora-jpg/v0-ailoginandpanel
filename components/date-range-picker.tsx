'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

interface Props {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (val: string) => void;
  onDateToChange: (val: string) => void;
}

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function fmtDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseDate(str: string) {
  const [y, m, d] = str.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}

export default function DateRangePicker({ dateFrom, dateTo, onDateFromChange, onDateToChange }: Props) {
  const today = (() => {
    const d = new Date();
    return fmtDate(d.getFullYear(), d.getMonth(), d.getDate());
  })();

  const [baseDate, setBaseDate] = useState(() => {
    if (dateFrom) {
      const { year, month } = parseDate(dateFrom);
      return { year, month };
    }
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selecting, setSelecting] = useState<'from' | 'to'>('from');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleDayClick = useCallback((year: number, month: number, day: number) => {
    const dateStr = fmtDate(year, month, day);
    if (selecting === 'from') {
      onDateFromChange(dateStr);
      if (dateTo && dateStr <= dateTo) {
        setSelecting('to');
      } else {
        onDateToChange('');
        setSelecting('to');
      }
    } else {
      if (dateStr < dateFrom) {
        onDateFromChange(dateStr);
        onDateToChange('');
      } else {
        onDateToChange(dateStr);
        setSelecting('from');
      }
    }
  }, [selecting, dateFrom, dateTo, onDateFromChange, onDateToChange]);

  const isInRange = useCallback((y: number, m: number, d: number) => {
    if (!dateFrom || !dateTo) return false;
    const ds = fmtDate(y, m, d);
    return ds >= dateFrom && ds <= dateTo;
  }, [dateFrom, dateTo]);

  const isStart = useCallback((y: number, m: number, d: number) => fmtDate(y, m, d) === dateFrom, [dateFrom]);
  const isEnd = useCallback((y: number, m: number, d: number) => fmtDate(y, m, d) === dateTo, [dateTo]);
  const isToday = useCallback((y: number, m: number, d: number) => fmtDate(y, m, d) === today, [today]);

  const navigateMonth = useCallback((delta: number) => {
    setBaseDate(prev => {
      let m = prev.month + delta;
      let y = prev.year;
      while (m < 0) { m += 12; y--; }
      while (m > 11) { m -= 12; y++; }
      return { year: y, month: m };
    });
  }, []);

  const navigateYear = useCallback((delta: number) => {
    setBaseDate(prev => ({ ...prev, year: prev.year + delta }));
  }, []);

  const renderMonth = useCallback((year: number, month: number) => {
    const days = daysInMonth(year, month);
    const firstDay = new Date(year, month, 1).getDay();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const cells: React.ReactNode[] = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push(<div key={`e-${i}`} className="h-8 w-8" />);
    }
    for (let d = 1; d <= days; d++) {
      const inRange = isInRange(year, month, d);
      const start = isStart(year, month, d);
      const end = isEnd(year, month, d);
      const t = isToday(year, month, d);
      cells.push(
        <button key={d} type="button" onClick={() => handleDayClick(year, month, d)}
          className={`relative flex h-8 w-8 items-center justify-center rounded-full text-xs transition-colors
            ${start || end ? 'bg-primary text-primary-foreground font-semibold z-10' : ''}
            ${inRange && !start && !end ? 'bg-primary/20 text-foreground' : ''}
            ${!inRange && !t && !start && !end ? 'text-muted-foreground hover:bg-muted' : ''}
            ${t && !start && !end ? 'font-bold ring-1 ring-primary/50' : ''}
            ${(start || end) ? 'shadow-sm' : ''}
          `}
        >
          {d}
        </button>
      );
    }
    return cells;
  }, [handleDayClick, isInRange, isStart, isEnd, isToday]);

  const presets = [
    {
      label: 'Último Mes',
      getRange: () => {
        const d = new Date();
        const m = d.getMonth();
        const y = d.getFullYear();
        const pm = m === 0 ? 11 : m - 1;
        const py = m === 0 ? y - 1 : y;
        return { from: fmtDate(py, pm, 1), to: fmtDate(py, pm, daysInMonth(py, pm)) };
      },
    },
    {
      label: 'Últimos 3 Meses',
      getRange: () => {
        const d = new Date();
        const cm = d.getMonth();
        const cy = d.getFullYear();
        const pm = cm - 3;
        const sy = pm < 0 ? cy - 1 : cy;
        const sm = pm < 0 ? pm + 12 : pm;
        const ey = cm === 0 ? cy - 1 : cy;
        const em = cm === 0 ? 11 : cm - 1;
        return { from: fmtDate(sy, sm, 1), to: fmtDate(ey, em, daysInMonth(ey, em)) };
      },
    },
    {
      label: 'Últimos 6 Meses',
      getRange: () => {
        const d = new Date();
        const cm = d.getMonth();
        const cy = d.getFullYear();
        const pm = cm - 6;
        const sy = pm < 0 ? cy - 1 : cy;
        const sm = pm < 0 ? pm + 12 : pm;
        const ey = cm === 0 ? cy - 1 : cy;
        const em = cm === 0 ? 11 : cm - 1;
        return { from: fmtDate(sy, sm, 1), to: fmtDate(ey, em, daysInMonth(ey, em)) };
      },
    },
    {
      label: 'Últimos 12 Meses',
      getRange: () => {
        const d = new Date();
        const cm = d.getMonth();
        const cy = d.getFullYear();
        const sy = cy - 1;
        const ey = cm === 0 ? cy - 1 : cy;
        const em = cm === 0 ? 11 : cm - 1;
        return { from: fmtDate(sy, cm + 1, 1), to: fmtDate(ey, em, daysInMonth(ey, em)) };
      },
    },
    {
      label: 'Rango Personalizado',
      getRange: () => ({ from: '', to: '' }),
    },
  ];

  const applyPreset = useCallback((preset: typeof presets[number]) => {
    const { from, to } = preset.getRange();
    if (preset.label === 'Rango Personalizado') {
      onDateFromChange('');
      onDateToChange('');
      setSelecting('from');
      return;
    }
    onDateFromChange(from);
    onDateToChange(to);
    setSelecting('from');
    setBaseDate({ year: parseInt(from.slice(0, 4), 10), month: parseInt(from.slice(5, 7), 10) - 1 });
  }, [onDateFromChange, onDateToChange]);

  const secondMonth = (baseDate.month + 1) % 12;
  const secondYear = baseDate.month === 11 ? baseDate.year + 1 : baseDate.year;

  return (
    <div ref={ref} className="relative w-full">
      <div className="overflow-hidden rounded-lg border border-border cursor-pointer" onClick={() => setOpen(true)}>
        <div className="flex items-stretch">
          <div className="flex flex-1 flex-col gap-1 border-r border-border px-3 py-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Fecha Desde</label>
            <div className="text-sm text-foreground">{dateFrom || 'Seleccionar fecha'}</div>
          </div>
          <div className="flex items-center px-2 text-muted-foreground/50">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </div>
          <div className="flex flex-1 flex-col gap-1 px-3 py-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Fecha Hasta</label>
            <div className="text-sm text-foreground">{dateTo || 'Seleccionar fecha'}</div>
          </div>
        </div>
      </div>

      {open && (
        <div className="absolute right-0 z-50 mt-2 min-w-[680px] overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          <div className="flex">
            <div className="w-40 shrink-0 border-r border-border bg-muted/30 p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Predefinidos</p>
              <div className="flex flex-col gap-0.5">
                {presets.map(p => (
                  <button key={p.label} type="button" onClick={() => applyPreset(p)}
                    className="rounded-md px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="mt-3 border-t border-border pt-3">
                <p className="text-[10px] text-muted-foreground">
                  {selecting === 'from' ? 'Seleccione fecha inicio' : 'Seleccione fecha fin'}
                </p>
              </div>
            </div>

            <div className="flex-1 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => navigateYear(-1)} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted" title="Año anterior">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                  </button>
                  <button type="button" onClick={() => navigateMonth(-1)} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted" title="Mes anterior">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                </div>
                <div className="flex gap-8">
                  <span className="text-sm font-semibold text-foreground">{MONTHS[baseDate.month]} {baseDate.year}</span>
                  <span className="text-sm font-semibold text-foreground">{MONTHS[secondMonth]} {secondYear}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => navigateMonth(1)} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted" title="Mes siguiente">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                  <button type="button" onClick={() => navigateYear(1)} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted" title="Año siguiente">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>

              <div className="flex gap-8">
                {[baseDate, { year: secondYear, month: secondMonth }].map((ym, idx) => (
                  <div key={idx}>
                    <div className="grid grid-cols-7 gap-0.5">
                      {WEEKDAYS.map(w => (
                        <div key={w} className="flex h-8 w-8 items-center justify-center text-[10px] font-medium text-muted-foreground">{w}</div>
                      ))}
                      {renderMonth(ym.year, ym.month)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
