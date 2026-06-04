import type { UsuarioIT } from './firebase';

export type PermisoKey = string;

export interface PermisoItem {
  key: string;
  label: string;
  children?: PermisoItem[];
}

export type PermisosMap = Record<string, boolean>;

const STORAGE_KEY = 'permisos-registry';

// ─── Permission tree definition ───
// Add new modules here and they auto-appear in the UI

export const ARBOL_PERMISOS: PermisoItem[] = [
  {
    key: 'itManager',
    label: 'IT Manager (Acceso total al sistema)',
  },
  {
    key: 'rrhh',
    label: 'RRHH',
    children: [
      {
        key: 'rrhh_catalogo',
        label: 'Catálogo de Personal',
        children: [
          { key: 'rrhh_catalogo_ver', label: 'Ver' },
          { key: 'rrhh_catalogo_editar', label: 'Editar' },
          { key: 'rrhh_catalogo_copiar', label: 'Copiar' },
          { key: 'rrhh_catalogo_eliminar', label: 'Eliminar' },
          { key: 'rrhh_catalogo_nuevo', label: 'Nuevo' },
        ],
      },
      {
        key: 'rrhh_cumpleanieros',
        label: 'Cumpleañeros',
        children: [
          { key: 'rrhh_cumpleanieros_ver', label: 'Ver' },
          { key: 'rrhh_cumpleanieros_editar', label: 'Editar' },
          { key: 'rrhh_cumpleanieros_copiar', label: 'Copiar' },
          { key: 'rrhh_cumpleanieros_eliminar', label: 'Eliminar' },
          { key: 'rrhh_cumpleanieros_nuevo', label: 'Nuevo' },
        ],
      },
      {
        key: 'rrhh_reloj',
        label: 'Reloj',
        children: [
          { key: 'rrhh_reloj_ver', label: 'Ver' },
          { key: 'rrhh_reloj_editar', label: 'Editar' },
          { key: 'rrhh_reloj_copiar', label: 'Copiar' },
          { key: 'rrhh_reloj_eliminar', label: 'Eliminar' },
          { key: 'rrhh_reloj_nuevo', label: 'Nuevo' },
        ],
      },
      {
        key: 'rrhh_permisos',
        label: 'Permisos',
        children: [
          { key: 'rrhh_permisos_ver', label: 'Ver' },
          { key: 'rrhh_permisos_editar', label: 'Editar' },
          { key: 'rrhh_permisos_copiar', label: 'Copiar' },
          { key: 'rrhh_permisos_eliminar', label: 'Eliminar' },
          { key: 'rrhh_permisos_nuevo', label: 'Nuevo' },
        ],
      },
      {
        key: 'rrhh_asistencia',
        label: 'Asistencia',
        children: [
          { key: 'rrhh_asistencia_ver', label: 'Ver' },
          { key: 'rrhh_asistencia_editar', label: 'Editar' },
          { key: 'rrhh_asistencia_copiar', label: 'Copiar' },
          { key: 'rrhh_asistencia_eliminar', label: 'Eliminar' },
          { key: 'rrhh_asistencia_nuevo', label: 'Nuevo' },
        ],
      },
      {
        key: 'rrhh_horasextras',
        label: 'Hora Extras',
        children: [
          { key: 'rrhh_horasextras_ver', label: 'Ver' },
          { key: 'rrhh_horasextras_editar', label: 'Editar' },
          { key: 'rrhh_horasextras_copiar', label: 'Copiar' },
          { key: 'rrhh_horasextras_eliminar', label: 'Eliminar' },
          { key: 'rrhh_horasextras_nuevo', label: 'Nuevo' },
        ],
      },
    ],
  },
  {
    key: 'it_inventario',
    label: 'IT - Inventario de Equipos',
    children: [
      { key: 'it_inventario_ver', label: 'Ver' },
      { key: 'it_inventario_editar', label: 'Editar' },
      { key: 'it_inventario_copiar', label: 'Copiar' },
      { key: 'it_inventario_eliminar', label: 'Eliminar' },
      { key: 'it_inventario_nuevo', label: 'Nuevo' },
    ],
  },
  {
    key: 'qa',
    label: 'QA Reports',
    children: [
      {
        key: 'qa_extractor',
        label: 'Extractor',
        children: [
          { key: 'qa_extractor_ver', label: 'Ver' },
          { key: 'qa_extractor_editar', label: 'Editar' },
          { key: 'qa_extractor_copiar', label: 'Copiar' },
          { key: 'qa_extractor_eliminar', label: 'Eliminar' },
          { key: 'qa_extractor_nuevo', label: 'Nuevo' },
        ],
      },
      {
        key: 'qa_weekly',
        label: 'Weekly Issues',
        children: [
          { key: 'qa_weekly_ver', label: 'Ver' },
          { key: 'qa_weekly_editar', label: 'Editar' },
          { key: 'qa_weekly_copiar', label: 'Copiar' },
          { key: 'qa_weekly_eliminar', label: 'Eliminar' },
          { key: 'qa_weekly_nuevo', label: 'Nuevo' },
        ],
      },
      {
        key: 'qa_monthly',
        label: 'Monthly Issues',
        children: [
          { key: 'qa_monthly_ver', label: 'Ver' },
          { key: 'qa_monthly_editar', label: 'Editar' },
          { key: 'qa_monthly_copiar', label: 'Copiar' },
          { key: 'qa_monthly_eliminar', label: 'Eliminar' },
          { key: 'qa_monthly_nuevo', label: 'Nuevo' },
        ],
      },
      {
        key: 'qa_registry',
        label: 'Registro de Reportes (Weekly Issues)',
        children: [
          { key: 'qa_registry_ver', label: 'Ver' },
          { key: 'qa_registry_editar', label: 'Editar' },
          { key: 'qa_registry_copiar', label: 'Copiar' },
          { key: 'qa_registry_eliminar', label: 'Eliminar' },
          { key: 'qa_registry_nuevo', label: 'Nuevo' },
        ],
      },
      {
        key: 'qa_kpi',
        label: 'KPI',
        children: [
          { key: 'qa_kpi_ver', label: 'Ver' },
          { key: 'qa_kpi_editar', label: 'Editar' },
          { key: 'qa_kpi_copiar', label: 'Copiar' },
          { key: 'qa_kpi_eliminar', label: 'Eliminar' },
          { key: 'qa_kpi_nuevo', label: 'Nuevo' },
        ],
      },
      {
        key: 'qa_dhu',
        label: 'DHU (IN LINE / In Line Defect / Catálogo de defectos)',
        children: [
          { key: 'qa_dhu_ver', label: 'Ver' },
          { key: 'qa_dhu_editar', label: 'Editar' },
          { key: 'qa_dhu_copiar', label: 'Copiar' },
          { key: 'qa_dhu_eliminar', label: 'Eliminar' },
          { key: 'qa_dhu_nuevo', label: 'Nuevo' },
        ],
      },
      {
        key: 'qa_analytics',
        label: 'Analytics Dashboard',
        children: [
          { key: 'qa_analytics_ver', label: 'Ver' },
          { key: 'qa_analytics_editar', label: 'Editar' },
          { key: 'qa_analytics_copiar', label: 'Copiar' },
          { key: 'qa_analytics_eliminar', label: 'Eliminar' },
          { key: 'qa_analytics_nuevo', label: 'Nuevo' },
        ],
      },
    ],
  },
];

