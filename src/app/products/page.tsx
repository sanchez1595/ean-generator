'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Product } from '@/lib/types';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    fetch(`/api/products?${params}`)
      .then((r) => r.json())
      .then((d: { items: Product[] }) => {
        setProducts(d.items);
        setLoading(false);
      });
  }, [q]);

  const grouped = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of products) {
      const day = new Date(p.createdAt).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(p);
    }
    return Array.from(map.entries());
  }, [products]);

  return (
    <div>
      <div className="flex items-end justify-between border-b border-rule pb-6">
        <div>
          <div className="label-mini mb-2">Catálogo</div>
          <h1 className="text-3xl font-light tracking-tight">
            {products.length}{' '}
            <span className="font-mono text-xl text-ink-muted">
              {products.length === 1 ? 'código' : 'códigos'}
            </span>
          </h1>
        </div>
        <Link href="/generate" className="btn-primary">
          + Nuevo
        </Link>
      </div>

      <div className="my-6">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por GTIN, nombre, SKU, marca o categoría..."
          className="font-mono"
        />
      </div>

      {loading ? (
        <div className="font-mono text-sm text-ink-muted">Cargando...</div>
      ) : products.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="mb-4 font-mono text-sm text-ink-faint">
            {q ? '∅ Sin resultados para tu búsqueda' : '∅ Aún no has generado códigos'}
          </div>
          <Link href="/generate" className="btn-primary">
            Generar el primero
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          {grouped.map(([day, items]) => (
            <section key={day}>
              <div className="mb-3 flex items-baseline gap-3">
                <span className="label-mini">{day}</span>
                <span className="font-mono text-[10px] text-ink-faint">
                  {items.length} código(s)
                </span>
              </div>
              <div className="card divide-y divide-rule">
                {items.map((p) => (
                  <Link
                    href={`/products/${p.id}`}
                    key={p.id}
                    className="grid grid-cols-[80px_220px_1fr_auto] items-center gap-4 px-4 py-3 text-sm transition-colors hover:bg-paper"
                  >
                    <span className="pill text-[10px]">{p.gtinType}</span>
                    <span className="font-mono">{p.gtin}</span>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{p.name}</div>
                      <div className="truncate text-[11px] text-ink-muted">
                        {[p.sku, p.brand, p.category].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <span className="text-ink-muted">→</span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
