import Link from 'next/link';
import { getConfig, listProducts, stats } from '@/lib/db';
import { classifyPrefix } from '@/lib/gtin';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const config = await getConfig();
  const { items: recent } = await listProducts({ limit: 5 });
  const s = await stats();
  const classification = config ? classifyPrefix(config.companyPrefix) : null;

  if (!config) {
    return <Onboarding />;
  }

  return (
    <div className="space-y-12">
      <section>
        <div className="flex items-end justify-between border-b border-rule pb-6">
          <div>
            <div className="label-mini mb-2">Resumen</div>
            <h1 className="text-3xl font-light tracking-tight">{config.companyName}</h1>
            <p className="mt-1 font-mono text-sm text-ink-muted">
              Prefijo {config.companyPrefix} ·{' '}
              {classification?.scope === 'official' ? '🌐 GS1 oficial' : '🔒 Uso interno'} ·{' '}
              {config.country}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/generate" className="btn-primary">
              Generar código →
            </Link>
            <Link href="/products" className="btn-ghost">
              Ver catálogo
            </Link>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <Stat label="Productos registrados" value={s.totalProducts.toLocaleString('es-CO')} />
          <Stat
            label="Capacidad del prefijo"
            value={s.capacity ? s.capacity.toLocaleString('es-CO') : '—'}
            sub={`${config.companyPrefix.length} dígitos de prefijo`}
          />
          <Stat
            label="Disponibles"
            value={
              s.remaining !== null && s.remaining !== undefined
                ? s.remaining.toLocaleString('es-CO')
                : '—'
            }
            sub={
              s.capacity && s.capacity > 0
                ? `${Math.round((s.used / s.capacity) * 100)}% utilizado`
                : ''
            }
            warn={
              s.capacity && s.capacity > 0 ? s.used / s.capacity > 0.9 : false
            }
          />
        </div>

        {s.capacity && s.used / s.capacity > 0.9 ? (
          <div className="mt-6 border border-warn/40 bg-warn/5 p-4 text-sm text-warn">
            ⚠️ Has utilizado más del 90% del prefijo. Solicita un prefijo adicional a GS1 antes de
            agotarlo.
          </div>
        ) : null}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="label-mini">Últimos códigos asignados</h2>
          <Link href="/products" className="text-xs uppercase tracking-wider2 text-ink-muted hover:text-ink">
            Ver todo →
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="mb-4 font-mono text-sm text-ink-faint">∅ Sin códigos aún</div>
            <Link href="/generate" className="btn-primary">
              Generar el primero
            </Link>
          </div>
        ) : (
          <div className="card divide-y divide-rule">
            {recent.map((p) => (
              <Link
                href={`/products/${p.id}`}
                key={p.id}
                className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-paper"
              >
                <div className="flex items-center gap-4">
                  <span className="pill">{p.gtinType}</span>
                  <span className="font-mono text-sm">{p.gtin}</span>
                </div>
                <div className="flex-1 truncate text-sm text-ink-muted">{p.name}</div>
                <div className="font-mono text-[11px] uppercase tracking-wider2 text-ink-faint">
                  {new Date(p.createdAt).toLocaleDateString('es-CO')}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  warn,
}: {
  label: string;
  value: string;
  sub?: string;
  warn?: boolean;
}) {
  return (
    <div className="card p-6">
      <div className="label-mini">{label}</div>
      <div className={`mt-3 font-mono text-3xl ${warn ? 'text-warn' : 'text-ink'}`}>{value}</div>
      {sub ? <div className="mt-1 text-xs text-ink-muted">{sub}</div> : null}
    </div>
  );
}

function Onboarding() {
  return (
    <div className="mx-auto max-w-2xl py-16">
      <div className="label-mini mb-3">Bienvenido</div>
      <h1 className="text-4xl font-light tracking-tight">
        Configura tu <span className="font-mono text-accent">prefijo GS1</span> antes de generar
        códigos.
      </h1>
      <p className="mt-4 text-ink-muted">
        Esta herramienta genera códigos EAN/GTIN cumpliendo el estándar GS1 Mod-10. Los códigos se
        guardan localmente en <span className="font-mono">data/database.json</span>.
      </p>
      <div className="mt-8 space-y-4 border-l-2 border-ink pl-6 text-sm leading-relaxed">
        <p>
          <span className="font-medium">¿Tienes prefijo GS1 oficial?</span> Configúralo y la app
          generará referencias secuenciales válidas para retail.
        </p>
        <p>
          <span className="font-medium">¿Solo necesitas códigos internos?</span> Usa modo interno
          con prefijo en rango <span className="font-mono">20–29</span>: válidos para inventario
          propio, pero no para venta retail global.
        </p>
      </div>
      <div className="mt-10">
        <Link href="/settings" className="btn-primary">
          Configurar ahora →
        </Link>
      </div>
    </div>
  );
}
