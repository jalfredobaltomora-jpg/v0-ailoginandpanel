'use client';

import { useState } from 'react';
import { ScanLine, Copy, Check, Store } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function CodeExtractor() {
  const [kohlsInput, setKohlsInput] = useState('');
  const [kohlsResult, setKohlsResult] = useState<string[]>([]);
  const [kohlsCopied, setKohlsCopied] = useState(false);

  const processKohls = () => {
    if (!kohlsInput.trim()) return;
    const items = kohlsInput.trim().split(/[\s,]+/);
    const res: string[] = [];
    for (const item of items) {
      const s = item.trim();
      if (s.length >= 8) {
        res.push(s.substring(s.length - 8));
      }
    }
    setKohlsResult(res);
  };

  const copyKohls = () => {
    const text = kohlsResult.join(' ');
    try { navigator.clipboard.writeText(text); } catch {}
    setKohlsCopied(true);
    setTimeout(() => setKohlsCopied(false), 2000);
    setKohlsInput('');
    setKohlsResult([]);
  };

  return (
    <Card className="mx-auto max-w-4xl border-primary/20 bg-card/95">
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-primary">
          <ScanLine className="h-5 w-5" />
          Extractor de Código de Caja
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {/* Kohl's Mode */}
        <div className="rounded-xl border-2 border-[#25D366]/30 bg-black/60 p-5">
          <div className="mb-4 flex items-center gap-3">
            <Store className="h-6 w-6 text-[#25D366]" />
            <div>
              <h3 className="font-bold text-[#25D366]">Generador de códigos para Kohl's</h3>
              <p className="text-xs text-muted-foreground">Extrae los últimos 8 dígitos de cada código de barras</p>
            </div>
          </div>

          <div className="space-y-3">
            <textarea
              value={kohlsInput}
              onChange={(e) => setKohlsInput(e.target.value)}
              placeholder="Pega los códigos aquí..."
              className="w-full h-28 rounded-lg border border-border bg-[#2d2d2d] p-3 text-base text-white outline-none focus:border-[#25D366] resize-none font-mono"
            />

            <Button onClick={processKohls} disabled={!kohlsInput.trim()} className="w-full bg-[#128C7E] text-white hover:bg-[#075e54]">
              EXTRAER ÚLTIMOS 8
            </Button>

            {kohlsResult.length > 0 && (
              <p className="text-center text-sm font-bold text-[#25D366]">Total: {kohlsResult.length}</p>
            )}

            {kohlsResult.length > 0 && (
              <div className="rounded-lg border border-dashed border-border bg-[#2d2d2d] p-4 font-mono text-sm text-white break-words leading-relaxed">
                {kohlsResult.join(' ')}
              </div>
            )}

            {kohlsResult.length > 0 && (
              <Button onClick={copyKohls} className="w-full bg-[#25D366] text-white hover:bg-[#1da851]">
                {kohlsCopied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                {kohlsCopied ? 'COPIADO!' : 'COPIAR PARA WHATSAPP'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
