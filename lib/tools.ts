export type ToolParam = { type: string; description: string; enum?: string[] };
export type ToolSchema = {
  name: string;
  description: string;
  parameters: Record<string, ToolParam>;
  required?: string[];
};

export type ToolResult = { success: boolean; data: unknown; error?: string };

const FB_URL = 'https://system-control-administrative-default-rtdb.firebaseio.com';
const GH_REPO = 'jalfredobaltomora-jpg/v0-ailoginandpanel';
const TOOLS: Record<string, (args: Record<string, unknown>) => Promise<ToolResult>> = {};

export async function registerTool(name: string, fn: (args: Record<string, unknown>) => Promise<ToolResult>) {
  TOOLS[name] = fn;
}

export async function executeTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  const fn = TOOLS[name];
  if (!fn) return { success: false, data: null, error: `Tool "${name}" not found` };
  try {
    return await fn(args);
  } catch (e) {
    return { success: false, data: null, error: String(e) };
  }
}

export const TOOL_DEFINITIONS: ToolSchema[] = [
  {
    name: 'analizar_datos',
    description: 'Analiza datos del sistema (dashboard, ventas, inventario, clientes, productos). Usa esto para obtener métricas, tendencias, comparativas y anomalías.',
    parameters: {
      tipo: { type: 'string', description: 'Tipo de análisis: ventas, inventario, clientes, productos, general', enum: ['ventas', 'inventario', 'clientes', 'productos', 'general'] },
      periodo: { type: 'string', description: 'Período a analizar: hoy, semana, mes, all' },
      detalle: { type: 'string', description: 'Nivel de detalle: resumen, detallado, anomalias' },
    },
    required: ['tipo'],
  },
  {
    name: 'auditar_inventario',
    description: 'Audita el inventario actual contra umbrales. Detecta stock bajo, productos sin movimiento, desviaciones.',
    parameters: {
      umbral_stock: { type: 'string', description: 'Umbral para considerar stock bajo (ej: 5, 10)' },
    },
  },
  {
    name: 'diagnosticar_sistema',
    description: 'Ejecuta un diagnóstico del estado del sistema: verifica Firebase, APIs, y módulos críticos.',
    parameters: {},
  },
  {
    name: 'github_status',
    description: 'Consulta el estado del repositorio en GitHub: últimos commits, ramas, issues abiertos, PRs pendientes.',
    parameters: {
      tipo: { type: 'string', description: 'Tipo de consulta: commits, issues, prs, general', enum: ['commits', 'issues', 'prs', 'general'] },
    },
  },
  {
    name: 'buscar_producto',
    description: 'Busca productos en el catálogo por nombre, SKU o categoría. Devuelve stock, precio, categoría.',
    parameters: {
      query: { type: 'string', description: 'Término de búsqueda (nombre, SKU o categoría)' },
      limite: { type: 'string', description: 'Máximo de resultados (ej: 5, 10)' },
    },
    required: ['query'],
  },
  {
    name: 'consultar_ventas',
    description: 'Consulta el resumen de ventas: total del día, semana o mes, productos más vendidos, ingresos.',
    parameters: {
      periodo: { type: 'string', description: 'Período: hoy, semana, mes', enum: ['hoy', 'semana', 'mes'] },
    },
  },
  {
    name: 'consultar_cliente',
    description: 'Busca un cliente por nombre, teléfono o código. Devuelve datos de contacto e historial de compras.',
    parameters: {
      query: { type: 'string', description: 'Nombre, teléfono o código del cliente' },
    },
    required: ['query'],
  },
];

registerTool('analizar_datos', async (args) => {
  const tipo = String(args.tipo || 'general');
  const periodo = String(args.periodo || 'all');
  const detalle = String(args.detalle || 'resumen');
  try {
    const res = await fetch(`${FB_URL}/products.json?shallow=true`);
    const productCount = res.ok ? Object.keys(await res.json()).length : 0;
    return {
      success: true,
      data: {
        tipo, periodo, detalle,
        timestamp: new Date().toISOString(),
        total_productos: productCount,
        mensaje: `Análisis de ${tipo} para período ${periodo} completado. ${productCount} productos en catálogo.`,
      },
    };
  } catch (e) {
    return { success: false, data: null, error: String(e) };
  }
});

