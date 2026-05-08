'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { prefixCapacity } from '@/lib/gtin';
import type { CompanyConfig, GtinType } from '@/lib/types';

interface BulkResponse {
  items: { reference: number; gtin: string }[];
  count: number;
  from: number;
  to: number;
  consumed: boolean;
  nextReference: number;
  capacity: number;
  collisions: string[];
}

export default function BulkPage() {
  const router = useRouter();
  const [config, setConfig] = useState<CompanyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Form
  const [gtinType, setGtinType] = useState<GtinType>('EAN-13');
  const [count, setCount] = useState(50);
  const [fromOverride, setFromOverride] = useState<string>('');
  const [consume, setConsume] = useState(true);
  const [logisticIndicator, setLogisticIndicator] = useState(1);

  // Result
  const [result, setResult] = useState<BulkResponse | null>(null);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((d: { config: CompanyConfig | null }) => {
        if (!d.config) {
          router.push('/settings');
          return;
        }
        setConfig(d.config);
        setLoading(false);
      });
  }, [router]);

  const capacity = useMemo(
    () => (config ? prefixCapacity(gtinType, config.companyPrefix) : 0),
    [config, gtinType],
  );

  const startRef = useMemo(() => {
    if (fromOverride.trim() === '') return config?.nextReference ?? 0;
    const n = Number(fromOverride);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : config?.nextReference ?? 0;
  }, [fromOverride, config]);

  const remaining = Math.max(0, capacity - startRef);
  const exceedsCapacity = count > remaining;

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setGenerating(true);

    const body = {
      gtinType,
      count,
      from: fromOverride.trim() === '' ? undefined : Number(fromOverride),
      consume,
      logisticIndicator: gtinType === 'ITF-14' ? logisticIndicator : undefined,
    };

    const res = await fetch('/api/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setGenerating(false);
    if (!res.ok) {
      setError(data.error || 'Error al generar el lote');
      return;
    }
    setResult(data as BulkResponse);
    if (data.consumed && config) {
      setConfig({ ...config, nextReference: data.nextReference });
      setFromOverride('');
    }
  }

  async function copyText(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      // ignore
    }
  }

  function downloadFile(filename: string, content: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportTxt() {
    if (!result) return;
    const txt = result.items.map((it) => it.gtin).join('\n');
    downloadFile(`gtins-${gtinType}-${result.from}-${result.to}.txt`, txt, 'text/plain');
  }

  function exportCsv() {
    if (!result) return;
    const header = 'reference,gtin,gtinType\n';
    const rows = result.items
      .map((it) => `${it.reference},${it.gtin},${gtinType}`)
      .join('\n');
    downloadFile(
      `gtins-${gtinType}-${result.from}-${result.to}.csv`,
      header + rows + '\n',
      'text/csv',
    );
  }

  if (loading) return <div className="font-mono text-sm text-ink-muted">Cargando...</div>;
  if (!config) return null;

  return (
    <div className="grid gap-10 lg:grid-cols-[400px_1fr]">
      <div>
        <div className="label-mini mb-2">Generación en lote</div>
        <h1 className="mb-2 text-3xl font-light tracking-tight">Lote de códigos</h1>
        <p className="mb-10 text-sm text-ink-muted">
          Genera una lista de GTINs secuenciales sin crear productos. Útil para asignar los códigos
          en Shopify u otra plataforma sin duplicar el catálogo aquí.
        </p>

        <form onSubmit={handleGenerate} className="space-y-6">
          <fieldset className="space-y-4 border-t border-rule pt-6">
            <legend className="label-mini -translate-y-9 bg-paper px-2">Tipo de código</legend>
            <div className="card p-1">
              <div className="grid grid-cols-3">
                {(['EAN-13', 'EAN-8', 'ITF-14'] as GtinType[]).map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setGtinType(t)}
                    className={`p-3 text-center transition-colors ${
                      gtinType === t ? 'bg-ink text-paper' : 'hover:bg-paper'
                    }`}
                  >
                    <div className="font-mono text-sm">{t}</div>
                  </button>
                ))}
              </div>
            </div>

            {gtinType === 'ITF-14' && (
              <div>
                <label htmlFor="logIndicator">Indicador logístico (1–9)</label>
                <input
                  id="logIndicator"
                  type="number"
                  min={1}
                  max={9}
                  value={logisticIndicator}
                  onChange={(e) => setLogisticIndicator(Number(e.target.value))}
                  className="mt-2 font-mono"
                />
              </div>
            )}
          </fieldset>

          <fieldset className="space-y-4 border-t border-rule pt-6">
            <legend className="label-mini -translate-y-9 bg-paper px-2">Rango</legend>

            <div>
              <label htmlFor="count">Cantidad</label>
              <input
                id="count"
                type="number"
                min={1}
                max={Math.min(10000, remaining || 10000)}
                value={count}
                onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))}
                className="mt-2 font-mono"
              />
              <p className="mt-2 text-xs text-ink-muted">
                Máximo por lote: 10 000. Disponibles desde la referencia inicial:{' '}
                <span className="font-mono">{remaining.toLocaleString('es-CO')}</span>
              </p>
            </div>

            <div>
              <label htmlFor="from">
                Referencia inicial{' '}
                <span className="text-ink-faint">(opcional)</span>
              </label>
              <input
                id="from"
                type="number"
                min={0}
                value={fromOverride}
                onChange={(e) => setFromOverride(e.target.value)}
                placeholder={String(config.nextReference)}
                className="mt-2 font-mono"
              />
              <p className="mt-2 text-xs text-ink-muted">
                Por defecto continúa desde el contador actual:{' '}
                <span className="font-mono">#{config.nextReference}</span>
              </p>
            </div>

            <label className="flex items-start gap-3 pt-2">
              <input
                type="checkbox"
                checked={consume}
                onChange={(e) => setConsume(e.target.checked)}
                className="mt-1"
              />
              <span className="text-sm">
                Consumir referencias{' '}
                <span className="block text-xs text-ink-muted">
                  Avanza el contador para que la próxima generación no repita estos códigos.
                </span>
              </span>
            </label>
          </fieldset>

          {exceedsCapacity ? (
            <div className="border border-warn/40 bg-warn/5 p-3 text-xs text-warn">
              ⚠ La cantidad ({count.toLocaleString('es-CO')}) excede las referencias disponibles (
              {remaining.toLocaleString('es-CO')}) desde la referencia inicial.
            </div>
          ) : null}

          {error ? (
            <div className="border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-3 pt-4">
            <Link href="/" className="btn-ghost">
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={generating || exceedsCapacity}
              className="btn-primary disabled:opacity-50"
            >
              {generating ? 'Generando...' : `Generar ${count} →`}
            </button>
          </div>
        </form>
      </div>

      <aside className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="label-mini">Resultado</div>
            <h2 className="mt-1 text-xl font-light">
              {result
                ? `${result.count.toLocaleString('es-CO')} códigos`
                : 'Sin generar'}
            </h2>
            {result ? (
              <p className="mt-1 font-mono text-xs text-ink-muted">
                Ref. #{result.from} → #{result.to}
                {result.consumed ? ' · contador actualizado' : ' · contador no avanzado'}
              </p>
            ) : null}
          </div>
          {result ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  copyText(result.items.map((it) => it.gtin).join('\n'), 'all')
                }
                className="btn-ghost text-xs"
              >
                {copied === 'all' ? '✓ Copiado' : 'Copiar todos'}
              </button>
              <button type="button" onClick={exportTxt} className="btn-ghost text-xs">
                .txt
              </button>
              <button type="button" onClick={exportCsv} className="btn-ghost text-xs">
                .csv
              </button>
            </div>
          ) : null}
        </div>

        {result && result.collisions.length > 0 ? (
          <div className="border border-warn/40 bg-warn/5 p-3 text-xs text-warn">
            ⚠ {result.collisions.length} de los códigos generados ya están asignados a productos
            locales. Considera ajustar la referencia inicial.
          </div>
        ) : null}

        {!result ? (
          <div className="card p-12 text-center text-xs text-ink-faint">
            El lote aparecerá aquí. Solo números — los productos los gestionas en Shopify.
          </div>
        ) : (
          <div className="card divide-y divide-rule overflow-hidden">
            <div className="grid grid-cols-[80px_1fr_auto] items-center gap-3 bg-paper px-4 py-2 text-[10px] uppercase tracking-wider2 text-ink-muted">
              <div>Ref.</div>
              <div>GTIN</div>
              <div></div>
            </div>
            <div className="max-h-[70vh] divide-y divide-rule overflow-auto">
              {result.items.map((it) => {
                const collides = result.collisions.includes(it.gtin);
                return (
                  <div
                    key={it.gtin}
                    className="grid grid-cols-[80px_1fr_auto] items-center gap-3 px-4 py-2 hover:bg-paper"
                  >
                    <div className="font-mono text-[11px] text-ink-muted">
                      #{it.reference}
                    </div>
                    <div
                      className={`font-mono text-sm ${
                        collides ? 'text-warn' : 'text-ink'
                      }`}
                    >
                      {it.gtin}
                      {collides ? (
                        <span className="ml-2 text-[10px] uppercase tracking-wider2">
                          en uso
                        </span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => copyText(it.gtin, it.gtin)}
                      className="text-[10px] uppercase tracking-wider2 text-ink-muted hover:text-ink"
                    >
                      {copied === it.gtin ? '✓' : 'copiar'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
