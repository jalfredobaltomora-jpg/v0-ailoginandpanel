'use client';

import { useState, useCallback } from 'react';
import {
  ChevronRight, ChevronDown, FileCode, FolderOpen, Folder, Layout, Box, Settings,
  Plus, Pencil, Trash2, FilePlus, FolderPlus
} from 'lucide-react';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface TreeNode {
  id: string;
  name: string;
  type: 'folder' | 'component' | 'page' | 'api' | 'hook' | 'util';
  path?: string;
  children?: TreeNode[];
  code?: string;
}

interface FunctionTreeProps {
  onSelectNode: (node: TreeNode) => void;
  selectedNodeId?: string;
}

const initialTree: TreeNode[] = [
  {
    id: 'auth', name: 'Autenticacion', type: 'folder',
    children: [
      {
        id: 'login-page', name: 'Login', type: 'page', path: 'app/page.tsx',
        children: [
          { id: 'login-card', name: 'LoginCard', type: 'component', path: 'components/login/login-card.tsx' },
          { id: 'support-chat', name: 'SupportChat', type: 'component', path: 'components/chat/support-chat.tsx' },
        ],
      },
      { id: 'validate-login-api', name: 'ValidateLogin API', type: 'api', path: 'app/api/ai/validate-login/route.ts' },
      { id: 'identity-verify-api', name: 'IdentityVerify API', type: 'api', path: 'app/api/ai/identity-verify/route.ts' },
    ],
  },
  {
    id: 'panel', name: 'Panel Principal', type: 'folder',
    children: [
      { id: 'panel-page', name: 'Panel', type: 'page', path: 'app/panel/page.tsx' },
    ],
  },
  {
    id: 'rrhh', name: 'RRHH', type: 'folder',
    children: [
      {
        id: 'rrhh-page', name: 'RRHH Panel', type: 'page', path: 'app/panel/rrhh/page.tsx',
        children: [
          { id: 'employee-form', name: 'EmployeeFormModal', type: 'component', path: 'components/rrhh/employee-form-modal.tsx' },
          { id: 'photo-cropper', name: 'PhotoCropper', type: 'component', path: 'components/rrhh/photo-cropper.tsx' },
        ],
      },
    ],
  },
  {
    id: 'qa-reports', name: 'QA Reports', type: 'folder',
    children: [
      { id: 'weekly-issues', name: 'WeeklyIssues', type: 'component', path: 'components/qa-reports/weekly-issues.tsx' },
    ],
  },
  {
    id: 'it-manager', name: 'IT Manager', type: 'folder',
    children: [
      {
        id: 'it-manager-page', name: 'IT Manager Panel', type: 'page', path: 'app/panel/it-manager/page.tsx',
        children: [
          { id: 'support-queue', name: 'SupportQueue', type: 'component', path: 'components/it-manager/support-queue.tsx' },
          { id: 'it-manager-chat', name: 'ITManagerChat', type: 'component', path: 'components/it-manager/it-manager-chat.tsx' },
        ],
      },
      {
        id: 'usuarios-page', name: 'Usuarios', type: 'page', path: 'app/panel/it-manager/usuarios/page.tsx',
        children: [
          { id: 'user-form-modal', name: 'UserFormModal', type: 'component', path: 'components/it-manager/user-form-modal.tsx' },
        ],
      },
      { id: 'ide-page', name: 'IDE Visual', type: 'page', path: 'app/panel/it-manager/ide/page.tsx' },
    ],
  },
  {
    id: 'lib', name: 'Librerias', type: 'folder',
    children: [
      { id: 'firebase', name: 'Firebase', type: 'util', path: 'lib/firebase.ts' },
      { id: 'ai-prompts', name: 'AI Prompts', type: 'util', path: 'lib/ai-prompts.ts' },
      { id: 'utils', name: 'Utils', type: 'util', path: 'lib/utils.ts' },
      { id: 'auth-store', name: 'AuthStore', type: 'util', path: 'lib/auth-store.ts' },
      { id: 'alarm-engine', name: 'AlarmEngine', type: 'util', path: 'lib/alarm-engine.ts' },
    ],
  },
  {
    id: 'ui-components', name: 'Componentes UI', type: 'folder',
    children: [
      { id: 'button', name: 'Button', type: 'component', path: 'components/ui/button.tsx' },
      { id: 'input', name: 'Input', type: 'component', path: 'components/ui/input.tsx' },
      { id: 'card', name: 'Card', type: 'component', path: 'components/ui/card.tsx' },
      { id: 'dialog', name: 'Dialog', type: 'component', path: 'components/ui/dialog.tsx' },
      { id: 'form', name: 'Form', type: 'component', path: 'components/ui/form.tsx' },
      { id: 'table', name: 'Table', type: 'component', path: 'components/ui/table.tsx' },
      { id: 'tabs', name: 'Tabs', type: 'component', path: 'components/ui/tabs.tsx' },
      { id: 'select', name: 'Select', type: 'component', path: 'components/ui/select.tsx' },
      { id: 'checkbox', name: 'Checkbox', type: 'component', path: 'components/ui/checkbox.tsx' },
      { id: 'switch', name: 'Switch', type: 'component', path: 'components/ui/switch.tsx' },
      { id: 'avatar', name: 'Avatar', type: 'component', path: 'components/ui/avatar.tsx' },
      { id: 'badge', name: 'Badge', type: 'component', path: 'components/ui/badge.tsx' },
      { id: 'context-menu', name: 'ContextMenu', type: 'component', path: 'components/ui/context-menu.tsx' },
    ],
  },
];

