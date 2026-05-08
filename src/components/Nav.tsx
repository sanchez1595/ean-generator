'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Inicio' },
  { href: '/generate', label: 'Generar' },
  { href: '/bulk', label: 'Lote' },
  { href: '/products', label: 'Catálogo' },
  { href: '/validate', label: 'Validar' },
  { href: '/settings', label: 'Configuración' },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-rule bg-paper">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="group flex items-center gap-3">
          <BarcodeMark />
          <div className="leading-tight">
            <div className="text-sm font-semibold uppercase tracking-wider2">EAN · GEN</div>
            <div className="text-[10px] uppercase tracking-wider2 text-ink-muted">
              GS1 Local Tool
            </div>
          </div>
        </Link>
        <nav className="flex items-center gap-1">
          {links.map((l) => {
            const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={[
                  'px-3 py-2 text-xs uppercase tracking-wider2 transition-colors',
                  active ? 'text-ink' : 'text-ink-muted hover:text-ink',
                ].join(' ')}
              >
                {l.label}
                {active ? (
                  <span className="mt-1 block h-px w-full bg-ink" aria-hidden />
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

function BarcodeMark() {
  // Pequeño "logo" geométrico que evoca un código de barras
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
      <g fill="currentColor">
        <rect x="2" y="4" width="2" height="20" />
        <rect x="6" y="4" width="1" height="20" />
        <rect x="9" y="4" width="3" height="20" />
        <rect x="14" y="4" width="1" height="20" />
        <rect x="17" y="4" width="2" height="20" />
        <rect x="21" y="4" width="1" height="20" />
        <rect x="24" y="4" width="2" height="20" />
      </g>
    </svg>
  );
}