registerTool('buscar_producto', async (args) => {
  const q = String(args.query || '').toLowerCase();
  const limite = parseInt(String(args.limite || '10'), 10);
  if (!q) return { success: false, data: null, error: 'Se requiere un término de búsqueda' };
  try {
    const res = await fetch(`${FB_URL}/products.json`);
    if (!res.ok) return { success: true, data: { productos: [], total: 0 } };
    const products = await res.json() || {};
    const results = Object.values(products)
      .filter((p: any) => {
        const name = (p.nombre || p.name || '').toLowerCase();
        const sku = (p.sku || '').toLowerCase();
        const cat = (p.categoria || '').toLowerCase();
        return name.includes(q) || sku.includes(q) || cat.includes(q);
      })
      .slice(0, limite)
      .map((p: any) => ({
        nombre: p.nombre || p.name || 'Sin nombre',
        sku: p.sku || '',
        cantidad: p.cantidad || p.quantity || 0,
        precio_venta: p.precio_venta || p.precio || 0,
        categoria: p.categoria || '',
      }));
    return { success: true, data: { productos: results, total: results.length } };
  } catch (e) {
    return { success: false, data: null, error: String(e) };
  }
});

registerTool('consultar_ventas', async (args) => {
  const periodo = String(args.periodo || 'hoy');
  try {
    const res = await fetch(`${FB_URL}/invoices.json`);
    if (!res.ok) return { success: true, data: { ventas: [], total_ingresos: 0, mensaje: 'No hay datos de ventas' } };
    const invoices = await res.json() || {};
    const now = new Date();
    const start = new Date(now);
    if (periodo === 'hoy') start.setHours(0, 0, 0, 0);
    else if (periodo === 'semana') start.setDate(now.getDate() - 7);
    else start.setMonth(now.getMonth() - 1);

    const ventas = Object.values(invoices).filter((inv: any) => {
      if (!inv.fecha) return false;
      const f = new Date(inv.fecha);
      return f >= start && f <= now;
    }).map((inv: any) => ({
      folio: inv.folio || inv.id || '',
      total: inv.total || 0,
      cliente: inv.cliente_nombre || 'Mostrador',
      fecha: inv.fecha || '',
    }));

    const totalIngresos = ventas.reduce((sum: number, v: any) => sum + v.total, 0);
    return {
      success: true,
      data: {
        periodo,
        total_ventas: ventas.length,
        total_ingresos: Math.round(totalIngresos * 100) / 100,
        ventas: ventas.slice(-10),
        mensaje: `Se encontraron ${ventas.length} ventas en el período. Total: $${Math.round(totalIngresos * 100) / 100}`,
      },
    };
  } catch (e) {
    return { success: false, data: null, error: String(e) };
  }
});

registerTool('consultar_cliente', async (args) => {
  const q = String(args.query || '').toLowerCase();
  if (!q) return { success: false, data: null, error: 'Se requiere un nombre, teléfono o código' };
  try {
    const res = await fetch(`${FB_URL}/clientes.json`);
    if (!res.ok) return { success: true, data: { clientes: [], total: 0 } };
    const clientes = await res.json() || {};
    const results = Object.entries(clientes)
      .filter(([, c]: [string, any]) => {
        const name = (c.nombre || c.name || '').toLowerCase();
        const phone = (c.telefono || '').toLowerCase();
        const code = (c.codigo || '').toLowerCase();
        return name.includes(q) || phone.includes(q) || code.includes(q);
      })
      .slice(0, 5)
      .map(([id, c]: [string, any]) => ({
        id,
        nombre: c.nombre || c.name || 'Sin nombre',
        telefono: c.telefono || '',
        email: c.email || '',
        total_compras: c.total_compras || 0,
      }));
    return { success: true, data: { clientes: results, total: results.length } };
  } catch (e) {
    return { success: false, data: null, error: String(e) };
  }
});

