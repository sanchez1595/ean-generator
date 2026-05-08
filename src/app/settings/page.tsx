'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { classifyPrefix } from '@/lib/gtin';
import type { CompanyConfig } from '@/lib/types';

const COUNTRIES: { code: string; label: string; suggestedPrefix?: string }[] = [
  { code: 'CO', label: 'Colombia (770/771)', suggestedPrefix: '770' },
  { code: 'MX', label: 'México (750)', suggestedPrefix: '750' },
  { code: 'AR', label: 'Argentina (779)', suggestedPrefix: '779' },
  { code: 'CL', label: 'Chile (780)', suggestedPrefix: '780' },
  { code: 'EC', label: 'Ecuador (786)', suggestedPrefix: '786' },
  { code: 'PE', label: 'Perú (775)', suggestedPrefix: '775' },
  { code: 'UY', label: 'Uruguay (773)', suggestedPrefix: '773' },
  { code: 'OTHER', label: 'Otro / Internacional' },
];

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [mode, setMode] = useState<'official' | 'internal'>('official');
  const [companyName, setCompanyName] = useState('');
  const [country, setCountry] = useState('CO');
  const [companyPrefix, setCompanyPrefix] = useState('');
  const [nextReference, setNextReference] = useState(0);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((d: { config: CompanyConfig | null }) => {
        if (d.config) {
          setMode(d.config.mode);
          setCompanyName(d.config.companyName);
          setCountry(d.config.country);
          setCompanyPrefix(d.config.companyPrefix);
          setNextReference(d.config.nextReference);
        }
        setLoading(false);
      });
  }, []);

  const classification = companyPrefix ? classifyPrefix(companyPrefix) : null;
  const refDigits = Math.max(0, 12 - companyPrefix.length);
  const capacity = refDigits > 0 ? Math.pow(10, refDigits) : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode,
        companyName,
        country,
        companyPrefix,
        nextReference,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || 'Error al guardar');
      return;
    }
    setSuccess(true);
    setTimeout(() => router.push('/'), 600);
  }

  if (loading) return <div className="font-mono text-sm text-ink-muted">Cargando...</div>;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="label-mini mb-2">Configuración</div>
      <h1 className="mb-2 text-3xl font-light tracking-tight">Prefijo de empresa</h1>
      <p className="mb-10 text-sm text-ink-muted">
        Define el prefijo GS1 que tu empresa tiene asignado. Si no tienes uno oficial, puedes operar
        en modo interno usando el rango <span className="font-mono">20–29</span>.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-1">
          <div className="grid grid-cols-2">
            <button
              type="button"
              onClick={() => setMode('official')}
              className={`p-4 text-left transition-colors ${
                mode === 'official' ? 'bg-ink text-paper' : 'hover:bg-paper'
              }`}
            >
              <div className="text-xs uppercase tracking-wider2">Oficial</div>
              <div className="mt-1 text-sm">Prefijo GS1 asignado</div>
              <div className={`mt-2 text-[11px] ${mode === 'official' ? 'text-paper/60' : 'text-ink-muted'}`}>
                Para venta en retail, marketplaces, supermercados.
              </div>
            </button>
            <button
              type="button"
              onClick={() => setMode('internal')}
              className={`p-4 text-left transition-colors ${
                mode === 'internal' ? 'bg-ink text-paper' : 'hover:bg-paper'
              }`}
            >
              <div className="text-xs uppercase tracking-wider2">Interno</div>
              <div className="mt-1 text-sm">Rango 20–29</div>
              <div className={`mt-2 text-[11px] ${mode === 'internal' ? 'text-paper/60' : 'text-ink-muted'}`}>
                Inventario propio, no apto para retail global.
              </div>
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="companyName">Nombre de la empresa o marca</label>
          <input
            id="companyName"
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Mi Empresa S.A.S."
            required
            className="mt-2"
          />
        </div>

        <div>
          <label htmlFor="country">País</label>
          <select
            id="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="mt-2"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="companyPrefix">
            Prefijo de empresa (4–12 dígitos, sin dígito de control)
          </label>
          <input
            id="companyPrefix"
            type="text"
            inputMode="numeric"
            pattern="\d*"
            value={companyPrefix}
            onChange={(e) => setCompanyPrefix(e.target.value.replace(/\D/g, ''))}
            placeholder={mode === 'internal' ? '20XXXXXX' : '7701234'}
            required
            className="mt-2 font-mono"
          />
          {classification ? (
            <div className="mt-2 flex items-center gap-2 text-xs">
              {classification.scope === 'internal' ? (
                <span className="pill-warn">Interno</span>
              ) : classification.scope === 'reserved' ? (
                <span className="pill-danger">Reservado</span>
              ) : (
                <span className="pill-accent">Oficial</span>
              )}
              <span className="text-ink-muted">{classification.description}</span>
            </div>
          ) : null}
          {companyPrefix && classification?.scope === 'reserved' ? (
            <div className="mt-2 text-xs text-danger">
              Este prefijo está reservado y no debe usarse para productos comerciales.
            </div>
          ) : null}
          {companyPrefix && mode === 'internal' && classification?.scope !== 'internal' ? (
            <div className="mt-2 text-xs text-warn">
              En modo interno, el prefijo debe iniciar con 20–29.
            </div>
          ) : null}
        </div>

        <div className="card p-4">
          <div className="label-mini mb-2">Capacidad estimada (EAN-13)</div>
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-2xl">{capacity.toLocaleString('es-CO')}</span>
            <span className="text-xs text-ink-muted">
              {refDigits} dígito(s) para referencias
            </span>
          </div>
        </div>

        <div>
          <label htmlFor="nextReference">
            Siguiente referencia secuencial (avanzado)
          </label>
          <input
            id="nextReference"
            type="number"
            min={0}
            value={nextReference}
            onChange={(e) => setNextReference(Number(e.target.value))}
            className="mt-2 font-mono"
          />
          <div className="mt-2 text-xs text-ink-muted">
            Si ya tienes códigos asignados externamente, ajusta este contador para no duplicar
            referencias.
          </div>
        </div>

        {error ? (
          <div className="border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="border border-accent/30 bg-accent-soft p-3 text-sm text-accent">
            ✓ Guardado correctamente
          </div>
        ) : null}

        <div className="flex justify-end gap-3 pt-4">
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar configuración'}
          </button>
        </div>
      </form>
    </div>
  );
}
