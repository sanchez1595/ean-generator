import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createProduct, findByGtin, getConfig, listProducts } from '@/lib/db';
import { buildGtin, validateGtin, GTIN_LENGTH } from '@/lib/gtin';
import type { GtinType, Product } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q') ?? undefined;
  const limit = Number(url.searchParams.get('limit') ?? '100');
  const offset = Number(url.searchParams.get('offset') ?? '0');
  const data = await listProducts({ q, limit, offset });
  return NextResponse.json(data);
}

interface CreateBody {
  name: string;
  gtinType: GtinType;
  // Si manualGtin viene, usamos ese (debe ser válido). Si no, asignamos automático.
  manualGtin?: string;
  sku?: string;
  brand?: string;
  category?: string;
  description?: string;
  notes?: string;
  netContent?: string;
  unitPrice?: number;
  currency?: string;
  // Para ITF-14: indicador logístico (1-9)
  logisticIndicator?: number;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as CreateBody;

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
  }
  if (!body.gtinType || !(body.gtinType in GTIN_LENGTH)) {
    return NextResponse.json({ error: 'Tipo de GTIN inválido' }, { status: 400 });
  }

  let gtin: string;
  let increment = false;

  if (body.manualGtin) {
    const cleaned = body.manualGtin.replace(/\s+/g, '');
    const v = validateGtin(cleaned);
    if (!v.valid) {
      return NextResponse.json(
        { error: `GTIN manual inválido: ${v.reason}` },
        { status: 400 },
      );
    }
    if (cleaned.length !== GTIN_LENGTH[body.gtinType]) {
      return NextResponse.json(
        {
          error: `Longitud del GTIN (${cleaned.length}) no coincide con el tipo ${body.gtinType}`,
        },
        { status: 400 },
      );
    }
    const existing = await findByGtin(cleaned);
    if (existing) {
      return NextResponse.json(
        { error: `Ya existe un producto con GTIN ${cleaned}: ${existing.name}` },
        { status: 409 },
      );
    }
    gtin = cleaned;
  } else {
    const config = await getConfig();
    if (!config) {
      return NextResponse.json(
        { error: 'No hay configuración guardada. Configura el prefijo de empresa primero.' },
        { status: 400 },
      );
    }
    try {
      gtin = buildGtin({
        type: body.gtinType,
        companyPrefix: config.companyPrefix,
        reference: config.nextReference,
        logisticIndicator: body.logisticIndicator,
      });
      increment = true;
    } catch (e) {
      return NextResponse.json(
        { error: `Error al construir GTIN: ${String(e)}` },
        { status: 400 },
      );
    }
    const existing = await findByGtin(gtin);
    if (existing) {
      return NextResponse.json(
        {
          error: `Conflicto: el GTIN calculado ${gtin} ya está asignado. Avanza el contador en Configuración.`,
        },
        { status: 409 },
      );
    }
  }

  const now = new Date().toISOString();
  const product: Product = {
    id: randomUUID(),
    gtin,
    gtinType: body.gtinType,
    name: body.name.trim(),
    sku: body.sku?.trim() || undefined,
    brand: body.brand?.trim() || undefined,
    category: body.category?.trim() || undefined,
    description: body.description?.trim() || undefined,
    notes: body.notes?.trim() || undefined,
    netContent: body.netContent?.trim() || undefined,
    unitPrice: typeof body.unitPrice === 'number' ? body.unitPrice : undefined,
    currency: body.currency || 'COP',
    createdAt: now,
    updatedAt: now,
  };

  try {
    await createProduct(product, increment);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 409 });
  }
  return NextResponse.json({ product });
}
