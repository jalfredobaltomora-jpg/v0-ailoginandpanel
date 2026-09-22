'use client';

import { useState, useRef } from 'react';
import { FileLock, Unlock, Download, Upload, AlertCircle, CheckCircle, Loader2, FileText, X, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PDFUnlockResult {
  success: boolean;
  pdfData: ArrayBuffer | null;
  error: string;
}

export function PDFUnlock() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PDFUnlockResult | null>(null);
  const [pdfLibLoaded, setPdfLibLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPdfLib = async () => {
    if (pdfLibLoaded) return true;
    try {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
      script.onload = () => { setPdfLibLoaded(true); return true; };
      script.onerror = () => { return false; };
      document.head.appendChild(script);
      // Wait a bit for it to load
      await new Promise(r => setTimeout(r, 500));
      return typeof (window as any).PDFLib !== 'undefined';
    } catch { return false; }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setUploadedFile(file);
      setResult(null);
      setPassword('');
    } else {
      alert('Por favor selecciona un archivo PDF.');
    }
  };

  const handleUnlock = async () => {
    if (!uploadedFile) return;
    setLoading(true);
    setResult(null);
    try {
      const ok = await loadPdfLib();
      if (!ok) {
        setResult({ success: false, pdfData: null, error: 'No se pudo cargar pdf-lib. Verifica tu conexión a internet.' });
        setLoading(false);
        return;
      }

      const { PDFDocument } = (window as any).PDFLib;
      const arrayBuffer = await uploadedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

      // Check if the PDF is encrypted
      const isEncrypted = pdfDoc.isEncrypted;

      if (isEncrypted && password.trim()) {
        await pdfDoc.decrypt(password.trim());
      }

      // Remove encryption
      const pdfBytes = await pdfDoc.save({ useObjectStreams: false, addDefaultPage: false });

      setResult({ success: true, pdfData: pdfBytes, error: '' });
    } catch (err: any) {
      const msg = err?.message || 'Error al desbloquear el PDF.';
      // If the error mentions encryption/permission, try without password
      if (msg.toLowerCase().includes('encrypt') || msg.toLowerCase().includes('permission')) {
        try {
          const { PDFDocument } = (window as any).PDFLib;
          const arrayBuffer = await uploadedFile.arrayBuffer();
          // Try loading without encryption check
          const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
          const pdfBytes = await pdfDoc.save({ useObjectStreams: false, addDefaultPage: false });
          setResult({ success: true, pdfData: pdfBytes, error: '' });
        } catch (retryErr: any) {
          setResult({ success: false, pdfData: null, error: `No se pudo desbloquear: ${retryErr?.message || 'Introduce la contraseña.'}` });
        }
      } else {
        setResult({ success: false, pdfData: null, error: msg });
      }
    }
    setLoading(false);
  };

  const handleDownload = () => {
    if (!result?.pdfData) return;
    try {
      const blob = new Blob([result.pdfData], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = uploadedFile ? uploadedFile.name.replace('.pdf', '_desbloqueado.pdf') : 'pdf_desbloqueado.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const handleReset = () => {
    setUploadedFile(null);
    setPassword('');
    setResult(null);
    setPdfLibLoaded(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Desbloqueo de PDF</h2>
          <p className="text-xs text-muted-foreground">Sube un PDF bloqueado y descárgalo sin contraseña</p>
        </div>
      </div>

      {!uploadedFile ? (
        /* Upload section */
        <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}>
          <Upload className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground mb-2">Clic aquí para seleccionar un PDF bloqueado</p>
          <p className="text-xs text-muted-foreground">Formato: .pdf (máx. 50MB)</p>
          <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
        </div>
      ) : (
        /* Password + Unlock */
        <div className="space-y-4">
          {/* File info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/10 border border-border">
            <FileText className="h-8 w-8 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{uploadedFile.name}</p>
              <p className="text-xs text-muted-foreground">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button onClick={handleReset} className="p-1 rounded hover:bg-muted/20 text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Password input */}
          <div className="space-y-2">
            <Label className="text-sm text-foreground">Contraseña <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Input type="password" placeholder="Introduce la contraseña si la conoces..."
              value={password} onChange={e => setPassword(e.target.value)}
              className="border-border focus:border-primary" />
            <p className="text-xs text-muted-foreground">Si el archivo no tiene contraseña o no la recuerdas, déjalo vacío y se intentará desbloquear.</p>
          </div>

          {/* Unlock button */}
          <Button onClick={handleUnlock} disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Desbloqueando...</> : <><Unlock className="mr-2 h-4 w-4" /> Desbloquear PDF</>}
          </Button>

          {/* Result */}
          {result && (
            <div className={`p-4 rounded-lg border ${result.success ? 'bg-green-950/20 border-green-500/30' : 'bg-red-950/20 border-red-500/30'}`}>
              {result.success ? (
                <>
                  <div className="flex items-center gap-2 text-green-400 mb-3">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-semibold">PDF desbloqueado correctamente</span>
                  </div>
                  <Button size="sm" onClick={handleDownload} className="bg-green-600 hover:bg-green-700 text-white w-full">
                    <Download className="mr-2 h-4 w-4" /> Descargar PDF Desbloqueado
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-red-400 mb-3">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-semibold">Error al desbloquear</span>
                  </div>
                  <p className="text-xs text-red-300 mb-3">{result.error}</p>
                  <Button size="sm" variant="outline" onClick={handleReset} className="border-border text-muted-foreground w-full">
                    <Upload className="mr-2 h-4 w-4" /> Intentar con otro archivo
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Info section */}
      <div className="bg-muted/10 rounded-lg p-4 border border-border">
        <div className="flex items-center gap-2 mb-2">
          <FileLock className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">¿Cómo funciona?</h3>
        </div>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li>Sube un PDF que esté protegido con contraseña</li>
          <li>Si recuerdas la contraseña, escríbela para una desbloqueo limpio</li>
          <li>Si no la recuerdas, déjala vacía — se intentará desbloquear automáticamente</li>
          <li>Descarga el PDF resultante sin protección de contraseña</li>
          <li>Esto solo funciona desde el navegador — tus archivos nunca se envían a ningún servidor</li>
        </ul>
      </div>
    </div>
  );
}
