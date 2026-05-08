import { NextRequest, NextResponse } from 'next/server';
import { getConfig, readDb, transact } from '@/lib/db';
import { buildGtin, GTIN_LENGTH, prefixCapacity } from '@/lib/gtin';
import type { GtinType } from '@/lib/types';

export const runtime = 'nodejs';

interface BulkBody {
  gtinType: GtinType;
  count: number;
  // Referencia inicial. Si se omite, usa config.nextReference.
  from?: number;
  // Si true, avanza config.nextReference para que la próxima generación no repita.
  // Solo aplica cuando from no se especifica (o coincide con nextReference).
  consume?: boolean;
  // Solo ITF-14
  logisticIndicator?: number;
}

const MAX_BATCH = 10000;

export async function POST(req: NextRequest) {
  const body = (await req.json()) as BulkBody;

  if (!body.gtinType || !(body.gtinType in GTIN_LENGTH)) {
    return NextResponse.json({ error: 'Tipo de GTIN inválido' }, { status: 400 });
  }
  if (!Number.isInteger(body.count) || body.count < 1 || body.count > MAX_BATCH) {
    return NextResponse.json(
      { error: `La cantidad debe ser un entero entre 1 y ${MAX_BATCH}` },
      { status: 400 },
    );
  }

  const config = await getConfig();
  if (!config) {
    return NextResponse.json(
      { error: 'No hay configuración guardada. Configura el prefijo de empresa primero.' },
      { status: 400 },
    );
  }

  const start =
    typeof body.from === 'number' && Number.isInteger(body.from) && body.from >= 0
      ? body.from
      : config.nextReference;

  // Capacidad: cuántas referencias caben en el prefijo para este tipo
  const capacity = prefixCapacity(body.gtinType, config.companyPrefix);
  if (capacity === 0) {
    return NextResponse.json(
      {
        error: `El prefijo ${config.companyPrefix} no deja espacio para referencias en ${body.gtinType}.`,
      },
      { status: 400 },
    );
  }
  if (start + body.count > capacity) {
    return NextResponse.json(
      {
        error: `El rango excede la capacidad del prefijo (${capacity}). Inicio ${start} + cantidad ${body.count} > ${capacity}.`,
      },
      { status: 400 },
    );
  }

  // Generar lista
  const items: { reference: number; gtin: string }[] = [];
  try {
    for (let i = 0; i < body.count; i++) {
      const ref = start + i;
      const gtin = buildGtin({
        type: body.gtinType,
        companyPrefix: config.companyPrefix,
        reference: ref,
        logisticIndicator: body.logisticIndicator,
      });
      items.push({ reference: ref, gtin });
    }
  } catch (e) {
    return NextResponse.json({ error: `Error al construir GTIN: ${String(e)}` }, { status: 400 });
  }

  // Detectar colisiones con productos ya creados localmente (informativo)
  const db = await readDb();
  const existingGtins = new Set(db.products.map((p) => p.gtin));
  const collisions = items.filter((it) => existingGtins.has(it.gtin)).map((it) => it.gtin);

  // Avanzar contador si corresponde
  let newNextReference = config.nextReference;
  if (body.consume) {
    const endExclusive = start + body.count;
    if (endExclusive > config.nextReference) {
      newNextReference = await transact(async (d) => {
        if (!d.config) return config.nextReference;
        d.config.nextReference = endExclusive;
        d.config.updatedAt = new Date().toISOString();
        return d.config.nextReference;
      });
    }
  }

  return NextResponse.json({
    items,
    count: items.length,
    from: start,
    to: start + items.length - 1,
    consumed: body.consume === true && newNextReference !== config.nextReference,
    nextReference: newNextReference,
    capacity,
    collisions,
  });
}
