'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Barcode } from '@/components/Barcode';
import { formatGtinHuman } from '@/lib/gtin';
import type { Product } from '@/lib/types';

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const just = search.get('just') === '1';
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Product>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/products/${params.id}`)
      .then(async (r) => {
        if (!r.ok) {
          router.push('/products');
          return null;
        }
        return r.json();
      })
      .then((d: { product: Product } | null) => {
        if (d) {
          setProduct(d.product);
          setForm(d.product);
        }
        setLoading(false);
      });
  }, [params.id, router]);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/products/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        sku: form.sku,
        brand: form.brand,
        category: form.category,
        description: form.description,
        notes: form.notes,
        netContent: form.netContent,
        unitPrice: form.unitPrice,
      }),
    });
    const d = await res.json();
    setSaving(false);
    if (res.ok) {
      setProduct(d.product);
      setEditing(false);
    }
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar este registro? El GTIN no será reutilizable.')) return;
    const res = await fetch(`/api/products/${params.id}`, { method: 'DELETE' });
    if (res.ok) router.push('/products');
  }

  if (loading) return <div className="font-mono text-sm text-ink-muted">Cargando...</div>;
  if (!product) return null;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_460px]">
      <div>
        <Link href="/products" className="text-xs uppercase tracking-wider2 text-ink-muted hover:text-ink">
          ← Volver al catálogo
        </Link>

        {just && (
          <div className="mt-4 border border-accent/30 bg-accent-soft p-3 text-sm text-accent">
            ✓ Código generado y guardado correctamente
          </div>
        )}

        <div className="mt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="pill">{product.gtinType}</span>
                <span className="label-mini">Producto</span>
              </div>
              {editing ? (
                <input
                  type="text"
                  value={form.name ?? ''}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-2 text-3xl font-light"
                />
              ) : (
                <h1 className="mt-2 text-3xl font-light tracking-tight">{product.name}</h1>
              )}
            </div>
            {!editing && (
              <div className="flex gap-2">
                <button onClick={() => setEditing(true)} className="btn-ghost">
                  Editar
                </button>
                <button onClick={handleDelete} className="btn-danger">
                  Eliminar
                </button>
              </div>
            )}
          </div>

          <div className="mt-8 space-y-6">
            <Field
              label="GTIN"
              value={
                <span className="font-mono text-xl tracking-wider">
                  {formatGtinHuman(product.gtin)}
                </span>
              }
            />

            <Field
              label="SKU interno"
              value={
                editing ? (
                  <input
                    type="text"
                    value={form.sku ?? ''}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="font-mono"
                  />
                ) : (
                  <span className="font-mono">{product.sku || '—'}</span>
                )
              }
            />

            <div className="grid grid-cols-2 gap-6">
              <Field
                label="Marca"
                value={
                  editing ? (
                    <input
                      type="text"
                      value={form.brand ?? ''}
                      onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    />
                  ) : (
                    <span>{product.brand || '—'}</span>
                  )
                }
              />
              <Field
                label="Categoría"
                value={
                  editing ? (
                    <input
                      type="text"
                      value={form.category ?? ''}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                    />
                  ) : (
                    <span>{product.category || '—'}</span>
                  )
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <Field
                label="Contenido neto"
                value={
                  editing ? (
                    <input
                      type="text"
                      value={form.netContent ?? ''}
                      onChange={(e) => setForm({ ...form, netContent: e.target.value })}
                    />
                  ) : (
                    <span>{product.netContent || '—'}</span>
                  )
                }
              />
              <Field
                label={`Precio unitario (${product.currency || 'COP'})`}
                value={
                  editing ? (
                    <input
                      type="number"
                      value={form.unitPrice ?? ''}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          unitPrice: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      className="font-mono"
                    />
                  ) : (
                    <span className="font-mono">
                      {product.unitPrice
                        ? product.unitPrice.toLocaleString('es-CO')
                        : '—'}
                    </span>
                  )
                }
              />
            </div>

            <Field
              label="Descripción"
              value={
                editing ? (
                  <textarea
                    rows={2}
                    value={form.description ?? ''}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                ) : (
                  <p className="text-sm">{product.description || '—'}</p>
                )
              }
            />

            <Field
              label="Notas internas"
              value={
                editing ? (
                  <textarea
                    rows={2}
                    value={form.notes ?? ''}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                ) : (
                  <p className="text-sm">{product.notes || '—'}</p>
                )
              }
            />

            <div className="grid grid-cols-2 gap-6 border-t border-rule pt-6">
              <Field
                label="Creado"
                value={
                  <span className="font-mono text-xs">
                    {new Date(product.createdAt).toLocaleString('es-CO')}
                  </span>
                }
              />
              <Field
                label="Actualizado"
                value={
                  <span className="font-mono text-xs">
                    {new Date(product.updatedAt).toLocaleString('es-CO')}
                  </span>
                }
              />
            </div>

            {editing && (
              <div className="flex justify-end gap-2 border-t border-rule pt-6">
                <button
                  onClick={() => {
                    setForm(product);
                    setEditing(false);
                  }}
                  className="btn-ghost"
                >
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving} className="btn-primary">
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <div className="card p-6">
          <div className="label-mini mb-3">Código de barras</div>
          <Barcode gtin={product.gtin} type={product.gtinType} />
          <div className="mt-6 flex flex-col gap-2">
            <a
              href={`/api/barcode/${product.gtin}?type=${product.gtinType}&format=svg`}
              download={`${product.gtin}.svg`}
              className="btn-ghost"
            >
              Descargar SVG
            </a>
            <a
              href={`/api/barcode/${product.gtin}?type=${product.gtinType}&format=png`}
              download={`${product.gtin}.png`}
              className="btn-ghost"
            >
              Descargar PNG
            </a>
            <button
              onClick={() => navigator.clipboard.writeText(product.gtin)}
              className="btn-ghost"
            >
              Copiar GTIN
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="label-mini mb-2">{label}</div>
      <div>{value}</div>
    </div>
  );
}
