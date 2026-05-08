// Lógica pura del dominio GTIN/EAN. Sin dependencias externas.
// Implementa el algoritmo GS1 Mod-10 para dígito de control.
// Referencia: GS1 General Specifications.

import type { GtinType } from './types';

const DIGITS_RE = /^\d+$/;

/**
 * Longitud total esperada para cada tipo de GTIN.
 */
export const GTIN_LENGTH: Record<GtinType, number> = {
  'EAN-13': 13,
  'EAN-8': 8,
  'ITF-14': 14,
};

/**
 * Calcula el dígito de control GS1 Mod-10.
 * Pasa la "base": el número SIN el dígito de control.
 *
 * Algoritmo:
 *  1. De derecha a izquierda, posición 1 (la última de la base) tiene peso 3, alterna 3-1-3-1...
 *  2. Suma todos los productos.
 *  3. checkDigit = (10 - (suma mod 10)) mod 10.
 */
export function calculateCheckDigit(base: string): number {
  if (!DIGITS_RE.test(base)) {
    throw new Error('La base debe contener solo dígitos');
  }
  let sum = 0;
  for (let i = 0, n = base.length - 1; n >= 0; i++, n--) {
    const d = base.charCodeAt(n) - 48; // '0' === 48
    sum += i % 2 === 0 ? d * 3 : d;
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * Valida que un GTIN completo (8, 12, 13 o 14 dígitos) tenga dígito de control correcto.
 */
export function validateGtin(code: string): {
  valid: boolean;
  type?: GtinType | 'GTIN-12';
  expectedCheckDigit?: number;
  providedCheckDigit?: number;
  reason?: string;
} {
  const c = code.replace(/\s+/g, '');
  if (!DIGITS_RE.test(c)) {
    return { valid: false, reason: 'Contiene caracteres no numéricos' };
  }
  const lengthToType: Record<number, GtinType | 'GTIN-12'> = {
    8: 'EAN-8',
    12: 'GTIN-12',
    13: 'EAN-13',
    14: 'ITF-14',
  };
  const type = lengthToType[c.length];
  if (!type) {
    return {
      valid: false,
      reason: `Longitud ${c.length} no corresponde a un GTIN válido (8, 12, 13 o 14)`,
    };
  }
  const expected = calculateCheckDigit(c.slice(0, -1));
  const provided = c.charCodeAt(c.length - 1) - 48;
  return {
    valid: expected === provided,
    type,
    expectedCheckDigit: expected,
    providedCheckDigit: provided,
    reason:
      expected === provided
        ? undefined
        : `Dígito de control inválido. Esperado: ${expected}, recibido: ${provided}`,
  };
}

/**
 * Construye un GTIN completo a partir de un prefijo de empresa y una referencia secuencial.
 * - Para EAN-13: el resultado total son 13 dígitos. La base es 12 dígitos = prefijo + referencia.
 * - Para EAN-8: 8 dígitos totales, base de 7.
 * - Para ITF-14: 14 dígitos totales, base de 13. El primer dígito es el "indicador logístico" (1-8 para
 *   agrupaciones de tamaño fijo, 9 para peso variable). Por defecto usamos 1.
 */
export function buildGtin(params: {
  type: GtinType;
  companyPrefix: string;
  reference: number;
  // Solo aplica para ITF-14. 1-8 = agrupación estándar, 9 = peso variable. Default: 1.
  logisticIndicator?: number;
}): string {
  const { type, companyPrefix, reference } = params;
  const indicator = params.logisticIndicator ?? 1;

  if (!DIGITS_RE.test(companyPrefix)) {
    throw new Error('El prefijo de empresa debe contener solo dígitos');
  }

  const totalLength = GTIN_LENGTH[type];
  const baseLength = totalLength - 1;

  let base: string;

  if (type === 'ITF-14') {
    // ITF-14: indicador (1) + EAN-13 sin check digit (12) = 13. Pero la práctica común es
    // construir desde el prefijo de empresa: indicador + prefijo + referencia.
    if (indicator < 1 || indicator > 9) {
      throw new Error('El indicador logístico de ITF-14 debe estar entre 1 y 9');
    }
    const refDigits = baseLength - 1 - companyPrefix.length;
    if (refDigits < 1) {
      throw new Error(
        `Prefijo demasiado largo para ITF-14: deja ${refDigits} dígito(s) para referencia`,
      );
    }
    const refStr = String(reference).padStart(refDigits, '0');
    if (refStr.length > refDigits) {
      throw new Error(
        `Referencia ${reference} excede capacidad. Máximo: ${'9'.repeat(refDigits)}`,
      );
    }
    base = `${indicator}${companyPrefix}${refStr}`;
  } else {
    const refDigits = baseLength - companyPrefix.length;
    if (refDigits < 1) {
      if (type === 'EAN-8') {
        throw new Error(
          `EAN-8 requiere un prefijo GS1-8 separado (corto, 2-4 dígitos), que GS1 asigna específicamente para productos pequeños. No se puede derivar del prefijo EAN-13. Si necesitas un EAN-8, ingrésalo manualmente o solicita un prefijo GS1-8 a GS1 Colombia.`,
        );
      }
      throw new Error(
        `Prefijo demasiado largo para ${type}: deja ${refDigits} dígito(s) para referencia`,
      );
    }
    const refStr = String(reference).padStart(refDigits, '0');
    if (refStr.length > refDigits) {
      throw new Error(
        `Referencia ${reference} excede capacidad. Máximo: ${'9'.repeat(refDigits)}`,
      );
    }
    base = `${companyPrefix}${refStr}`;
  }

  const cd = calculateCheckDigit(base);
  return `${base}${cd}`;
}

/**
 * Calcula la capacidad total del prefijo (cuántos productos distintos puedes asignar).
 */
export function prefixCapacity(type: GtinType, companyPrefix: string): number {
  const baseLength = GTIN_LENGTH[type] - 1;
  const refDigits =
    type === 'ITF-14' ? baseLength - 1 - companyPrefix.length : baseLength - companyPrefix.length;
  if (refDigits < 1) return 0;
  return Math.pow(10, refDigits);
}

/**
 * Detecta el rango/zona del prefijo según las reglas GS1.
 * Útil para advertir al usuario si está usando un rango incorrecto.
 */
export function classifyPrefix(prefix: string): {
  scope: 'internal' | 'official' | 'reserved' | 'unknown';
  description: string;
} {
  if (!DIGITS_RE.test(prefix) || prefix.length < 2) {
    return { scope: 'unknown', description: 'Prefijo inválido' };
  }
  const p2 = parseInt(prefix.slice(0, 2), 10);
  const p3 = parseInt(prefix.slice(0, 3), 10);

  if (p2 >= 20 && p2 <= 29) {
    return {
      scope: 'internal',
      description:
        'Rango de uso interno (no para venta retail global). Útil para etiquetado interno o productos de peso variable.',
    };
  }
  if (p3 === 770 || p3 === 771) {
    return { scope: 'official', description: 'Prefijo GS1 Colombia' };
  }
  if (p3 === 750) return { scope: 'official', description: 'Prefijo GS1 México' };
  if (p3 === 779) return { scope: 'official', description: 'Prefijo GS1 Argentina' };
  if (p3 === 780) return { scope: 'official', description: 'Prefijo GS1 Chile' };
  if (p3 === 786) return { scope: 'official', description: 'Prefijo GS1 Ecuador' };
  if (p3 === 775) return { scope: 'official', description: 'Prefijo GS1 Perú' };
  if (p3 === 773) return { scope: 'official', description: 'Prefijo GS1 Uruguay' };
  if (p3 >= 978 && p3 <= 979) return { scope: 'reserved', description: 'Reservado para ISBN (libros)' };
  if (p3 === 977) return { scope: 'reserved', description: 'Reservado para ISSN (publicaciones seriadas)' };
  if (p2 >= 0 && p2 <= 13) {
    return { scope: 'official', description: 'Rango UPC-A (Norteamérica)' };
  }
  return { scope: 'official', description: 'Prefijo GS1 internacional' };
}

/**
 * Formatea un EAN-13 con espacios para mostrarlo legible: 770 1234 56789 0
 */
export function formatGtinHuman(gtin: string): string {
  if (gtin.length === 13) {
    return `${gtin.slice(0, 1)} ${gtin.slice(1, 7)} ${gtin.slice(7, 13)}`;
  }
  if (gtin.length === 8) {
    return `${gtin.slice(0, 4)} ${gtin.slice(4, 8)}`;
  }
  if (gtin.length === 14) {
    return `${gtin.slice(0, 1)} ${gtin.slice(1, 8)} ${gtin.slice(8, 14)}`;
  }
  return gtin;
}
