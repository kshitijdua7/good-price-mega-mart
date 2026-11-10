// Database access. Production uses Postgres (Neon) through DATABASE_URL, which Vercel adds
// when a database is connected to the project. LOCAL_DB_DIR runs an embedded Postgres for
// local testing. With neither set the site runs in catalogue-only mode (no cart, no accounts).
import { defaultProducts, defaultSettings, type Catalog, type Product, type Settings } from '@/app/catalog-data';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;
type Query = (text: string, params?: unknown[]) => Promise<Row[]>;

const url = () => process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
export const dbConfigured = () => !!(url() || process.env.LOCAL_DB_DIR);

const schema = [
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL, pass_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'customer', created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE UNIQUE INDEX IF NOT EXISTS one_shop_owner ON users (role) WHERE role = 'owner'`,
  `CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS attempts (key TEXT NOT NULL, at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS attempts_key ON attempts (key, at)`,
  `CREATE TABLE IF NOT EXISTS images (id TEXT PRIMARY KEY, mime TEXT NOT NULL, data TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, type TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', tag TEXT NOT NULL DEFAULT '', suits TEXT NOT NULL DEFAULT '', sizes TEXT NOT NULL DEFAULT '', ask TEXT NOT NULL DEFAULT '', price INTEGER, in_stock BOOLEAN NOT NULL DEFAULT true, active BOOLEAN NOT NULL DEFAULT true, image_id TEXT, brand TEXT NOT NULL DEFAULT '', model TEXT NOT NULL DEFAULT '', sort INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS orders (id SERIAL PRIMARY KEY, user_id TEXT, name TEXT NOT NULL, phone TEXT NOT NULL, address TEXT NOT NULL, city TEXT NOT NULL, state TEXT NOT NULL, pincode TEXT NOT NULL, zone TEXT NOT NULL, items JSONB NOT NULL, subtotal INTEGER NOT NULL, delivery_fee INTEGER, status TEXT NOT NULL DEFAULT 'new', note TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS request_key TEXT`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS request_hash TEXT`,
  `CREATE UNIQUE INDEX IF NOT EXISTS order_request_key ON orders (request_key)`,
  `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value JSONB NOT NULL)`,
];

async function connect(): Promise<Query | null> {
  let query: Query;
  if (url()) {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(url());
    query = async (text, params = []) => (await sql.query(text, params)) as Row[];
  } else if (process.env.LOCAL_DB_DIR) {
    const { PGlite } = await import('@electric-sql/pglite');
    const local = new PGlite(process.env.LOCAL_DB_DIR);
    query = async (text, params = []) => (await local.query(text, params)).rows as Row[];
  } else return null;

  for (const statement of schema) await query(statement);
  // Seed the starter catalogue once. The marker keeps it from coming back if the owner deletes everything.
  await query(`WITH marker AS (
    INSERT INTO settings (key, value) VALUES ('seeded', 'true'::jsonb)
    ON CONFLICT (key) DO NOTHING RETURNING key
  ) INSERT INTO products (id, name, category, type, description, tag, suits, sizes, ask, sort)
    SELECT p.id, p.name, p.category, p.type, p.description, p.tag, p.suits, p.sizes, p.ask, p.sort
    FROM jsonb_to_recordset($1::jsonb) AS p(id text, name text, category text, type text, description text, tag text, suits text, sizes text, ask text, sort int)
    WHERE EXISTS (SELECT 1 FROM marker) ON CONFLICT (id) DO NOTHING`,
    [JSON.stringify(defaultProducts.map((p, sort) => ({ ...p, sort })))]);
  return query;
}

const state = globalThis as typeof globalThis & { __gpDatabase?: Promise<Query | null> };
/** Resolves to a query function, or null when no database is configured. */
export function db() {
  return (state.__gpDatabase ??= connect().catch(e => { state.__gpDatabase = undefined; throw e; }));
}
/** Same as db(), for code paths that only run when the shop is enabled. */
export async function q(text: string, params?: unknown[]) {
  const query = await db();
  if (!query) throw new Error('No database configured');
  return query(text, params);
}

export const toProduct = (r: Row): Product & { active: boolean } => ({
  id: r.id, name: r.name, category: r.category, type: r.type, description: r.description, tag: r.tag,
  suits: r.suits, sizes: r.sizes, ask: r.ask, price: r.price ?? null, inStock: r.in_stock, active: r.active,
  ...(r.image_id ? { image: '/api/image/' + r.image_id } : {}), ...(r.brand ? { brand: r.brand } : {}), ...(r.model ? { model: r.model } : {}),
});

export async function getSettings(): Promise<Settings> {
  const rows = await q(`SELECT value FROM settings WHERE key = 'site'`);
  const saved = (rows[0]?.value ?? {}) as Partial<Settings>;
  return { ...defaultSettings, ...saved, delivery: { ...defaultSettings.delivery, ...saved.delivery } };
}

/** What the public site renders. Falls back to the built-in catalogue if the database is absent or unreachable. */
export async function getCatalog(): Promise<Catalog> {
  const fallback: Catalog = { shop: false, products: defaultProducts, settings: defaultSettings };
  if (!dbConfigured()) return fallback;
  try {
    const rows = await q(`SELECT * FROM products WHERE active ORDER BY sort, created_at`);
    return { shop: true, products: rows.map(toProduct).map(({ active: _active, ...p }) => p), settings: await getSettings() };
  } catch (e) {
    console.error('Catalogue query failed, serving the built-in catalogue', e);
    return fallback;
  }
}