const iconMap: Record<string, React.ElementType> = {
  folder: FolderOpen, component: Box, page: Layout, api: Settings, hook: FileCode, util: FileCode,
};

function getIcon(type: TreeNode['type']) {
  return iconMap[type] || FileCode;
}

function getIconColor(type: TreeNode['type']) {
  switch (type) {
    case 'folder': return 'text-yellow-500';
    case 'page': return 'text-blue-400';
    case 'component': return 'text-green-400';
    case 'api': return 'text-orange-400';
    default: return 'text-muted-foreground';
  }
}

// Recursive helpers
function findParent(nodes: TreeNode[], childId: string): TreeNode[] | null {
  for (const n of nodes) {
    if (n.children?.some(c => c.id === childId)) return n.children;
    if (n.children) {
      const found = findParent(n.children, childId);
      if (found) return found;
    }
  }
  return null;
}

function removeNode(nodes: TreeNode[], id: string): boolean {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === id) { nodes.splice(i, 1); return true; }
    if (nodes[i].children && removeNode(nodes[i].children!, id)) return true;
  }
  return false;
}

let _nextId = 1000;
function genId() { return `n${_nextId++}`; }

interface TreeItemProps {
  node: TreeNode;
  level: number;
  onSelect: (node: TreeNode) => void;
  selectedId?: string;
  onRename: (node: TreeNode) => void;
  onAddChild: (parent: TreeNode) => void;
  onDelete: (node: TreeNode) => void;
  tree: TreeNode[];
  setTree: (t: TreeNode[]) => void;
}

function TreeItem({ node, level, onSelect, selectedId, onRename, onAddChild, onDelete }: TreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(level < 1);
  const hasChildren = node.children && node.children.length > 0;
  const Icon = getIcon(node.type);
  const isSelected = selectedId === node.id;

  const handleClick = () => {
    if (hasChildren) setIsExpanded(!isExpanded);
    if (node.path || node.type === 'folder') onSelect(node);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          onClick={handleClick}
          className={cn(
            'flex items-center gap-1 px-2 py-1.5 cursor-pointer rounded-md transition-colors text-sm',
            'hover:bg-primary/10',
            isSelected && 'bg-primary/20 text-primary',
            !isSelected && 'text-foreground/80'
          )}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : <span className="w-4" />}
          <Icon className={cn('h-4 w-4 shrink-0', getIconColor(node.type))} />
          <span className="truncate">{node.name}</span>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        {node.type === 'folder' && (
          <>
            <ContextMenuItem onClick={() => onAddChild(node)}>
              <FilePlus className="mr-2 h-4 w-4" /> Agregar archivo
            </ContextMenuItem>
            <ContextMenuItem onClick={() => {
              const newFolder: TreeNode = { id: genId(), name: 'nueva-carpeta', type: 'folder', children: [] };
              node.children = node.children || [];
              node.children.push(newFolder);
              setIsExpanded(true);
            }}>
              <FolderPlus className="mr-2 h-4 w-4" /> Agregar carpeta
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        <ContextMenuItem onClick={() => onRename(node)}>
          <Pencil className="mr-2 h-4 w-4" /> Renombrar
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onDelete(node)} className="text-red-400">
          <Trash2 className="mr-2 h-4 w-4" /> Eliminar
        </ContextMenuItem>
      </ContextMenuContent>

      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              selectedId={selectedId}
              onRename={onRename}
              onAddChild={onAddChild}
              onDelete={onDelete}
              tree={[]}
              setTree={() => {}}
            />
          ))}
        </div>
      )}
    </ContextMenu>
  );
}

