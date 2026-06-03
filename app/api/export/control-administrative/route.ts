import { NextRequest, NextResponse } from 'next/server';
import { generateEngineMonitorXLSX, generateEngineMonitorPPTX } from '@/lib/export-engine-monitor';
import { generateControlAdministrativeXLSX } from '@/lib/export-control-administrative';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Route: Control Administrative "Base Depurada" (legacy)
    if (body.type === 'control-administrative') {
      if (!body.entries || !Array.isArray(body.entries)) {
        return NextResponse.json({ error: 'Missing entries array' }, { status: 400 });
      }
      const buf = await generateControlAdministrativeXLSX(body.entries, body.title);
      return new NextResponse(Buffer.from(buf), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="control_administrative.xlsx"',
        },
      });
    }

    // Route: Engine Monitor (multi-format)
    if (!body.entries || !Array.isArray(body.entries)) {
      return NextResponse.json({ error: 'Missing entries array' }, { status: 400 });
    }

    const format: string = body.format || 'xlsx';
    const chartImage = body.chartImage as string | undefined;
    const filters = body.filters;

    if (format === 'pptx') {
      const buf = await generateEngineMonitorPPTX(body.entries, chartImage, filters);
      return new NextResponse(Buffer.from(buf), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'Content-Disposition': 'attachment; filename="engine_monitor.pptx"',
        },
      });
    }

    // Default: xlsx
    const chartData = body.chartData;
    const buf = await generateEngineMonitorXLSX(body.entries, chartImage, filters, chartData);
    return new NextResponse(Buffer.from(buf), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="engine_monitor.xlsx"',
      },
    });
  } catch (e: any) {
    console.error('[Export API]', e);
    return NextResponse.json({ error: e.message || 'Export failed' }, { status: 500 });
  }
}
