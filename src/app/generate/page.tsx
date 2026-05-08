'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Barcode } from '@/components/Barcode';
import { buildGtin } from '@/lib/gtin';
import type { CompanyConfig, GtinType, Product } from '@/lib/types';

export default function GeneratePage() {
  const router = useRouter();
  const [config, setConfig] = useState<CompanyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [netContent, setNetContent] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [gtinType, setGtinType] = useState<GtinType>('EAN-13');
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [manualGtin, setManualGtin] = useState('');
  const [logisticIndicator, setLogisticIndicator] = useState(1);

  // Preview del GTIN auto
  const [previewGtin, setPreviewGtin] = useState<string | null>(null);

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

  // Calcular preview cuando cambien parámetros
  useEffect(() => {
    if (!config || mode !== 'auto') {
      setPreviewGtin(null);
      return;
    }
    try {
      const g = buildGtin({
        type: gtinType,
        companyPrefix: config.companyPrefix,
        reference: config.nextReference,
        logisticIndicator,
      });
      setPreviewGtin(g);
    } catch {
      setPreviewGtin(null);
    }
  }, [config, gtinType, mode, logisticIndicator]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const body = {
      name,
      gtinType,
      sku: sku || undefined,
      brand: brand || undefined,
      category: category || undefined,
      description: description || undefined,
      notes: notes || undefined,
      netContent: netContent || undefined,
      unitPrice: unitPrice ? Number(unitPrice) : undefined,
      manualGtin: mode === 'manual' ? manualGtin : undefined,
      logisticIndicator: gtinType === 'ITF-14' ? logisticIndicator : undefined,
    };
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || 'Error al guardar');
      return;
    }
    const created = data.product as Product;
    router.push(`/products/${created.id}?just=1`);
  }

  if (loading) return <div className="font-mono text-sm text-ink-muted">Cargando...</div>;
  if (!config) return null;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_400px]">
      <div>
        <div className="label-mini mb-2">Generar código</div>
        <h1 className="mb-2 text-3xl font-light tracking-tight">Nuevo producto</h1>
        <p className="mb-10 text-sm text-ink-muted">
          La aplicación calcula el dígito de control y persiste el código en la base local.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <FormSection title="Tipo de código">
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
                    <div
                      className={`mt-1 text-[10px] uppercase tracking-wider2 ${
                        gtinType === t ? 'text-paper/60' : 'text-ink-faint'
                      }`}
                    >
                      {t === 'EAN-13'
                        ? 'Retail estándar'
                        : t === 'EAN-8'
                          ? 'Productos pequeños'
                          : 'Cajas / agrupaciones'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {gtinType === 'ITF-14' && (
              <div className="mt-4">
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
                <p className="mt-2 text-xs text-ink-muted">
                  1–8: agrupación de tamaño fijo. 9: peso variable.
                </p>
              </div>
            )}

            <div className="mt-6">
              <div className="label-mini mb-2">Asignación de GTIN</div>
              <div className="card p-1">
                <div className="grid grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setMode('auto')}
                    className={`p-3 text-left transition-colors ${
                      mode === 'auto' ? 'bg-ink text-paper' : 'hover:bg-paper'
                    }`}
                  >
                    <div className="text-sm">Automático</div>
                    <div
                      className={`text-[10px] uppercase tracking-wider2 ${
                        mode === 'auto' ? 'text-paper/60' : 'text-ink-muted'
                      }`}
                    >
                      Siguiente referencia secuencial
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('manual')}
                    className={`p-3 text-left transition-colors ${
                      mode === 'manual' ? 'bg-ink text-paper' : 'hover:bg-paper'
                    }`}
                  >
                    <div className="text-sm">Manual</div>
                    <div
                      className={`text-[10px] uppercase tracking-wider2 ${
                        mode === 'manual' ? 'text-paper/60' : 'text-ink-muted'
                      }`}
                    >
                      Ingresar GTIN existente
                    </div>
                  </button>
                </div>
              </div>

              {mode === 'manual' && (
                <div className="mt-4">
                  <label htmlFor="manualGtin">GTIN completo (con dígito de control)</label>
                  <input
                    id="manualGtin"
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    value={manualGtin}
                    onChange={(e) => setManualGtin(e.target.value.replace(/\D/g, ''))}
                    placeholder="7701234567890"
                    className="mt-2 font-mono"
                  />
                </div>
              )}
            </div>
          </FormSection>

          <FormSection title="Datos del producto">
            <div>
              <label htmlFor="name">Nombre *</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Producto..."
                required
                className="mt-2"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="sku">SKU interno</label>
                <input
                  id="sku"
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="SKU-001"
                  className="mt-2 font-mono"
                />
              </div>
              <div>
                <label htmlFor="brand">Marca</label>
                <input
                  id="brand"
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="mt-2"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="category">Categoría</label>
                <input
                  id="category"
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <label htmlFor="netContent">Contenido neto</label>
                <input
                  id="netContent"
                  type="text"
                  value={netContent}
                  onChange={(e) => setNetContent(e.target.value)}
                  placeholder="500 g · 1 L · etc."
                  className="mt-2"
                />
              </div>
            </div>
            <div>
              <label htmlFor="unitPrice">Precio unitario (COP)</label>
              <input
                id="unitPrice"
                type="number"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="0"
                className="mt-2 font-mono"
              />
            </div>
            <div>
              <label htmlFor="description">Descripción</label>
              <textarea
                id="description"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <label htmlFor="notes">Notas internas</label>
              <textarea
                id="notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-2"
              />
            </div>
          </FormSection>

          {error ? (
            <div className="border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-3 pt-4">
            <Link href="/" className="btn-ghost">
              Cancelar
            </Link>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? 'Generando...' : 'Generar y guardar →'}
            </button>
          </div>
        </form>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <div className="label-mini">Vista previa</div>
        <div className="card p-6">
          {mode === 'auto' && previewGtin ? (
            <>
              <div className="label-mini mb-2">GTIN propuesto</div>
              <div className="gtin-display mb-6 break-all">{previewGtin}</div>
              <Barcode gtin={previewGtin} type={gtinType} />
              <div className="mt-4 text-[11px] text-ink-muted">
                Ref. <span className="font-mono">#{config.nextReference}</span> · prefijo{' '}
                <span className="font-mono">{config.companyPrefix}</span>
              </div>
            </>
          ) : mode === 'manual' && manualGtin.length >= 8 ? (
            <>
              <div className="label-mini mb-2">GTIN ingresado</div>
              <div className="gtin-display mb-6 break-all">{manualGtin}</div>
              <Barcode gtin={manualGtin} type={gtinType} />
            </>
          ) : (
            <div className="py-12 text-center text-xs text-ink-faint">
              Completa los datos para ver el código.
            </div>
          )}
        </div>

        <div className="card p-4 text-[11px] leading-relaxed text-ink-muted">
          <div className="label-mini mb-2">Recordatorio</div>
          Una vez asignado, un GTIN no debe reutilizarse para otro producto distinto. Si cambia
          contenido neto, formulación o dimensiones del empaque, asigna un GTIN nuevo.
        </div>
      </aside>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4 border-t border-rule pt-6">
      <legend className="label-mini -translate-y-9 bg-paper px-2">{title}</legend>
      {children}
    </fieldset>
  );
}
