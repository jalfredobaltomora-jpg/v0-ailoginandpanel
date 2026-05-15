'use client';

import { useState } from 'react';
import { 
  RectangleHorizontal, 
  Type, 
  SquareStack, 
  FormInput, 
  ToggleLeft, 
  CheckSquare, 
  ListOrdered, 
  Table2, 
  Image, 
  Square, 
  CircleDot, 
  CalendarDays, 
  Clock, 
  SlidersHorizontal, 
  Palette, 
  AlignLeft, 
  Link, 
  Minus, 
  LayoutGrid,
  MessageSquare,
  Bell,
  Menu,
  ChevronDown,
  MoreHorizontal,
  Plus,
  Trash2,
  Edit,
  Search,
  User,
  Settings,
  Home,
  Grip,
  Copy,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ToolItem {
  id: string;
  name: string;
  icon: React.ReactNode;
  category: string;
  codeSnippet: string;
}

const toolCategories = [
  { id: 'layout', name: 'Layout', icon: <LayoutGrid className="h-4 w-4" /> },
  { id: 'inputs', name: 'Entradas', icon: <FormInput className="h-4 w-4" /> },
  { id: 'display', name: 'Visualizacion', icon: <Type className="h-4 w-4" /> },
  { id: 'actions', name: 'Acciones', icon: <RectangleHorizontal className="h-4 w-4" /> },
  { id: 'navigation', name: 'Navegacion', icon: <Menu className="h-4 w-4" /> },
  { id: 'feedback', name: 'Feedback', icon: <Bell className="h-4 w-4" /> },
];

const tools: ToolItem[] = [
  // Layout
  {
    id: 'div',
    name: 'Contenedor',
    icon: <Square className="h-5 w-5" />,
    category: 'layout',
    codeSnippet: `<div className="p-4">\n  {/* Contenido */}\n</div>`,
  },
  {
    id: 'card',
    name: 'Card',
    icon: <SquareStack className="h-5 w-5" />,
    category: 'layout',
    codeSnippet: `<Card>\n  <CardHeader>\n    <CardTitle>Titulo</CardTitle>\n  </CardHeader>\n  <CardContent>\n    Contenido\n  </CardContent>\n</Card>`,
  },
  {
    id: 'grid',
    name: 'Grid',
    icon: <LayoutGrid className="h-5 w-5" />,
    category: 'layout',
    codeSnippet: `<div className="grid grid-cols-3 gap-4">\n  <div>Columna 1</div>\n  <div>Columna 2</div>\n  <div>Columna 3</div>\n</div>`,
  },
  {
    id: 'flex',
    name: 'Flex',
    icon: <AlignLeft className="h-5 w-5" />,
    category: 'layout',
    codeSnippet: `<div className="flex items-center gap-4">\n  <div>Item 1</div>\n  <div>Item 2</div>\n</div>`,
  },
  {
    id: 'separator',
    name: 'Separador',
    icon: <Minus className="h-5 w-5" />,
    category: 'layout',
    codeSnippet: `<Separator />`,
  },

  // Inputs
  {
    id: 'input',
    name: 'Input',
    icon: <FormInput className="h-5 w-5" />,
    category: 'inputs',
    codeSnippet: `<Input placeholder="Escribe aqui..." />`,
  },
  {
    id: 'textarea',
    name: 'TextArea',
    icon: <AlignLeft className="h-5 w-5" />,
    category: 'inputs',
    codeSnippet: `<Textarea placeholder="Escribe aqui..." />`,
  },
  {
    id: 'select',
    name: 'Select',
    icon: <ChevronDown className="h-5 w-5" />,
    category: 'inputs',
    codeSnippet: `<Select>\n  <SelectTrigger>\n    <SelectValue placeholder="Seleccionar" />\n  </SelectTrigger>\n  <SelectContent>\n    <SelectItem value="1">Opcion 1</SelectItem>\n    <SelectItem value="2">Opcion 2</SelectItem>\n  </SelectContent>\n</Select>`,
  },
  {
    id: 'checkbox',
    name: 'Checkbox',
    icon: <CheckSquare className="h-5 w-5" />,
    category: 'inputs',
    codeSnippet: `<div className="flex items-center space-x-2">\n  <Checkbox id="terms" />\n  <label htmlFor="terms">Acepto los terminos</label>\n</div>`,
  },
  {
    id: 'switch',
    name: 'Switch',
    icon: <ToggleLeft className="h-5 w-5" />,
    category: 'inputs',
    codeSnippet: `<div className="flex items-center space-x-2">\n  <Switch id="airplane" />\n  <label htmlFor="airplane">Modo avion</label>\n</div>`,
  },
  {
    id: 'radio',
    name: 'Radio Group',
    icon: <CircleDot className="h-5 w-5" />,
    category: 'inputs',
    codeSnippet: `<RadioGroup defaultValue="option-1">\n  <div className="flex items-center space-x-2">\n    <RadioGroupItem value="option-1" id="option-1" />\n    <label htmlFor="option-1">Opcion 1</label>\n  </div>\n  <div className="flex items-center space-x-2">\n    <RadioGroupItem value="option-2" id="option-2" />\n    <label htmlFor="option-2">Opcion 2</label>\n  </div>\n</RadioGroup>`,
  },
  {
    id: 'slider',
    name: 'Slider',
    icon: <SlidersHorizontal className="h-5 w-5" />,
    category: 'inputs',
    codeSnippet: `<Slider defaultValue={[50]} max={100} step={1} />`,
  },
  {
    id: 'datepicker',
    name: 'Date Picker',
    icon: <CalendarDays className="h-5 w-5" />,
    category: 'inputs',
    codeSnippet: `<Input type="date" />`,
  },
  {
    id: 'timepicker',
    name: 'Time Picker',
    icon: <Clock className="h-5 w-5" />,
    category: 'inputs',
    codeSnippet: `<Input type="time" />`,
  },
  {
    id: 'colorpicker',
    name: 'Color Picker',
    icon: <Palette className="h-5 w-5" />,
    category: 'inputs',
    codeSnippet: `<Input type="color" />`,
  },

  // Display
  {
    id: 'label',
    name: 'Label',
    icon: <Type className="h-5 w-5" />,
    category: 'display',
    codeSnippet: `<Label>Etiqueta</Label>`,
  },
  {
    id: 'heading',
    name: 'Titulo',
    icon: <Type className="h-5 w-5" />,
    category: 'display',
    codeSnippet: `<h1 className="text-2xl font-bold">Titulo</h1>`,
  },
  {
    id: 'paragraph',
    name: 'Parrafo',
    icon: <AlignLeft className="h-5 w-5" />,
    category: 'display',
    codeSnippet: `<p className="text-muted-foreground">Texto del parrafo</p>`,
  },
  {
    id: 'badge',
    name: 'Badge',
    icon: <RectangleHorizontal className="h-5 w-5" />,
    category: 'display',
    codeSnippet: `<Badge>Etiqueta</Badge>`,
  },
  {
    id: 'avatar',
    name: 'Avatar',
    icon: <User className="h-5 w-5" />,
    category: 'display',
    codeSnippet: `<Avatar>\n  <AvatarImage src="/avatar.png" />\n  <AvatarFallback>US</AvatarFallback>\n</Avatar>`,
  },
  {
    id: 'image',
    name: 'Imagen',
    icon: <Image className="h-5 w-5" />,
    category: 'display',
    codeSnippet: `<img src="/image.jpg" alt="Descripcion" className="rounded-lg" />`,
  },
  {
    id: 'table',
    name: 'Tabla',
    icon: <Table2 className="h-5 w-5" />,
    category: 'display',
    codeSnippet: `<Table>\n  <TableHeader>\n    <TableRow>\n      <TableHead>Columna 1</TableHead>\n      <TableHead>Columna 2</TableHead>\n    </TableRow>\n  </TableHeader>\n  <TableBody>\n    <TableRow>\n      <TableCell>Dato 1</TableCell>\n      <TableCell>Dato 2</TableCell>\n    </TableRow>\n  </TableBody>\n</Table>`,
  },
  {
    id: 'list',
    name: 'Lista',
    icon: <ListOrdered className="h-5 w-5" />,
    category: 'display',
    codeSnippet: `<ul className="list-disc pl-6">\n  <li>Item 1</li>\n  <li>Item 2</li>\n  <li>Item 3</li>\n</ul>`,
  },

  // Actions
  {
    id: 'button',
    name: 'Button',
    icon: <RectangleHorizontal className="h-5 w-5" />,
    category: 'actions',
    codeSnippet: `<Button>Click aqui</Button>`,
  },
  {
    id: 'button-icon',
    name: 'Button con Icono',
    icon: <Plus className="h-5 w-5" />,
    category: 'actions',
    codeSnippet: `<Button>\n  <Plus className="mr-2 h-4 w-4" />\n  Agregar\n</Button>`,
  },
  {
    id: 'button-outline',
    name: 'Button Outline',
    icon: <RectangleHorizontal className="h-5 w-5" />,
    category: 'actions',
    codeSnippet: `<Button variant="outline">Cancelar</Button>`,
  },
  {
    id: 'button-destructive',
    name: 'Button Eliminar',
    icon: <Trash2 className="h-5 w-5" />,
    category: 'actions',
    codeSnippet: `<Button variant="destructive">\n  <Trash2 className="mr-2 h-4 w-4" />\n  Eliminar\n</Button>`,
  },
  {
    id: 'link',
    name: 'Link',
    icon: <Link className="h-5 w-5" />,
    category: 'actions',
    codeSnippet: `<a href="#" className="text-primary hover:underline">Enlace</a>`,
  },
  {
    id: 'search',
    name: 'Busqueda',
    icon: <Search className="h-5 w-5" />,
    category: 'actions',
    codeSnippet: `<div className="relative">\n  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />\n  <Input placeholder="Buscar..." className="pl-10" />\n</div>`,
  },

  // Navigation
  {
    id: 'tabs',
    name: 'Tabs',
    icon: <SquareStack className="h-5 w-5" />,
    category: 'navigation',
    codeSnippet: `<Tabs defaultValue="tab1">\n  <TabsList>\n    <TabsTrigger value="tab1">Tab 1</TabsTrigger>\n    <TabsTrigger value="tab2">Tab 2</TabsTrigger>\n  </TabsList>\n  <TabsContent value="tab1">Contenido 1</TabsContent>\n  <TabsContent value="tab2">Contenido 2</TabsContent>\n</Tabs>`,
  },
  {
    id: 'breadcrumb',
    name: 'Breadcrumb',
    icon: <Home className="h-5 w-5" />,
    category: 'navigation',
    codeSnippet: `<Breadcrumb>\n  <BreadcrumbList>\n    <BreadcrumbItem>\n      <BreadcrumbLink href="/">Inicio</BreadcrumbLink>\n    </BreadcrumbItem>\n    <BreadcrumbSeparator />\n    <BreadcrumbItem>\n      <BreadcrumbPage>Pagina actual</BreadcrumbPage>\n    </BreadcrumbItem>\n  </BreadcrumbList>\n</Breadcrumb>`,
  },
  {
    id: 'dropdown',
    name: 'Dropdown Menu',
    icon: <MoreHorizontal className="h-5 w-5" />,
    category: 'navigation',
    codeSnippet: `<DropdownMenu>\n  <DropdownMenuTrigger asChild>\n    <Button variant="outline">Abrir</Button>\n  </DropdownMenuTrigger>\n  <DropdownMenuContent>\n    <DropdownMenuItem>Opcion 1</DropdownMenuItem>\n    <DropdownMenuItem>Opcion 2</DropdownMenuItem>\n  </DropdownMenuContent>\n</DropdownMenu>`,
  },

  // Feedback
  {
    id: 'dialog',
    name: 'Dialog',
    icon: <MessageSquare className="h-5 w-5" />,
    category: 'feedback',
    codeSnippet: `<Dialog>\n  <DialogTrigger asChild>\n    <Button>Abrir Dialog</Button>\n  </DialogTrigger>\n  <DialogContent>\n    <DialogHeader>\n      <DialogTitle>Titulo</DialogTitle>\n      <DialogDescription>Descripcion del dialog</DialogDescription>\n    </DialogHeader>\n  </DialogContent>\n</Dialog>`,
  },
  {
    id: 'alert',
    name: 'Alert',
    icon: <Bell className="h-5 w-5" />,
    category: 'feedback',
    codeSnippet: `<Alert>\n  <AlertTitle>Atencion</AlertTitle>\n  <AlertDescription>Este es un mensaje de alerta.</AlertDescription>\n</Alert>`,
  },
  {
    id: 'toast',
    name: 'Toast',
    icon: <Bell className="h-5 w-5" />,
    category: 'feedback',
    codeSnippet: `toast({\n  title: "Exito",\n  description: "La accion se completo correctamente.",\n})`,
  },
  {
    id: 'progress',
    name: 'Progress',
    icon: <SlidersHorizontal className="h-5 w-5" />,
    category: 'feedback',
    codeSnippet: `<Progress value={60} />`,
  },
  {
    id: 'skeleton',
    name: 'Skeleton',
    icon: <Square className="h-5 w-5" />,
    category: 'feedback',
    codeSnippet: `<div className="space-y-2">\n  <Skeleton className="h-4 w-[250px]" />\n  <Skeleton className="h-4 w-[200px]" />\n</div>`,
  },
];

interface ToolboxProps {
  onInsertCode: (code: string) => void;
}

export function Toolbox({ onInsertCode }: ToolboxProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('layout');
  const [draggedTool, setDraggedTool] = useState<ToolItem | null>(null);

  const filteredTools = tools.filter(tool => tool.category === selectedCategory);

  const handleDragStart = (e: React.DragEvent, tool: ToolItem) => {
    setDraggedTool(tool);
    e.dataTransfer.setData('text/plain', tool.codeSnippet);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnd = () => {
    setDraggedTool(null);
  };

  const handleCopyCode = (tool: ToolItem) => {
    navigator.clipboard.writeText(tool.codeSnippet);
  };

  const handleInsert = (tool: ToolItem) => {
    onInsertCode(tool.codeSnippet);
  };

  return (
    <div className="h-full flex flex-col bg-card border-t border-border">
      {/* Category tabs */}
      <div className="flex items-center gap-1 px-2 py-2 border-b border-border bg-muted/30 overflow-x-auto">
        {toolCategories.map((category) => (
          <Button
            key={category.id}
            size="sm"
            variant="ghost"
            onClick={() => setSelectedCategory(category.id)}
            className={cn(
              'h-7 px-2 text-xs whitespace-nowrap',
              selectedCategory === category.id && 'bg-primary/20 text-primary'
            )}
          >
            {category.icon}
            <span className="ml-1">{category.name}</span>
          </Button>
        ))}
      </div>

      {/* Tools grid */}
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-4 gap-2 p-3">
          {filteredTools.map((tool) => (
            <div
              key={tool.id}
              draggable
              onDragStart={(e) => handleDragStart(e, tool)}
              onDragEnd={handleDragEnd}
              className={cn(
                'flex flex-col items-center justify-center gap-1 p-3 rounded-lg border border-border bg-muted/30',
                'hover:bg-primary/10 hover:border-primary/50 cursor-grab active:cursor-grabbing transition-colors',
                'group relative'
              )}
            >
              <Grip className="absolute top-1 right-1 h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="text-primary">{tool.icon}</div>
              <span className="text-xs text-center text-foreground/80">{tool.name}</span>
              
              {/* Hover actions */}
              <div className="absolute inset-0 flex items-center justify-center gap-1 bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleInsert(tool)}
                  className="h-7 w-7 p-0"
                  title="Insertar"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCopyCode(tool)}
                  className="h-7 w-7 p-0"
                  title="Copiar codigo"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Code preview for selected tool */}
      {draggedTool && (
        <div className="p-2 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground mb-1">Codigo a insertar:</p>
          <pre className="text-xs text-primary font-mono bg-background p-2 rounded overflow-x-auto max-h-20">
            {draggedTool.codeSnippet}
          </pre>
        </div>
      )}
    </div>
  );
}
