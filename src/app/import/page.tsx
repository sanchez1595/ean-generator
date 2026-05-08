'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { CompanyConfig, GtinType } from '@/lib/types';

interface FillSummary {
  sheet: string;
  column: number;
  gtinType: GtinType;
  companyPrefix: string;
  startReference: number;
  totalRows: number;
  keptValid: number;
  generated: number;
  overwroteInvalid: number;
  overwroteValid: number;
  duplicateInFile: number;
  errors: { row: number; reason: string }[];
  nextReference: number;
}

export default function ImportXlsxPage() {
  const [config, setConfig] = useState<CompanyConfig | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [companyPrefix, setCompanyPrefix] = useState('');
  const [startReference, setStartReference] = useState(0);
  const [gtinType, setGtinType] = useState<GtinType>('EAN-13');
  const [overwrite, setOverwrite] = useState(false);
  const [logisticIndicator, setLogisticIndicator] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<FillSummary | null>(null);
  const [downloadInfo, setDownloadInfo] = useState<{ name: string; url: string } | null>(null);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((d: { config: CompanyConfig | null }) => {
        if (d.config) {
          setConfig(d.config);
          setCompanyPrefix(d.config.companyPrefix);
          setStartReference(d.config.nextReference);
        }
      })
      .catch(() => undefined);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSummary(null);
    if (downloadInfo) URL.revokeObjectURL(downloadInfo.url);
    setDownloadInfo(null);

    if (!file) {
      setError('Selecciona un archivo .xlsx');
      return;
    }
    if (!/^\d{2,12}$/.test(companyPrefix)) {
      setError('El prefijo debe tener entre 2 y 12 dígitos');
      return;
    }

    const fd = new FormData();
    fd.append('file', file);
    fd.append('companyPrefix', companyPrefix);
    fd.append('gtinType', gtinType);
    fd.append('startReference', String(startReference));
    fd.append('overwrite', String(overwrite));
    if (gtinType === 'ITF-14') fd.append('logisticIndicator', String(logisticIndicator));

    setSubmitting(true);
    try {
      const res = await fetch('/api/xlsx-fill', { method: 'POST', body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Error procesando el archivo' }));
        setError(data.error || `HTTP ${res.status}`);
        return;
      }
      const summaryB64 = res.headers.get('X-Fill-Summary');
      let parsedSummary: FillSummary | null = null;
      if (summaryB64) {
        try {
          parsedSummary = JSON.parse(atob(summaryB64)) as FillSummary;
        } catch {
          /* ignore */
        }
      }

      const dispo = res.headers.get('Content-Disposition') || '';
      const m = /filename="([^"]+)"/.exec(dispo);
      const filename = m ? decodeURIComponent(m[1]) : 'archivo-con-ean.xlsx';

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setDownloadInfo({ name: filename, url });
      setSummary(parsedSummary);
    } catch (err) {
      setError(`Error de red: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[420px_1fr]">
      <div>
        <div className="label-mini mb-2">Importar y rellenar</div>
        <h1 className="mb-2 text-3xl font-light tracking-tight">Importar XLSX</h1>
        <p className="mb-10 text-sm text-ink-muted">
          Sube un archivo Excel con la columna <span className="font-mono">Variant Barcode</span>.
          La app valida los códigos existentes (GS1 Mod-10) y genera EAN nuevos para las celdas
          vacías o inválidas usando tu prefijo. Te devuelve el archivo modificado.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <fieldset className="space-y-4 border-t border-rule pt-6">
            <legend className="label-mini -translate-y-9 bg-paper px-2">Archivo</legend>
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full font-mono text-sm"
            />
            {file ? (
              <p className="font-mono text-xs text-ink-muted">
                {file.name} · {(file.size / 1024).toFixed(0)} KB
              </p>
            ) : null}
          </fieldset>

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
            <legend className="label-mini -translate-y-9 bg-paper px-2">Prefijo y referencia</legend>

            <div>
              <label htmlFor="prefix">Prefijo de empresa</label>
              <input
                id="prefix"
                type="text"
                inputMode="numeric"
                pattern="\d*"
                value={companyPrefix}
                onChange={(e) => setCompanyPrefix(e.target.value.replace(/\D/g, ''))}
                placeholder="770XXXX"
                className="mt-2 font-mono"
              />
              <p className="mt-2 text-xs text-ink-muted">
                {config
                  ? `Por defecto del config: ${config.companyPrefix}`
                  : 'Ingresa el prefijo GS1 (770/771 = Colombia, 20-29 = uso interno).'}
              </p>
            </div>

            <div>
              <label htmlFor="from">Referencia inicial</label>
              <input
                id="from"
                type="number"
                min={0}
                value={startReference}
                onChange={(e) => setStartReference(Math.max(0, Number(e.target.value) || 0))}
                className="mt-2 font-mono"
              />
              <p className="mt-2 text-xs text-ink-muted">
                Las nuevas referencias se asignan secuencialmente desde aquí.
              </p>
            </div>

            <label className="flex items-start gap-3 pt-2">
              <input
                type="checkbox"
                checked={overwrite}
                onChange={(e) => setOverwrite(e.target.checked)}
                className="mt-1"
              />
              <span className="text-sm">
                Sobrescribir códigos válidos existentes{' '}
                <span className="block text-xs text-ink-muted">
                  Por defecto solo se rellenan vacíos y se reemplazan los inválidos.
                </span>
              </span>
            </label>
          </fieldset>

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
              disabled={submitting || !file}
              className="btn-primary disabled:opacity-50"
            >
              {submitting ? 'Procesando...' : 'Procesar y descargar →'}
            </button>
          </div>
        </form>
      </div>

      <aside className="space-y-4">
        <div className="label-mini">Resultado</div>
        {!summary && !downloadInfo ? (
          <div className="card p-12 text-center text-xs text-ink-faint">
            El resumen y el archivo descargable aparecerán aquí cuando se procese el XLSX.
          </div>
        ) : null}

        {downloadInfo ? (
          <div className="card p-6">
            <div className="label-mini mb-2">Archivo listo</div>
            <p className="mb-4 font-mono text-sm">{downloadInfo.name}</p>
            <a
              href={downloadInfo.url}
              download={downloadInfo.name}
              className="btn-primary inline-flex"
            >
              ↓ Descargar XLSX
            </a>
          </div>
        ) : null}

        {summary ? (
          <div className="card divide-y divide-rule">
            <Row label="Hoja procesada" value={summary.sheet} />
            <Row label="Columna" value={`#${summary.column} (Variant Barcode)`} />
            <Row label="Tipo" value={summary.gtinType} />
            <Row label="Prefijo" value={summary.companyPrefix} />
            <Row label="Filas totales" value={summary.totalRows.toLocaleString('es-CO')} />
            <Row label="Conservados (válidos)" value={summary.keptValid.toLocaleString('es-CO')} />
            <Row label="Generados (vacíos)" value={summary.generated.toLocaleString('es-CO')} />
            <Row
              label="Reemplazados (inválidos)"
              value={summary.overwroteInvalid.toLocaleString('es-CO')}
            />
            {summary.overwroteValid > 0 ? (
              <Row
                label="Sobrescritos (válidos)"
                value={summary.overwroteValid.toLocaleString('es-CO')}
              />
            ) : null}
            <Row
              label="Próxima referencia"
              value={`#${summary.nextReference.toLocaleString('es-CO')}`}
            />
            {summary.errors.length > 0 ? (
              <div className="p-4">
                <div className="label-mini mb-2 text-warn">
                  ⚠ {summary.errors.length} error(es)
                </div>
                <ul className="max-h-48 space-y-1 overflow-auto font-mono text-xs">
                  {summary.errors.slice(0, 50).map((e, i) => (
                    <li key={i}>
                      Fila {e.row}: {e.reason}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="label-mini">{label}</div>
      <div className="font-mono text-sm">{value}</div>
    </div>
  );
}
