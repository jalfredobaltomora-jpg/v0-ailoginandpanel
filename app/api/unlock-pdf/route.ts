import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';

export const maxDuration = 60;
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const password = formData.get('password') as string || '';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Try loading normally first (no encryption)
    let pdfDoc: PDFDocument;
    try {
      pdfDoc = await PDFDocument.load(buffer);
    } catch (loadErr: any) {
      const msg = loadErr?.message || '';
      if (msg.toLowerCase().includes('encrypt') || msg.toLowerCase().includes('password')) {
        // PDF is encrypted — load with ignoreEncryption
        pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      } else {
        throw loadErr;
      }
    }

    // Save directly — this creates a new PDF without encryption
    const pdfBytes = await pdfDoc.save({ useObjectStreams: false });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${file.name.replace('.pdf', '_desbloqueado.pdf')}"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to unlock PDF' }, { status: 500 });
  }
}
