// Wrapper sobre bwip-js para renderizar barcodes cumpliendo spec GS1.
// Genera SVG (vector, ideal para impresión) y PNG (raster).

import bwipjs from 'bwip-js/node';
import type { GtinType } from './types';

const TYPE_TO_BWIPP: Record<GtinType, string> = {
  'EAN-13': 'ean13',
  'EAN-8': 'ean8',
  'ITF-14': 'itf14',
};

/**
 * Genera un SVG del barcode. Cumple specs GS1 con scale=3 (≈ tamaño nominal a 72dpi).
 */
export function renderSvg(gtin: string, type: GtinType): string {
  return bwipjs.toSVG({
    bcid: TYPE_TO_BWIPP[type],
    text: gtin,
    scale: 3,
    height: type === 'ITF-14' ? 32 : 26,
    includetext: true,
    textxalign: 'center',
    textfont: 'Helvetica',
    textsize: 10,
    backgroundcolor: 'FFFFFF',
    paddingwidth: 4,
    paddingheight: 4,
  });
}

/**
 * Genera un PNG del barcode (Buffer).
 */
export async function renderPng(gtin: string, type: GtinType): Promise<Buffer> {
  return bwipjs.toBuffer({
    bcid: TYPE_TO_BWIPP[type],
    text: gtin,
    scale: 4,
    height: type === 'ITF-14' ? 32 : 26,
    includetext: true,
    textxalign: 'center',
    textfont: 'Helvetica',
    textsize: 10,
    backgroundcolor: 'FFFFFF',
    paddingwidth: 4,
    paddingheight: 4,
  });
}
