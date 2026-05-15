'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, FileCode, FolderOpen, Folder, Layout, Box, FormInput, Users, Settings, Shield, MessageSquare, Home, LogIn } from 'lucide-react';
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

// System function tree structure
const systemTree: TreeNode[] = [
  {
    id: 'auth',
    name: 'Autenticacion',
    type: 'folder',
    children: [
      {
        id: 'login-page',
        name: 'Login',
        type: 'page',
        path: 'app/page.tsx',
        children: [
          {
            id: 'login-card',
            name: 'LoginCard',
            type: 'component',
            path: 'components/login/login-card.tsx',
          },
          {
            id: 'support-chat',
            name: 'SupportChat',
            type: 'component',
            path: 'components/chat/support-chat.tsx',
          },
        ],
      },
      {
        id: 'validate-login-api',
        name: 'ValidateLogin API',
        type: 'api',
        path: 'app/api/ai/validate-login/route.ts',
      },
      {
        id: 'identity-verify-api',
        name: 'IdentityVerify API',
        type: 'api',
        path: 'app/api/ai/identity-verify/route.ts',
      },
    ],
  },
  {
    id: 'panel',
    name: 'Panel Principal',
    type: 'folder',
    children: [
      {
        id: 'panel-page',
        name: 'Panel',
        type: 'page',
        path: 'app/panel/page.tsx',
      },
    ],
  },
  {
    id: 'rrhh',
    name: 'RRHH',
    type: 'folder',
    children: [
      {
        id: 'rrhh-page',
        name: 'RRHH Panel',
        type: 'page',
        path: 'app/panel/rrhh/page.tsx',
        children: [
          {
            id: 'employee-form',
            name: 'EmployeeFormModal',
            type: 'component',
            path: 'components/rrhh/employee-form-modal.tsx',
          },
        ],
      },
    ],
  },
  {
    id: 'it-manager',
    name: 'IT Manager',
    type: 'folder',
    children: [
      {
        id: 'it-manager-page',
        name: 'IT Manager Panel',
        type: 'page',
        path: 'app/panel/it-manager/page.tsx',
        children: [
          {
            id: 'support-queue',
            name: 'SupportQueue',
            type: 'component',
            path: 'components/it-manager/support-queue.tsx',
          },
          {
            id: 'it-manager-chat',
            name: 'ITManagerChat',
            type: 'component',
            path: 'components/it-manager/it-manager-chat.tsx',
          },
        ],
      },
      {
        id: 'usuarios-page',
        name: 'Usuarios',
        type: 'page',
        path: 'app/panel/it-manager/usuarios/page.tsx',
        children: [
          {
            id: 'user-form-modal',
            name: 'UserFormModal',
            type: 'component',
            path: 'components/it-manager/user-form-modal.tsx',
          },
        ],
      },
      {
        id: 'ide-page',
        name: 'IDE Visual',
        type: 'page',
        path: 'app/panel/it-manager/ide/page.tsx',
      },
    ],
  },
  {
    id: 'lib',
    name: 'Librerias',
    type: 'folder',
    children: [
      {
        id: 'firebase',
        name: 'Firebase',
        type: 'util',
        path: 'lib/firebase.ts',
      },
      {
        id: 'ai-prompts',
        name: 'AI Prompts',
        type: 'util',
        path: 'lib/ai-prompts.ts',
      },
      {
        id: 'utils',
        name: 'Utils',
        type: 'util',
        path: 'lib/utils.ts',
      },
    ],
  },
  {
    id: 'ui-components',
    name: 'Componentes UI',
    type: 'folder',
    children: [
      {
        id: 'button',
        name: 'Button',
        type: 'component',
        path: 'components/ui/button.tsx',
      },
      {
        id: 'input',
        name: 'Input',
        type: 'component',
        path: 'components/ui/input.tsx',
      },
      {
        id: 'card',
        name: 'Card',
        type: 'component',
        path: 'components/ui/card.tsx',
      },
      {
        id: 'dialog',
        name: 'Dialog',
        type: 'component',
        path: 'components/ui/dialog.tsx',
      },
      {
        id: 'form',
        name: 'Form',
        type: 'component',
        path: 'components/ui/form.tsx',
      },
      {
        id: 'table',
        name: 'Table',
        type: 'component',
        path: 'components/ui/table.tsx',
      },
      {
        id: 'tabs',
        name: 'Tabs',
        type: 'component',
        path: 'components/ui/tabs.tsx',
      },
      {
        id: 'select',
        name: 'Select',
        type: 'component',
        path: 'components/ui/select.tsx',
      },
      {
        id: 'checkbox',
        name: 'Checkbox',
        type: 'component',
        path: 'components/ui/checkbox.tsx',
      },
      {
        id: 'switch',
        name: 'Switch',
        type: 'component',
        path: 'components/ui/switch.tsx',
      },
      {
        id: 'avatar',
        name: 'Avatar',
        type: 'component',
        path: 'components/ui/avatar.tsx',
      },
      {
        id: 'badge',
        name: 'Badge',
        type: 'component',
        path: 'components/ui/badge.tsx',
      },
    ],
  },
];

const getIcon = (type: TreeNode['type']) => {
  switch (type) {
    case 'folder':
      return FolderOpen;
    case 'component':
      return Box;
    case 'page':
      return Layout;
    case 'api':
      return Settings;
    case 'hook':
      return FileCode;
    case 'util':
      return FileCode;
    default:
      return FileCode;
  }
};

interface TreeItemProps {
  node: TreeNode;
  level: number;
  onSelect: (node: TreeNode) => void;
  selectedId?: string;
}

function TreeItem({ node, level, onSelect, selectedId }: TreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(level === 0);
  const hasChildren = node.children && node.children.length > 0;
  const Icon = getIcon(node.type);
  const isSelected = selectedId === node.id;

  const handleClick = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
    if (node.path) {
      onSelect(node);
    }
  };

  return (
    <div>
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
          isExpanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )
        ) : (
          <span className="w-4" />
        )}
        <Icon className={cn(
          'h-4 w-4 shrink-0',
          node.type === 'folder' ? 'text-yellow-500' : 
          node.type === 'page' ? 'text-blue-400' :
          node.type === 'component' ? 'text-green-400' :
          node.type === 'api' ? 'text-orange-400' :
          'text-muted-foreground'
        )} />
        <span className="truncate">{node.name}</span>
      </div>
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FunctionTree({ onSelectNode, selectedNodeId }: FunctionTreeProps) {
  return (
    <div className="h-full flex flex-col bg-card border-r border-border">
      <div className="p-3 border-b border-border bg-muted/30">
        <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
          <FolderOpen className="h-4 w-4" />
          Explorador de Funciones
        </h3>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {systemTree.map((node) => (
            <TreeItem
              key={node.id}
              node={node}
              level={0}
              onSelect={onSelectNode}
              selectedId={selectedNodeId}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export { systemTree };