// ─── Flat key helpers ───

export function flattenPermisoKeys(items?: PermisoItem[]): string[] {
  const keys: string[] = [];
  const walk = (list: PermisoItem[]) => {
    for (const item of list) {
      keys.push(item.key);
      if (item.children) walk(item.children);
    }
  };
  walk(items || ARBOL_PERMISOS);
  return keys;
}

export function getAllPermisoKeys(): string[] {
  return flattenPermisoKeys(ARBOL_PERMISOS);
}

export function getLeafKeys(parentKey: string): string[] {
  const find = (list: PermisoItem[]): PermisoItem | null => {
    for (const item of list) {
      if (item.key === parentKey) return item;
      if (item.children) {
        const found = find(item.children);
        if (found) return found;
      }
    }
    return null;
  };
  const node = find(ARBOL_PERMISOS);
  if (!node?.children) return [];
  return flattenPermisoKeys(node.children);
}

// ─── Default permissions ───

export function permisosPorDefecto(): PermisosMap {
  return {};
}

export function todosPermisos(): PermisosMap {
  const map: PermisosMap = {};
  for (const key of getAllPermisoKeys()) {
    map[key] = true;
  }
  return map;
}

// ─── Check permission ───

export function tienePermiso(user: UsuarioIT | null, permKey: string): boolean {
  if (!user) return false;
  if (user.rol === 'admin') return true;
  if (user.rol === 'it-manager' && !user.permisos) return true;
  if (user.permisos?.itManager) return true;
  return user.permisos?.[permKey] === true;
}

export function tieneAlgunPermiso(user: UsuarioIT | null, permKeys: string[]): boolean {
  return permKeys.some(k => tienePermiso(user, k));
}

export function tienePermisoEnGrupo(user: UsuarioIT | null, prefix: string): boolean {
  if (!user) return false;
  if (tienePermiso(user, 'itManager')) return true;
  const allKeys = getAllPermisoKeys();
  return allKeys.some(k => k.startsWith(prefix) && tienePermiso(user, k));
}

export function puedeVer(user: UsuarioIT | null, moduleKey: string): boolean {
  if (!user) return false;
  if (tienePermiso(user, 'itManager')) return true;
  return tienePermiso(user, moduleKey + '_ver');
}

// ─── Auto-register new permissions (synchronizes all users) ───

export function getPermisosRegistry(): string[] {
  if (typeof window === 'undefined') return getAllPermisoKeys();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const stored: string[] = JSON.parse(raw);
      const current = getAllPermisoKeys();
      const merged = [...new Set([...stored, ...current])];
      if (merged.length !== stored.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      }
      return merged;
    }
  } catch {}
  const current = getAllPermisoKeys();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {}
  return current;
}

// ─── Tree state helpers for UI ───

export function getChildrenKeys(items: PermisoItem[], parentKey: string): string[] {
  const find = (list: PermisoItem[]): PermisoItem | null => {
    for (const item of list) {
      if (item.key === parentKey) return item;
      if (item.children) {
        const found = find(item.children);
        if (found) return found;
      }
    }
    return null;
  };
  const node = find(items);
  return node?.children?.map(c => c.key) || [];
}

export function hasDescendants(items: PermisoItem[], key: string): boolean {
  const find = (list: PermisoItem[]): PermisoItem | null => {
    for (const item of list) {
      if (item.key === key) return item;
      if (item.children) {
        const found = find(item.children);
        if (found) return found;
      }
    }
    return null;
  };
  const node = find(items);
  return !!node?.children && node.children.length > 0;
}
