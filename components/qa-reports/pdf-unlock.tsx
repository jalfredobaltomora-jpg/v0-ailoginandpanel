'use client';

import { useState, useRef } from 'react';
import { FileLock, Unlock, Download, Upload, AlertCircle, CheckCircle, Loader2, FileText, X, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const API_BASE = 'http://localhost:3210';

interface PDFUnlockResult {
  success: boolean;
  pdfBlob: Blob | null;
  error: string;
}

export function PDFUnlock() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PDFUnlockResult | null>(null);
  const [serverOnline, setServerOnline] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setServerOnline(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('password', password);

      const response = await fetch(`${API_BASE}/unlock-pdf`, {
        method: 'POST',
        body: formData,
      });

      const blob = await response.blob();
      const text = await blob.text();

      if (response.ok && blob.type === 'application/pdf') {
        setResult({ success: true, pdfBlob: new Blob([blob], { type: 'application/pdf' }), error: '' });
      } else {
        try {
          const errorData = JSON.parse(text);
          setResult({ success: false, pdfBlob: null, error: errorData.error || 'Failed to unlock PDF' });
        } catch {
          setResult({ success: false, pdfBlob: null, error: text || 'Failed to unlock PDF' });
        }
      }
    } catch (err: any) {
      setServerOnline(false);
      setResult({ success: false, pdfBlob: null, error: 'No se conectó al servidor. Ejecuta: cd server && pnpm start' });
    }
    setLoading(false);
  };

  const handleDownload = () => {
    if (!result?.pdfBlob) return;
    try {
      const url = URL.createObjectURL(result.pdfBlob);
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
    setServerOnline(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Desbloqueo de PDF</h2>
          <p className="text-xs text-muted-foreground">Sube un PDF bloqueado y descárgalo sin contraseña</p>
        </div>
      </div>

      {!serverOnline && (
        <div className="p-3 rounded-lg bg-red-950/30 border border-red-500/30">
          <div className="flex items-center gap-2 text-red-400 mb-1">
            <AlertCircle className="h-4 w-4" />
            <span className="font-semibold text-sm">Servidor no disponible</span>
          </div>
          <p className="text-xs text-red-300">El servidor no responde en {API_BASE}.</p>
          <code className="block text-xs bg-black/30 p-2 rounded mt-1">cd server &amp;&amp; pnpm start</code>
        </div>
      )}

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

          <div className="space-y-2">
            <Label className="text-sm text-foreground">Contraseña <span className="text-muted-foreground font-normal">(déjala vacía si no tiene)</span></Label>
            <Input type="password" placeholder="Introduce la contraseña..."
              value={password} onChange={e => setPassword(e.target.value)}
              className="border-border focus:border-primary" />
          </div>

          <Button onClick={handleUnlock} disabled={loading || !serverOnline} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Desbloqueando...</> : <><Unlock className="mr-2 h-4 w-4" /> Desbloquear PDF</>}
          </Button>

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

      <div className="bg-muted/10 rounded-lg p-4 border border-border">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">¿Cómo funciona?</h3>
        </div>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li>Primero ejecuta el servidor: <code className="bg-black/20 px-1 rounded">cd server &amp;&amp; pnpm start</code></li>
          <li>Sube un PDF que esté protegido con contraseña</li>
          <li>Introduce la contraseña (o déjala vacía)</li>
          <li>Descarga el PDF resultante sin protección</li>
          <li>El archivo se procesa localmente en tu computadora</li>
        </ul>
      </div>
    </div>
  );
}