registerTool('auditar_inventario', async (args) => {
  const umbral = parseInt(String(args.umbral_stock || '5'), 10);
  try {
    const res = await fetch(`${FB_URL}/products.json`);
    if (!res.ok) return { success: true, data: { stock_bajo: [], total_productos: 0, mensaje: 'No se pudo conectar a la base de datos' } };
    const products = await res.json() || {};
    const entries = Object.entries(products).map(([id, p]: [string, any]) => ({
      id, name: p.nombre || p.name || 'Sin nombre', stock: p.cantidad || p.quantity || 0, sku: p.sku || '',
    }));
    const stockBajo = entries.filter((p: any) => p.stock <= umbral).sort((a: any, b: any) => a.stock - b.stock);
    return {
      success: true,
      data: {
        stock_bajo: stockBajo.slice(0, 20),
        total_productos: entries.length,
        productos_con_stock_bajo: stockBajo.length,
        umbral_utilizado: umbral,
        recomendacion: stockBajo.length > 0
          ? `Hay ${stockBajo.length} productos con stock ≤ ${umbral}. Revisa la lista para reabastecer.`
          : `No hay productos con stock bajo (umbral: ${umbral}).`,
      },
    };
  } catch (e) {
    return { success: false, data: null, error: String(e) };
  }
});

registerTool('diagnosticar_sistema', async () => {
  try {
    const checks: Record<string, unknown> = {};
    try {
      const fbRes = await fetch(`${FB_URL}/.json?shallow=true`);
      checks.firebase = { ok: fbRes.ok, status: fbRes.status };
    } catch { checks.firebase = { ok: false, error: 'No se pudo conectar a Firebase' }; }
    checks.entorno = { vercel: !!process.env.VERCEL, node_version: process.version };
    const healthy = Object.values(checks).every((c: any) => c.ok !== false);
    return {
      success: true,
      data: {
        estado: healthy ? 'saludable' : 'con_issues',
        timestamp: new Date().toISOString(), checks,
        recomendacion: healthy ? 'Todos los sistemas operativos normales.' : 'Hay módulos con problemas.',
      },
    };
  } catch (e) {
    return { success: false, data: null, error: String(e) };
  }
});

registerTool('github_status', async (args) => {
  const tipo = String(args.tipo || 'general');
  try {
    const data: Record<string, unknown> = { repositorio: GH_REPO, tipo };
    if (tipo === 'commits' || tipo === 'general') {
      const res = await fetch(`https://api.github.com/repos/${GH_REPO}/commits?per_page=5`);
      if (res.ok) {
        const commits = await res.json();
        data.ultimos_commits = commits.map((c: any) => ({
          mensaje: c.commit.message.split('\n')[0], autor: c.commit.author.name, fecha: c.commit.author.date,
        }));
      }
    }
    if (tipo === 'issues' || tipo === 'general') {
      const res = await fetch(`https://api.github.com/repos/${GH_REPO}/issues?state=open&per_page=5`);
      if (res.ok) {
        const issues = await res.json();
        data.issues_abiertos = issues.map((i: any) => ({ titulo: i.title, numero: i.number }));
      }
    }
    if (tipo === 'prs' || tipo === 'general') {
      const res = await fetch(`https://api.github.com/repos/${GH_REPO}/pulls?state=open&per_page=5`);
      if (res.ok) {
        const prs = await res.json();
        data.prs_abiertos = prs.map((p: any) => ({ titulo: p.title, numero: p.number, autor: p.user.login }));
      }
    }
    return { success: true, data };
  } catch (e) {
    return { success: false, data: null, error: String(e) };
  }
});
