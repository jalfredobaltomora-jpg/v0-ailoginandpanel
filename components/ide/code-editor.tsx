'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import { Loader2, Save, Undo, Redo, Search, Copy, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TreeNode } from './function-tree';

interface CodeEditorProps {
  selectedNode: TreeNode | null;
  onCodeChange: (code: string) => void;
  onRequestAIAssist: (code: string, prompt: string) => void;
}

type FileDb = Record<string, string>;

export function CodeEditor({ selectedNode, onCodeChange, onRequestAIAssist }: CodeEditorProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [originalCode, setOriginalCode] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [fileDb, setFileDb] = useState<FileDb | null>(null);
  const editorRef = useRef<any>(null);

  // Load file database once
  useEffect(() => {
    const base = (window as any).__NEXT_DATA__?.runtimeConfig?.basePath || '/v0-ailoginandpanel';
    fetch(`${base}/file-contents.json`)
      .then(r => r.json())
      .then((db: FileDb) => setFileDb(db))
      .catch(() => {
        setFileDb({});
      });
  }, []);

  // Load code when node is selected
  useEffect(() => {
    if (!selectedNode?.path) {
      setCode('// Selecciona un archivo del árbol de funciones para ver el código');
      setOriginalCode('');
      setHasChanges(false);
      return;
    }

    setLoading(true);

    // 1. Try localStorage override (user edits)
    const saved = localStorage.getItem(`ide:${selectedNode.path}`);
    if (saved !== null) {
      setCode(saved);
      setOriginalCode(saved);
      setHasChanges(false);
      setLoading(false);
      return;
    }

    // 2. Try embedded file database
    if (fileDb && fileDb[selectedNode.path]) {
      setCode(fileDb[selectedNode.path]);
      setOriginalCode(fileDb[selectedNode.path]);
      setHasChanges(false);
      setLoading(false);
      return;
    }

    // 3. Try API (works on Vercel / dev mode)
    const loadFromApi = async () => {
      try {
        const response = await fetch(`/api/ide/read-file?path=${encodeURIComponent(selectedNode!.path!)}`);
        if (response.ok) {
          const data = await response.json();
          setCode(data.content);
          setOriginalCode(data.content);
          setHasChanges(false);
          return;
        }
      } catch {}
      // 4. Fallback placeholder
      setCode(`// ${selectedNode!.path}\n// (contenido no disponible en modo estático)\n//\n// Usa el Asistente IA o las Herramientas para generar código`);
      setOriginalCode('');
      setLoading(false);
    };
    loadFromApi();
  }, [selectedNode, fileDb]);

  const handleEditorChange = (value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);
    setHasChanges(newCode !== originalCode);
    onCodeChange(newCode);
  };

  const handleEditorMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;

    monaco.editor.defineTheme('system-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955' },
        { token: 'keyword', foreground: '569CD6' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'type', foreground: '4EC9B0' },
      ],
      colors: {
        'editor.background': '#0a0a0f',
        'editor.foreground': '#D4D4D4',
        'editorLineNumber.foreground': '#5A5A5A',
        'editorLineNumber.activeForeground': '#00F2FF',
        'editor.selectionBackground': '#00F2FF33',
        'editor.lineHighlightBackground': '#00F2FF0D',
      },
    });

    monaco.editor.setTheme('system-dark');
  };

  const handleSave = () => {
    if (!selectedNode?.path) return;
    localStorage.setItem(`ide:${selectedNode.path}`, code);
    setOriginalCode(code);
    setHasChanges(false);
  };

  const handleUndo = () => editorRef.current?.trigger('keyboard', 'undo', null);
  const handleRedo = () => editorRef.current?.trigger('keyboard', 'redo', null);
  const handleFind = () => editorRef.current?.trigger('keyboard', 'actions.find', null);

  const handleCopy = () => {
    const selection = editorRef.current?.getModel()?.getValueInRange(editorRef.current?.getSelection());
    if (selection) navigator.clipboard.writeText(selection);
  };

  const getLanguage = (path?: string) => {
    if (!path) return 'typescript';
    if (path.endsWith('.tsx')) return 'typescript';
    if (path.endsWith('.ts')) return 'typescript';
    if (path.endsWith('.js')) return 'javascript';
    if (path.endsWith('.jsx')) return 'javascript';
    if (path.endsWith('.json')) return 'json';
    if (path.endsWith('.css')) return 'css';
    if (path.endsWith('.html')) return 'html';
    return 'typescript';
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <FileCode className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground truncate max-w-[300px]">
            {selectedNode?.path || 'Sin archivo seleccionado'}
          </span>
          {hasChanges && (
            <span className="text-xs text-yellow-500 font-medium">(modificado)</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={handleUndo} className="h-7 w-7 p-0" title="Deshacer"><Undo className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" onClick={handleRedo} className="h-7 w-7 p-0" title="Rehacer"><Redo className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" onClick={handleFind} className="h-7 w-7 p-0" title="Buscar"><Search className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" onClick={handleCopy} className="h-7 w-7 p-0" title="Copiar"><Copy className="h-4 w-4" /></Button>
          <Button
            size="sm"
            variant="default"
            onClick={handleSave}
            disabled={!hasChanges}
            className="h-7 px-2 bg-primary text-primary-foreground"
            title="Guardar (localStorage)"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-1" /> Guardar</>}
          </Button>
        </div>
      </div>

      <div className="flex-1">
        {loading && !code ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Editor
            height="100%"
            language={getLanguage(selectedNode?.path)}
            value={code}
            onChange={handleEditorChange}
            onMount={handleEditorMount}
            options={{
              minimap: { enabled: true },
              fontSize: 14,
              fontFamily: 'JetBrains Mono, Fira Code, monospace',
              lineNumbers: 'on',
              wordWrap: 'on',
              automaticLayout: true,
              scrollBeyondLastLine: false,
              renderLineHighlight: 'all',
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              smoothScrolling: true,
              padding: { top: 16 },
              bracketPairColorization: { enabled: true },
              guides: { bracketPairs: true, indentation: true },
            }}
            loading={
              <div className="h-full flex items-center justify-center bg-[#0a0a0f]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}
