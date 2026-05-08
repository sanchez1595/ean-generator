'use client';

import { useState } from 'react';
import { Barcode } from '@/components/Barcode';
import type { GtinType } from '@/lib/types';

interface ValidateResult {
  input: string;
  valid: boolean;
  type?: string;
  expectedCheckDigit?: number;
  providedCheckDigit?: number;
  reason?: string;
  suggestion?: { full: string; checkDigit: number };
  prefixInfo?: { scope: string; description: string };
}

export default function ValidatePage() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<ValidateResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const d = (await res.json()) as ValidateResult;
    setResult(d);
    setLoading(false);
  }

  const previewType: GtinType | null =
    result?.type === 'EAN-13' ? 'EAN-13' :
    result?.type === 'EAN-8' ? 'EAN-8' :
    result?.type === 'ITF-14' ? 'ITF-14' :
    null;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="label-mini mb-2">Validador</div>
      <h1 className="mb-2 text-3xl font-light tracking-tight">Verifica un GTIN</h1>
      <p className="mb-10 text-sm text-ink-muted">
        Pega un código existente. La aplicación calcula el dígito de control esperado y te dice si
        es válido. Si solo ingresas la base (sin check digit), te sugiere cuál debería ser.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          inputMode="numeric"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="7701234567890"
          className="font-mono text-lg"
        />
        <button type="submit" disabled={loading || !code} className="btn-primary disabled:opacity-50">
          {loading ? 'Validando...' : 'Validar →'}
        </button>
      </form>

      {result && (
        <div className="mt-10 space-y-6">
          <div
            className={`card p-6 ${
              result.valid
                ? 'border-accent/40 bg-accent-soft'
                : 'border-danger/40 bg-danger/5'
            }`}
          >
            <div className="flex items-center gap-3">
              {result.valid ? (
                <span className="font-mono text-2xl text-accent">✓</span>
              ) : (
                <span className="font-mono text-2xl text-danger">✗</span>
              )}
              <span className="text-lg font-medium">
                {result.valid ? 'GTIN válido' : 'GTIN inválido'}
              </span>
            </div>
            {result.reason && !result.valid ? (
              <p className="mt-3 text-sm text-danger">{result.reason}</p>
            ) : null}
            {result.type ? (
              <div className="mt-3 text-xs text-ink-muted">
                Tipo detectado: <span className="font-mono">{result.type}</span>
              </div>
            ) : null}
          </div>

          {result.suggestion && (
            <div className="card p-6">
              <div className="label-mini mb-2">Sugerencia</div>
              <p className="text-sm text-ink-muted">
                Si lo que ingresaste es la base sin dígito de control, el GTIN completo sería:
              </p>
              <div className="mt-3 font-mono text-2xl">
                {result.suggestion.full.slice(0, -1)}
                <span className="bg-accent-soft px-1 text-accent">
                  {result.suggestion.checkDigit}
                </span>
              </div>
            </div>
          )}

          {result.prefixInfo && (
            <div className="card p-6">
              <div className="label-mini mb-2">Análisis del prefijo</div>
              <div className="flex items-center gap-2">
                {result.prefixInfo.scope === 'official' ? (
                  <span className="pill-accent">Oficial</span>
                ) : result.prefixInfo.scope === 'internal' ? (
                  <span className="pill-warn">Interno</span>
                ) : result.prefixInfo.scope === 'reserved' ? (
                  <span className="pill-danger">Reservado</span>
                ) : (
                  <span className="pill">Desconocido</span>
                )}
                <span className="text-sm text-ink-muted">{result.prefixInfo.description}</span>
              </div>
            </div>
          )}

          {result.valid && previewType && (
            <div className="card p-6">
              <div className="label-mini mb-3">Vista previa del barcode</div>
              <Barcode gtin={result.input} type={previewType} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
