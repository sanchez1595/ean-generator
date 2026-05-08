// Storage local en JSON. Sin dependencias nativas para que la instalación sea trivial.
// La BD vive en data/database.json en la raíz del proyecto.

import { promises as fs } from 'fs';
import path from 'path';
import type { CompanyConfig, DatabaseShape, Product } from './types';

// En Vercel/serverless el filesystem del proyecto es read-only.
// Solo /tmp es escribible (efímero, se pierde entre cold starts).
const IS_SERVERLESS = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const DB_DIR = IS_SERVERLESS ? '/tmp/ean-generator' : path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'database.json');

const EMPTY_DB: DatabaseShape = {
  config: null,
  products: [],
  meta: { totalAssigned: 0 },
};

// Mutex serial muy simple para evitar race conditions en escrituras concurrentes
let writeLock: Promise<void> = Promise.resolve();

async function ensureFile(): Promise<void> {
  try {
    await fs.mkdir(DB_DIR, { recursive: true });
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify(EMPTY_DB, null, 2), 'utf8');
  }
}

export async function readDb(): Promise<DatabaseShape> {
  await ensureFile();
  const raw = await fs.readFile(DB_PATH, 'utf8');
  try {
    const parsed = JSON.parse(raw) as DatabaseShape;
    return {
      config: parsed.config ?? null,
      products: Array.isArray(parsed.products) ? parsed.products : [],
      meta: parsed.meta ?? { totalAssigned: 0 },
    };
  } catch {
    return EMPTY_DB;
  }
}

async function writeDb(db: DatabaseShape): Promise<void> {
  await ensureFile();
  // Escritura atómica: tmp file + rename
  const tmp = `${DB_PATH}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), 'utf8');
  await fs.rename(tmp, DB_PATH);
}

/**
 * Ejecuta una mutación serializada sobre la BD.
 */
export async function transact<T>(fn: (db: DatabaseShape) => T | Promise<T>): Promise<T> {
  let release: () => void = () => {};
  const next = new Promise<void>((resolve) => {
    release = resolve;
  });
  const prev = writeLock;
  writeLock = prev.then(() => next);
  await prev;
  try {
    const db = await readDb();
    const result = await fn(db);
    await writeDb(db);
    return result;
  } finally {
    release();
  }
}

// ----------- Operaciones de alto nivel -----------

export async function getConfig(): Promise<CompanyConfig | null> {
  const db = await readDb();
  return db.config;
}

export async function saveConfig(config: CompanyConfig): Promise<CompanyConfig> {
  return transact(async (db) => {
    db.config = config;
    return config;
  });
}

export async function listProducts(opts?: {
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: Product[]; total: number }> {
  const db = await readDb();
  let items = db.products.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  if (opts?.q) {
    const q = opts.q.toLowerCase().trim();
    items = items.filter(
      (p) =>
        p.gtin.includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.sku?.toLowerCase().includes(q) ?? false) ||
        (p.brand?.toLowerCase().includes(q) ?? false) ||
        (p.category?.toLowerCase().includes(q) ?? false),
    );
  }
  const total = items.length;
  const offset = opts?.offset ?? 0;
  const limit = opts?.limit ?? 100;
  return { items: items.slice(offset, offset + limit), total };
}

export async function getProduct(id: string): Promise<Product | null> {
  const db = await readDb();
  return db.products.find((p) => p.id === id) ?? null;
}

export async function findByGtin(gtin: string): Promise<Product | null> {
  const db = await readDb();
  return db.products.find((p) => p.gtin === gtin) ?? null;
}

export async function createProduct(
  product: Product,
  incrementReference: boolean,
): Promise<Product> {
  return transact(async (db) => {
    if (db.products.some((p) => p.gtin === product.gtin)) {
      throw new Error(`Ya existe un producto con GTIN ${product.gtin}`);
    }
    db.products.push(product);
    db.meta.totalAssigned += 1;
    if (incrementReference && db.config) {
      db.config.nextReference += 1;
      db.config.updatedAt = new Date().toISOString();
    }
    return product;
  });
}

export async function updateProduct(
  id: string,
  patch: Partial<Omit<Product, 'id' | 'gtin' | 'createdAt'>>,
): Promise<Product | null> {
  return transact(async (db) => {
    const idx = db.products.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    db.products[idx] = {
      ...db.products[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    return db.products[idx];
  });
}

export async function deleteProduct(id: string): Promise<boolean> {
  return transact(async (db) => {
    const before = db.products.length;
    db.products = db.products.filter((p) => p.id !== id);
    return db.products.length < before;
  });
}

export async function stats(): Promise<{
  totalProducts: number;
  capacity: number | null;
  used: number;
  remaining: number | null;
}> {
  const db = await readDb();
  const totalProducts = db.products.length;
  if (!db.config) {
    return { totalProducts, capacity: null, used: totalProducts, remaining: null };
  }
  // calculamos capacidad asumiendo EAN-13
  const baseLen = 12;
  const refDigits = baseLen - db.config.companyPrefix.length;
  const capacity = refDigits > 0 ? Math.pow(10, refDigits) : 0;
  return {
    totalProducts,
    capacity,
    used: db.config.nextReference,
    remaining: capacity - db.config.nextReference,
  };
}
