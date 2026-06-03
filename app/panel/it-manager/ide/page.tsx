'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser } from '@/lib/auth-store';
import { ArrowLeft, Code2, Bot, Wrench, PanelLeftClose, PanelRightClose, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { FunctionTree, type TreeNode } from '@/components/ide/function-tree';
import { CodeEditor } from '@/components/ide/code-editor';
import { PreviewPanel } from '@/components/ide/preview-panel';
import { Toolbox } from '@/components/ide/toolbox';
import { AIAssistant } from '@/components/ide/ai-assistant';
import { cn } from '@/lib/utils';
import { tienePermiso } from '@/lib/permisos';
import type { UsuarioIT } from '@/lib/firebase';

type BottomPanel = 'toolbox' | 'ai' | null;

export default function IDEPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UsuarioIT | null>(null);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [currentCode, setCurrentCode] = useState('');
  const [bottomPanel, setBottomPanel] = useState<BottomPanel>('toolbox');
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.push('/');
      return;
    }
    if (!tienePermiso(user, 'itManager')) {
      router.push('/panel');
      return;
    }
    setCurrentUser(user);
  }, [router]);

  const handleSelectNode = (node: TreeNode) => {
    setSelectedNode(node);
  };

  const handleCodeChange = (code: string) => {
    setCurrentCode(code);
  };

  const handleInsertCode = (code: string) => {
    // This would insert code at cursor position in editor
    // For now, we append it
    setCurrentCode(prev => prev + '\n\n' + code);
  };

  const handleApplyAICode = (code: string) => {
    setCurrentCode(code);
  };

  const toggleBottomPanel = (panel: BottomPanel) => {
    if (bottomPanel === panel) {
      setBottomPanel(null);
    } else {
      setBottomPanel(panel);
    }
  };

  if (!currentUser) return null;

  return (
    <main className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50 shrink-0">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/panel/it-manager')}
            className="border-border"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <div className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">
              <span className="text-primary">IDE</span>{' '}
              <span className="text-foreground">Visual</span>
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
            className={cn(leftPanelCollapsed && 'bg-primary/20')}
            title={leftPanelCollapsed ? 'Mostrar explorador' : 'Ocultar explorador'}
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
            className={cn(rightPanelCollapsed && 'bg-primary/20')}
            title={rightPanelCollapsed ? 'Mostrar preview' : 'Ocultar preview'}
          >
            <PanelRightClose className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Left Panel - Function Tree */}
          {!leftPanelCollapsed && (
            <>
              <ResizablePanel defaultSize={20} minSize={15} maxSize={35}>
                <FunctionTree
                  onSelectNode={handleSelectNode}
                  selectedNodeId={selectedNode?.id}
                />
              </ResizablePanel>
              <ResizableHandle withHandle />
            </>
          )}

          {/* Center Panel - Code Editor + Bottom Panels */}
          <ResizablePanel defaultSize={leftPanelCollapsed && rightPanelCollapsed ? 100 : leftPanelCollapsed || rightPanelCollapsed ? 65 : 45}>
            <div className="h-full flex flex-col">
              {/* Code Editor */}
              <div className={cn('flex-1', bottomPanel && 'h-[60%]')}>
                <CodeEditor
                  selectedNode={selectedNode}
                  onCodeChange={handleCodeChange}
                  onRequestAIAssist={() => setBottomPanel('ai')}
                />
              </div>

              {/* Bottom Panel Toggle */}
              <div className="flex items-center justify-center gap-2 px-2 py-1 border-t border-border bg-muted/30">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleBottomPanel('toolbox')}
                  className={cn(
                    'h-7 px-3 text-xs',
                    bottomPanel === 'toolbox' && 'bg-primary/20 text-primary'
                  )}
                >
                  <Wrench className="h-3.5 w-3.5 mr-1" />
                  Herramientas
                  {bottomPanel === 'toolbox' ? (
                    <ChevronDown className="h-3.5 w-3.5 ml-1" />
                  ) : (
                    <ChevronUp className="h-3.5 w-3.5 ml-1" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleBottomPanel('ai')}
                  className={cn(
                    'h-7 px-3 text-xs',
                    bottomPanel === 'ai' && 'bg-primary/20 text-primary'
                  )}
                >
                  <Bot className="h-3.5 w-3.5 mr-1" />
                  Asistente IA
                  {bottomPanel === 'ai' ? (
                    <ChevronDown className="h-3.5 w-3.5 ml-1" />
                  ) : (
                    <ChevronUp className="h-3.5 w-3.5 ml-1" />
                  )}
                </Button>
              </div>

              {/* Bottom Panel Content */}
              {bottomPanel && (
                <div className="h-[40%] min-h-0 border-t border-border overflow-hidden">
                  {bottomPanel === 'toolbox' && (
                    <Toolbox onInsertCode={handleInsertCode} />
                  )}
                  {bottomPanel === 'ai' && (
                    <AIAssistant
                      currentCode={currentCode}
                      onApplyCode={handleApplyAICode}
                      selectedFile={selectedNode?.path}
                    />
                  )}
                </div>
              )}
            </div>
          </ResizablePanel>

          {/* Right Panel - Preview */}
          {!rightPanelCollapsed && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
                <PreviewPanel
                  selectedNode={selectedNode}
                  code={currentCode}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </main>
  );
}
