'use client';

import { useEffect, useState, useRef } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import { Loader2, Save, Undo, Redo, Search, Replace, Copy, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TreeNode } from './function-tree';

interface CodeEditorProps {
  selectedNode: TreeNode | null;
  onCodeChange: (code: string) => void;
  onRequestAIAssist: (code: string, prompt: string) => void;
}

export function CodeEditor({ selectedNode, onCodeChange, onRequestAIAssist }: CodeEditorProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [originalCode, setOriginalCode] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const editorRef = useRef<any>(null);

  // Load code when node is selected
  useEffect(() => {
    const loadCode = async () => {
      if (!selectedNode?.path) {
        setCode('// Selecciona un archivo del arbol de funciones para ver el codigo');
        setOriginalCode('');
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/ide/read-file?path=${encodeURIComponent(selectedNode.path)}`);
        if (response.ok) {
          const data = await response.json();
          setCode(data.content);
          setOriginalCode(data.content);
          setHasChanges(false);
        } else {
          setCode(`// Error al cargar el archivo: ${selectedNode.path}`);
        }
      } catch (error) {
        setCode(`// Error al cargar el archivo: ${selectedNode.path}\n// ${error}`);
      } finally {
        setLoading(false);
      }
    };

    loadCode();
  }, [selectedNode]);

  const handleEditorChange = (value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);
    setHasChanges(newCode !== originalCode);
    onCodeChange(newCode);
  };

  const handleEditorMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    
    // Custom theme
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

  const handleSave = async () => {
    if (!selectedNode?.path) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/ide/write-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: selectedNode.path, content: code }),
      });
      
      if (response.ok) {
        setOriginalCode(code);
        setHasChanges(false);
      }
    } catch (error) {
      console.error('Error saving file:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUndo = () => {
    editorRef.current?.trigger('keyboard', 'undo', null);
  };

  const handleRedo = () => {
    editorRef.current?.trigger('keyboard', 'redo', null);
  };

  const handleFind = () => {
    editorRef.current?.trigger('keyboard', 'actions.find', null);
  };

  const handleCopy = () => {
    const selection = editorRef.current?.getModel()?.getValueInRange(editorRef.current?.getSelection());
    if (selection) {
      navigator.clipboard.writeText(selection);
    }
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
      {/* Toolbar */}
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
          <Button
            size="sm"
            variant="ghost"
            onClick={handleUndo}
            className="h-7 w-7 p-0"
            title="Deshacer"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRedo}
            className="h-7 w-7 p-0"
            title="Rehacer"
          >
            <Redo className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleFind}
            className="h-7 w-7 p-0"
            title="Buscar"
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            className="h-7 w-7 p-0"
            title="Copiar"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={handleSave}
            disabled={!hasChanges || loading}
            className="h-7 px-2 bg-primary text-primary-foreground"
            title="Guardar"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                Guardar
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Editor */}
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
              guides: {
                bracketPairs: true,
                indentation: true,
              },
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
