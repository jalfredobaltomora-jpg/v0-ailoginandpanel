'use client';

import { useState } from 'react';
import { ScanLine, Copy, Check, Trash2, Code } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

const defaultPatterns = [
  { label: 'Codigo de Caja (CAJA-XXXX)', regex: 'CAJA[-_]?\\d{3,6}', active: true },
  { label: 'Codigo Numerico (8 digitos)', regex: '\\b\\d{8}\\b', active: true },
  { label: 'Codigo Terminal (T-XXXX)', regex: 'T[-_]?\\d{3,5}', active: true },
  { label: 'Referencia (REF-XXXXX)', regex: 'REF[-_]?[A-Z0-9]{4,10}', active: true },
];

export function CodeExtractor() {
  const [input, setInput] = useState('');
  const [patterns, setPatterns] = useState(defaultPatterns);
  const [results, setResults] = useState<{ label: string; matches: string[] }[]>([]);
  const [customPattern, setCustomPattern] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [copied, setCopied] = useState(false);

  const extract = () => {
    const extracted = patterns
      .filter(p => p.active)
      .map(p => {
        const regex = new RegExp(p.regex, 'gi');
        const matches = [...input.matchAll(regex)].map(m => m[0]);
        const unique = [...new Set(matches)];
        return { label: p.label, matches: unique };
      })
      .filter(r => r.matches.length > 0);

    // Also extract all unique codes
    if (customPattern && customLabel) {
      try {
        const regex = new RegExp(customPattern, 'gi');
        const matches = [...input.matchAll(regex)].map(m => m[0]);
        const unique = [...new Set(matches)];
        if (unique.length > 0) {
          extracted.push({ label: customLabel, matches: unique });
        }
      } catch {}
    }

    setResults(extracted);
  };

  const togglePattern = (index: number) => {
    setPatterns(prev => prev.map((p, i) => i === index ? { ...p, active: !p.active } : p));
  };

  const addCustomPattern = () => {
    if (!customPattern.trim() || !customLabel.trim()) return;
    setPatterns(prev => [...prev, { label: customLabel, regex: customPattern, active: true }]);
    setCustomPattern('');
    setCustomLabel('');
  };

  const copyAll = () => {
    const text = results.map(r => `${r.label}:\n${r.matches.join(', ')}`).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="mx-auto max-w-4xl border-primary/20 bg-card/95">
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-primary">
          <ScanLine className="h-5 w-5" />
          Extractor de Codigo de Caja
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Input */}
        <div>
          <label className="mb-2 block text-sm font-medium text-primary">Pegue el texto a analizar</label>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pegue aqui el texto del reporte, ticket o documento..."
            className="min-h-40 border-border bg-input font-mono text-sm"
          />
        </div>

        {/* Patterns */}
        <div>
          <label className="mb-2 block text-sm font-medium text-primary">Patrones de extraccion</label>
          <div className="space-y-2">
            {patterns.map((p, i) => (
              <label key={i} className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-3 cursor-pointer hover:bg-muted/40">
                <input
                  type="checkbox"
                  checked={p.active}
                  onChange={() => togglePattern(i)}
                  className="h-4 w-4 accent-primary"
                />
                <div className="flex-1">
                  <span className="text-sm text-foreground">{p.label}</span>
                  <code className="ml-2 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{p.regex}</code>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Custom pattern */}
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">Nuevo patron (regex)</label>
            <Input value={customPattern} onChange={(e) => setCustomPattern(e.target.value)} placeholder="Ej: CAJA\\d{4}" className="border-border bg-input font-mono" />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">Etiqueta</label>
            <Input value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} placeholder="Ej: Codigo Personalizado" className="border-border bg-input" />
          </div>
          <Button onClick={addCustomPattern} variant="outline" size="sm" disabled={!customPattern || !customLabel}>
            <Code className="mr-1 h-4 w-4" /> Agregar
          </Button>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={extract} disabled={!input.trim()} className="bg-primary text-primary-foreground">
            <ScanLine className="mr-2 h-4 w-4" />
            Extraer Codigos
          </Button>
          <Button variant="outline" onClick={() => setInput('')} disabled={!input}>
            <Trash2 className="mr-2 h-4 w-4" /> Limpiar
          </Button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Resultados</h3>
              <Button variant="outline" size="sm" onClick={copyAll}>
                {copied ? <Check className="mr-1 h-4 w-4 text-green-500" /> : <Copy className="mr-1 h-4 w-4" />}
                {copied ? 'Copiado' : 'Copiar todo'}
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {results.map((r, i) => (
                <div key={i} className="rounded-lg border border-border bg-muted/20 p-4">
                  <p className="mb-2 text-sm font-medium text-primary">{r.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {r.matches.map((m, j) => (
                      <code key={j} className="rounded bg-primary/10 px-2 py-1 text-xs font-mono text-foreground">
                        {m}
                      </code>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {input && results.length === 0 && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-center text-sm text-destructive">
            No se encontraron codigos con los patrones seleccionados
          </div>
        )}
      </CardContent>
    </Card>
  );
}