export function FunctionTree({ onSelectNode, selectedNodeId }: FunctionTreeProps) {
  const [tree, setTree] = useState<TreeNode[]>(() => {
    const saved = localStorage.getItem('ide:tree');
    if (saved) try { return JSON.parse(saved); } catch {}
    return initialTree;
  });
  const [renameTarget, setRenameTarget] = useState<TreeNode | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const saveTree = useCallback((t: TreeNode[]) => {
    setTree(t);
    localStorage.setItem('ide:tree', JSON.stringify(t));
  }, []);

  const handleRename = (node: TreeNode) => {
    setRenameTarget(node);
    setRenameValue(node.name);
  };

  const handleRenameConfirm = () => {
    if (!renameTarget || !renameValue.trim()) return;
    const t = JSON.parse(JSON.stringify(tree)) as TreeNode[];
    const visit = (nodes: TreeNode[]) => {
      for (const n of nodes) {
        if (n.id === renameTarget.id) { n.name = renameValue.trim(); return; }
        if (n.children) visit(n.children);
      }
    };
    visit(t);
    saveTree(t);
    setRenameTarget(null);
  };

  const handleAddChild = (parent: TreeNode) => {
    const name = prompt('Nombre del archivo (ej: mi-componente):');
    if (!name?.trim()) return;
    const newNode: TreeNode = {
      id: genId(),
      name: name.trim(),
      type: name.includes('.tsx') ? 'component' : 'page',
      path: `components/${name.trim()}`,
    };
    const t = JSON.parse(JSON.stringify(tree)) as TreeNode[];
    const visit = (nodes: TreeNode[]) => {
      for (const n of nodes) {
        if (n.id === parent.id) {
          n.children = n.children || [];
          n.children.push(newNode);
          return;
        }
        if (n.children) visit(n.children);
      }
    };
    visit(t);
    saveTree(t);
  };

  const handleDelete = (node: TreeNode) => {
    if (!confirm(`Eliminar "${node.name}" del arbol?`)) return;
    const t = JSON.parse(JSON.stringify(tree)) as TreeNode[];
    const doRemove = (nodes: TreeNode[]): boolean => {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id === node.id) { nodes.splice(i, 1); return true; }
        if (nodes[i].children && doRemove(nodes[i].children!)) return true;
      }
      return false;
    };
    doRemove(t);
    saveTree(t);
  };

  return (
    <>
      <div className="h-full flex flex-col bg-card border-r border-border">
        <div className="p-3 border-b border-border bg-muted/30">
          <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Explorador de Funciones
          </h3>
          <p className="text-[10px] text-muted-foreground mt-1">Clic derecho para editar</p>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2">
            {tree.map((node) => (
              <TreeItem
                key={node.id}
                node={node}
                level={0}
                onSelect={onSelectNode}
                selectedId={selectedNodeId}
                onRename={handleRename}
                onAddChild={handleAddChild}
                onDelete={handleDelete}
                tree={tree}
                setTree={saveTree}
              />
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Rename Dialog */}
      <Dialog open={!!renameTarget} onOpenChange={() => setRenameTarget(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Renombrar</DialogTitle>
          </DialogHeader>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRenameConfirm(); }}
            placeholder="Nuevo nombre" autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>Cancelar</Button>
            <Button onClick={handleRenameConfirm}>Renombrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export { initialTree as systemTree };
