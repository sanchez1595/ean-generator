'use client';

import { useEffect, useState } from 'react';
import type { GtinType } from '@/lib/types';

export function Barcode({
  gtin,
  type,
  className,
}: {
  gtin: string;
  type: GtinType;
  className?: string;
}) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSvg(null);
    setError(null);
    fetch(`/api/barcode/${gtin}?type=${encodeURIComponent(type)}&format=svg`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.text();
      })
      .then((text) => {
        if (!cancelled) setSvg(text);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [gtin, type]);

  if (error) {
    return (
      <div className={`border border-danger/30 bg-danger/5 p-4 text-xs text-danger ${className ?? ''}`}>
        No se pudo generar el código: {error}
      </div>
    );
  }
  if (!svg) {
    return <div className={`h-32 animate-pulse bg-rule/40 ${className ?? ''}`} />;
  }
  return (
    <div
      className={className}
      // El SVG viene del backend (bwip-js), es seguro inyectar
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
