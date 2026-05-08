import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { buildGtin, GTIN_LENGTH, prefixCapacity, validateGtin } from '@/lib/gtin';
import type { GtinType } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

const TARGET_HEADER = 'variant barcode';

function findHeaderColumn(ws: ExcelJS.Worksheet, target: string): number | null {
  const header = ws.getRow(1);
  const t = target.trim().toLowerCase();
  for (let c = 1; c <= ws.columnCount; c++) {
    const v = header.getCell(c).value;
    const text = v == null ? '' : String(v).trim().toLowerCase();
    if (text === t) return c;
  }
  return null;
}

function cellToString(v: ExcelJS.CellValue): string {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v).trim();
  if (typeof v === 'object' && 'text' in (v as object)) {
    return String((v as { text: unknown }).text ?? '').trim();
  }
  if (typeof v === 'object' && 'result' in (v as object)) {
    const r = (v as { result: unknown }).result;
    return r == null ? '' : String(r).trim();
  }
  return String(v).trim();
}

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Petición inválida (esperado multipart/form-data)' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'Archivo no recibido. Usa el campo "file".' }, { status: 400 });
  }

  const companyPrefix = String(form.get('companyPrefix') ?? '').replace(/\D/g, '');
  if (!companyPrefix || companyPrefix.length < 2 || companyPrefix.length > 12) {
    return NextResponse.json(
      { error: 'companyPrefix inválido (2 a 12 dígitos numéricos)' },
      { status: 400 },
    );
  }

  const gtinType = (String(form.get('gtinType') ?? 'EAN-13') as GtinType);
  if (!(gtinType in GTIN_LENGTH)) {
    return NextResponse.json({ error: 'gtinType inválido' }, { status: 400 });
  }

  const startRef = Math.max(0, Math.floor(Number(form.get('startReference') ?? 0)) || 0);
  const overwrite = String(form.get('overwrite') ?? 'false') === 'true';
  const indicator = Math.min(9, Math.max(1, Math.floor(Number(form.get('logisticIndicator') ?? 1)) || 1));
  const sheetNameInput = String(form.get('sheetName') ?? '').trim();

  const buf = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buf);
  } catch {
    return NextResponse.json({ error: 'No se pudo abrir el XLSX' }, { status: 400 });
  }

  const ws = sheetNameInput ? wb.getWorksheet(sheetNameInput) : wb.worksheets[0];
  if (!ws) {
    return NextResponse.json({ error: 'Hoja no encontrada' }, { status: 400 });
  }

  const col = findHeaderColumn(ws, TARGET_HEADER);
  if (!col) {
    return NextResponse.json(
      { error: `No se encontró la columna "Variant Barcode" en la fila 1 de la hoja "${ws.name}"` },
      { status: 400 },
    );
  }

  const capacity = prefixCapacity(gtinType, companyPrefix);
  if (capacity === 0) {
    return NextResponse.json(
      { error: `El prefijo ${companyPrefix} no deja espacio para referencias en ${gtinType}` },
      { status: 400 },
    );
  }

  const summary = {
    sheet: ws.name,
    column: col,
    gtinType,
    companyPrefix,
    startReference: startRef,
    totalRows: 0,
    keptValid: 0,
    generated: 0,
    overwroteInvalid: 0,
    overwroteValid: 0,
    duplicateInFile: 0,
    errors: [] as { row: number; reason: string }[],
    nextReference: startRef,
  };

  const seen = new Set<string>();
  let ref = startRef;

  function nextGtin(rowNum: number): string | null {
    while (ref < capacity) {
      try {
        const g = buildGtin({
          type: gtinType,
          companyPrefix,
          reference: ref,
          logisticIndicator: indicator,
        });
        ref += 1;
        if (seen.has(g)) continue;
        seen.add(g);
        return g;
      } catch (e) {
        summary.errors.push({ row: rowNum, reason: `buildGtin: ${(e as Error).message}` });
        return null;
      }
    }
    summary.errors.push({ row: rowNum, reason: `Capacidad del prefijo agotada (cap ${capacity})` });
    return null;
  }

  // Pre-cargar valores existentes válidos al set para evitar colisión con generados
  for (let r = 2; r <= ws.rowCount; r++) {
    const v = cellToString(ws.getRow(r).getCell(col).value);
    if (v && validateGtin(v).valid) seen.add(v);
  }

  for (let r = 2; r <= ws.rowCount; r++) {
    const cell = ws.getRow(r).getCell(col);
    const current = cellToString(cell.value);
    summary.totalRows += 1;

    const isBlank = current === '';
    const validation = isBlank ? null : validateGtin(current);

    if (!isBlank && validation?.valid && !overwrite) {
      summary.keptValid += 1;
      continue;
    }

    const newGtin = nextGtin(r);
    if (!newGtin) continue;

    if (isBlank) summary.generated += 1;
    else if (validation?.valid) summary.overwroteValid += 1;
    else summary.overwroteInvalid += 1;

    cell.value = newGtin;
    cell.numFmt = '@'; // texto, evita notación científica en Excel
  }

  summary.nextReference = ref;

  const out = await wb.xlsx.writeBuffer();
  const summaryB64 = Buffer.from(JSON.stringify(summary)).toString('base64');
  const origName = (file as File).name || 'archivo.xlsx';
  const baseName = origName.replace(/\.xlsx?$/i, '');
  const outName = `${baseName} - con EAN.xlsx`;

  return new NextResponse(out, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(outName)}"`,
      'X-Fill-Summary': summaryB64,
      'Access-Control-Expose-Headers': 'X-Fill-Summary, Content-Disposition',
    },
  });
}
