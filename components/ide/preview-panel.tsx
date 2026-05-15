'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Monitor, Smartphone, Tablet, Maximize2, ExternalLink, Settings2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TreeNode } from './function-tree';

interface PreviewPanelProps {
  selectedNode: TreeNode | null;
  code: string;
}

type DeviceMode = 'desktop' | 'tablet' | 'mobile';

const deviceSizes: Record<DeviceMode, { width: string; label: string }> = {
  desktop: { width: '100%', label: 'Escritorio' },
  tablet: { width: '768px', label: 'Tablet' },
  mobile: { width: '375px', label: 'Movil' },
};

export function PreviewPanel({ selectedNode, code }: PreviewPanelProps) {
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [refreshKey, setRefreshKey] = useState(0);
  const [previewUrl, setPreviewUrl] = useState('/');

  // Determine preview URL based on selected node
  useEffect(() => {
    if (!selectedNode?.path) {
      setPreviewUrl('/');
      return;
    }

    const path = selectedNode.path;
    
    // Map file paths to routes
    if (path.includes('app/page.tsx')) {
      setPreviewUrl('/');
    } else if (path.includes('app/panel/page.tsx')) {
      setPreviewUrl('/panel');
    } else if (path.includes('app/panel/rrhh/page.tsx')) {
      setPreviewUrl('/panel/rrhh');
    } else if (path.includes('app/panel/it-manager/usuarios/page.tsx')) {
      setPreviewUrl('/panel/it-manager/usuarios');
    } else if (path.includes('app/panel/it-manager/page.tsx')) {
      setPreviewUrl('/panel/it-manager');
    } else if (path.includes('components/login/login-card.tsx')) {
      setPreviewUrl('/');
    } else if (path.includes('components/rrhh/')) {
      setPreviewUrl('/panel/rrhh');
    } else if (path.includes('components/it-manager/')) {
      setPreviewUrl('/panel/it-manager');
    } else {
      setPreviewUrl('/');
    }
  }, [selectedNode]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleOpenExternal = () => {
    window.open(previewUrl, '_blank');
  };

  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Vista Previa</span>
        </div>
        <div className="flex items-center gap-1">
          {/* Device mode buttons */}
          <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5 mr-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDeviceMode('desktop')}
              className={cn(
                'h-6 w-6 p-0',
                deviceMode === 'desktop' && 'bg-primary/20 text-primary'
              )}
              title="Escritorio"
            >
              <Monitor className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDeviceMode('tablet')}
              className={cn(
                'h-6 w-6 p-0',
                deviceMode === 'tablet' && 'bg-primary/20 text-primary'
              )}
              title="Tablet"
            >
              <Tablet className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDeviceMode('mobile')}
              className={cn(
                'h-6 w-6 p-0',
                deviceMode === 'mobile' && 'bg-primary/20 text-primary'
              )}
              title="Movil"
            >
              <Smartphone className="h-3.5 w-3.5" />
            </Button>
          </div>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRefresh}
            className="h-7 w-7 p-0"
            title="Refrescar"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleOpenExternal}
            className="h-7 w-7 p-0"
            title="Abrir en nueva ventana"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* URL bar */}
      <div className="px-3 py-2 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2 rounded-md bg-input px-3 py-1.5 text-sm text-muted-foreground">
          <span className="text-green-400">localhost:3000</span>
          <span>{previewUrl}</span>
        </div>
      </div>

      {/* Preview iframe */}
      <div className="flex-1 p-4 bg-muted/10 overflow-auto">
        <div 
          className={cn(
            'mx-auto bg-background rounded-lg overflow-hidden shadow-lg border border-border transition-all duration-300',
            deviceMode !== 'desktop' && 'shadow-xl'
          )}
          style={{ 
            width: deviceSizes[deviceMode].width,
            height: deviceMode === 'desktop' ? '100%' : '600px',
            maxWidth: '100%',
          }}
        >
          {selectedNode ? (
            <iframe
              key={refreshKey}
              src={previewUrl}
              className="w-full h-full border-0"
              title="Vista previa"
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8">
              <Eye className="h-16 w-16 mb-4 text-primary/30" />
              <p className="text-center text-lg font-medium">Sin vista previa</p>
              <p className="text-center text-sm mt-2">
                Selecciona un archivo del arbol de funciones para ver la vista previa
              </p>
            </div>
          )}
        </div>
        {deviceMode !== 'desktop' && (
          <p className="text-center text-xs text-muted-foreground mt-2">
            {deviceSizes[deviceMode].label} ({deviceSizes[deviceMode].width})
          </p>
        )}
      </div>
    </div>
  );
}
