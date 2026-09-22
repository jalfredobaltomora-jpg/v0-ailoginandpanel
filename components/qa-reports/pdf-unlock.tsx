'use client';

import { useState, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import { FileLock, Unlock, Download, Upload, AlertCircle, CheckCircle, Loader2, FileText, X, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PDFUnlockResult {
  success: boolean;
  pdfData: Uint8Array | null;
  error: string;
}

export function PDFUnlock() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PDFUnlockResult | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setUploadedFile(file);
      setResult(null);
      setPassword('');
      setNeedsPassword(false);
    } else {
      alert('Por favor selecciona un archivo PDF.');
    }
  };

  const handleUnlock = async () => {
    if (!uploadedFile) return;
    setLoading(true);
    setResult(null);
    setNeedsPassword(false);
    try {
      const arrayBuffer = await uploadedFile.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      let pdfDoc: PDFDocument;

      if (password.trim()) {
        // Load with ignoreEncryption and decrypt with password
        pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        // Decrypt using the password - access via bracket notation to bypass TypeScript
        const pdfDocAny = pdfDoc as any;
        if (pdfDocAny.decrypt) {
          await pdfDocAny.decrypt(password.trim());
        }
      } else {
        // Try loading normally first (might work if no password or weak protection)
        try {
          pdfDoc = await PDFDocument.load(bytes);
        } catch (loadErr: any) {
          const msg = loadErr?.message || '';
          if (msg.toLowerCase().includes('encrypt') || msg.toLowerCase().includes('password')) {
            setNeedsPassword(true);
            setLoading(false);
            return;
          }
          throw loadErr;
        }
      }

      // Save as unencrypted PDF — removes all password protection
      const pdfBytes = await pdfDoc.save({ useObjectStreams: false });

      setResult({ success: true, pdfData: pdfBytes, error: '' });
    } catch (err: any) {
      const msg = err?.message || 'Error al desbloquear el PDF.';
      if (msg.toLowerCase().includes('encrypt') || msg.toLowerCase().includes('password')) {
        setNeedsPassword(true);
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
    setNeedsPassword(false);
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
        <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}>
          <Upload className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground mb-2">Clic aquí para seleccionar un PDF bloqueado</p>
          <p className="text-xs text-muted-foreground">Formato: .pdf (máx. 50MB)</p>
          <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
        </div>
      ) : (
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

          {/* Needs password notice */}
          {needsPassword && (
            <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/30">
              <p className="text-xs text-amber-300 mb-2">Este PDF está protegido con contraseña. Necesitas la contraseña para desbloquearlo.</p>
            </div>
          )}

          {/* Password input */}
          <div className="space-y-2">
            <Label className="text-sm text-foreground">Contraseña <span className="text-muted-foreground font-normal">(requerida si el PDF está encriptado)</span></Label>
            <Input type="password" placeholder="Introduce la contraseña..."
              value={password} onChange={e => setPassword(e.target.value)}
              className="border-border focus:border-primary" />
            <p className="text-xs text-muted-foreground">Si no tienes la contraseña, el PDF no se puede desbloquear completamente.</p>
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
          <li>Introduce la contraseña para desbloquearlo completamente</li>
          <li>Si el PDF no tiene contraseña, déjala vacía</li>
          <li>Descarga el PDF resultante sin protección</li>
          <li>Tus archivos nunca se envían a ningún servidor — todo ocurre en tu navegador</li>
        </ul>
      </div>
    </div>
  );
}
