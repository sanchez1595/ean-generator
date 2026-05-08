import { NextRequest, NextResponse } from 'next/server';
import { calculateCheckDigit, classifyPrefix, validateGtin } from '@/lib/gtin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { code } = (await req.json()) as { code?: string };
  if (!code) {
    return NextResponse.json({ error: 'Falta el código a validar' }, { status: 400 });
  }
  const cleaned = code.replace(/\s+/g, '');
  const result = validateGtin(cleaned);

  // Si solo le pasaron la base (sin check digit), calculamos cuál sería
  let suggestion: { full: string; checkDigit: number } | undefined;
  if (!result.valid && /^\d+$/.test(cleaned)) {
    const baseLen = cleaned.length;
    if ([7, 11, 12, 13].includes(baseLen)) {
      try {
        const cd = calculateCheckDigit(cleaned);
        suggestion = { full: `${cleaned}${cd}`, checkDigit: cd };
      } catch {
        // ignorar
      }
    }
  }

  const prefixInfo = /^\d+$/.test(cleaned) ? classifyPrefix(cleaned) : null;

  return NextResponse.json({
    input: cleaned,
    ...result,
    suggestion,
    prefixInfo,
  });
}
