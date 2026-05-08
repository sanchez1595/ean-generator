import { NextRequest, NextResponse } from 'next/server';
import { renderPng, renderSvg } from '@/lib/barcode';
import { GTIN_LENGTH, validateGtin } from '@/lib/gtin';
import type { GtinType } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: { gtin: string } },
) {
  const { gtin } = params;
  const url = new URL(req.url);
  const type = (url.searchParams.get('type') as GtinType) || inferType(gtin);
  const format = (url.searchParams.get('format') as 'svg' | 'png') || 'svg';

  if (!type || !(type in GTIN_LENGTH)) {
    return NextResponse.json({ error: 'Tipo de GTIN inválido' }, { status: 400 });
  }
  const v = validateGtin(gtin);
  if (!v.valid) {
    return NextResponse.json(
      { error: 'GTIN inválido', detail: v.reason },
      { status: 400 },
    );
  }

  try {
    if (format === 'png') {
      const buf = await renderPng(gtin, type);
      return new NextResponse(new Uint8Array(buf), {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': `inline; filename="${gtin}.png"`,
          'Cache-Control': 'private, max-age=300',
        },
      });
    }
    const svg = renderSvg(gtin, type);
    return new NextResponse(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Content-Disposition': `inline; filename="${gtin}.svg"`,
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: 'Error al renderizar', detail: String(e) },
      { status: 500 },
    );
  }
}

function inferType(gtin: string): GtinType | null {
  if (gtin.length === 13) return 'EAN-13';
  if (gtin.length === 8) return 'EAN-8';
  if (gtin.length === 14) return 'ITF-14';
  return null;
}
