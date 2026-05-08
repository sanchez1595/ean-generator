import { NextRequest, NextResponse } from 'next/server';
import { getConfig, saveConfig } from '@/lib/db';
import { classifyPrefix } from '@/lib/gtin';
import type { CompanyConfig } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET() {
  const config = await getConfig();
  return NextResponse.json({ config });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<CompanyConfig>;

  if (!body.companyName?.trim()) {
    return NextResponse.json({ error: 'El nombre de la empresa es requerido' }, { status: 400 });
  }
  if (!body.companyPrefix || !/^\d+$/.test(body.companyPrefix)) {
    return NextResponse.json(
      { error: 'El prefijo debe contener solo dígitos' },
      { status: 400 },
    );
  }
  if (body.companyPrefix.length < 4 || body.companyPrefix.length > 12) {
    return NextResponse.json(
      { error: 'El prefijo debe tener entre 4 y 12 dígitos' },
      { status: 400 },
    );
  }

  const classification = classifyPrefix(body.companyPrefix);
  const mode: CompanyConfig['mode'] =
    body.mode ?? (classification.scope === 'internal' ? 'internal' : 'official');

  const existing = await getConfig();
  const now = new Date().toISOString();

  const config: CompanyConfig = {
    mode,
    companyName: body.companyName.trim(),
    country: body.country ?? 'CO',
    companyPrefix: body.companyPrefix,
    nextReference: body.nextReference ?? existing?.nextReference ?? 0,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await saveConfig(config);
  return NextResponse.json({ config });
}
