// The shop's whole API: accounts, orders, product images and the owner dashboard.
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { categories, illustrations, orderStatuses, states, zoneFor, type OrderItem, type Settings, type User } from '@/app/catalog-data';
import { dbConfigured, getSettings, q, toProduct, type Row } from '@/lib/db';

export const dynamic = 'force-dynamic';

// SHA-256 of the one-time owner setup code. The code itself is never stored anywhere in the project,
// and it stops working as soon as an owner account exists.
const OWNER_CODE_HASH = '6d3d09d9c64f2763f12c0bb5077a44a7f0afb69b08164a5a3257e9b2961b8019';
const OWNER_EMAIL = 'kshitijdua22@gmail.com';
const COOKIE = 'gp_session';
const SESSION_DAYS = 30;

class Fail extends Error { constructor(public status: number, message: string) { super(message); } }
const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } });
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const id = () => randomBytes(12).toString('hex');

// ---- input helpers ----
function text(v: unknown, label: string, max: number, min = 1) {
  const s = typeof v === 'string' ? v.trim() : '';
  if (s.length < min) throw new Fail(400, label + ' is required.');
  if (s.length > max) throw new Fail(400, label + ' is too long.');
  return s;
}
const optional = (v: unknown, label: string, max: number) => text(v ?? '', label, max, 0);
/** Whole rupees, or null when left blank. */
function money(v: unknown, label: string) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 10_000_000) throw new Fail(400, label + ' must be a whole number of rupees.');
  return n;
}
function email(v: unknown) {
  const s = text(v, 'Email', 200).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw new Fail(400, 'Enter a valid email address.');
  return s;
}
function phone(v: unknown) {
  const s = text(v, 'Phone number', 20).replace(/[\s-]/g, '');
  if (!/^\+?\d{10,15}$/.test(s)) throw new Fail(400, 'Enter a valid phone number.');
  return s;
}

// ---- passwords and sessions ----
function hashPassword(password: string) {
  const salt = randomBytes(16);
  return salt.toString('hex') + ':' + scryptSync(password, salt, 64).toString('hex');
}
function checkPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  const expected = Buffer.from(hash, 'hex');
  return timingSafeEqual(scryptSync(password, Buffer.from(salt, 'hex'), 64), expected);
}
const DUMMY_HASH = hashPassword(id()); // keeps login timing the same for unknown emails

const toUser = (r: Row): User => ({ id: r.id, name: r.name, email: r.email, phone: r.phone, role: r.role });
function readCookie(req: Request) {
  const match = (req.headers.get('cookie') ?? '').match(new RegExp('(?:^|;\\s*)' + COOKIE + '=([a-f0-9]{64})'));
  return match?.[1];
}
async function currentUser(req: Request): Promise<User | null> {
  const token = readCookie(req);
  if (!token) return null;
  const rows = await q(`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires_at > now()`, [sha(token)]);
  return rows[0] ? toUser(rows[0]) : null;
}
async function startSession(userId: string) {
  const token = randomBytes(32).toString('hex');
  await q(`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '${SESSION_DAYS} days')`, [sha(token), userId]);
  await q(`DELETE FROM sessions WHERE expires_at < now()`);
  return sessionCookie(token, SESSION_DAYS * 86400);
}
const sessionCookie = (token: string, maxAge: number) =>
  ({ 'set-cookie': `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${process.env.NODE_ENV === 'production' && !process.env.LOCAL_DB_DIR ? '; Secure' : ''}` });
async function owner(req: Request) {
  const user = await currentUser(req);
  if (user?.role !== 'owner') throw new Fail(403, 'Owner access only.');
  return user;
}

// ---- abuse limits ----
const ip = (req: Request) => (req.headers.get('x-forwarded-for') ?? 'local').split(',')[0].trim();
/** Records one attempt and refuses once `max` have happened within `minutes`. */
async function limit(key: string, max: number, minutes: number) {
  const rows = await q(`SELECT count(*)::int AS n FROM attempts WHERE key = $1 AND at > now() - make_interval(mins => $2)`, [key, minutes]);
  if (rows[0].n >= max) throw new Fail(429, 'Too many attempts. Please wait a while and try again.');
  await q(`INSERT INTO attempts (key) VALUES ($1)`, [key]);
  await q(`DELETE FROM attempts WHERE at < now() - interval '1 day'`);
}
/** State-changing requests must come from this site's own pages. */
function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (!origin || !host || new URL(origin).host !== host) throw new Fail(403, 'Request blocked.');
}

const toOrder = (r: Row) => ({
  id: r.id, code: 'GP' + (10000 + r.id), name: r.name, phone: r.phone, address: r.address, city: r.city, state: r.state, pincode: r.pincode,
  zone: r.zone, items: r.items as OrderItem[], subtotal: r.subtotal, deliveryFee: r.delivery_fee ?? null, status: r.status, note: r.note,
  createdAt: new Date(r.created_at).toISOString(),
});

async function saveImage(dataUrl: unknown) {
  const match = typeof dataUrl === 'string' ? dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/) : null;
  if (!match) throw new Fail(400, 'The photo must be a JPEG, PNG or WebP image.');
  if (match[2].length > 900_000) throw new Fail(400, 'The photo is too large.');
  const imageId = id();
  await q(`INSERT INTO images (id, mime, data) VALUES ($1, $2, $3)`, [imageId, match[1], match[2]]);
  return imageId;
}
function productFields(body: Row) {
  const category = text(body.category, 'Category', 60);
  if (!categories.some(c => c.id === category)) throw new Fail(400, 'Choose a category.');
  const type = text(body.type, 'Illustration', 30);
  if (!illustrations.includes(type)) throw new Fail(400, 'Choose an illustration.');
  return {
    name: text(body.name, 'Product name', 120), category, type,
    description: optional(body.description, 'Description', 600), tag: optional(body.tag, 'Room', 40),
    suits: optional(body.suits, 'Good for', 160), sizes: optional(body.sizes, 'Sizes', 160), ask: optional(body.ask, 'Compare in store', 200),
    brand: optional(body.brand, 'Brand', 60), model: optional(body.model, 'Model', 80),
    price: money(body.price, 'Price'), inStock: body.inStock !== false, active: body.active !== false,
  };
}

async function handle(req: Request, path: string[]): Promise<Response> {
  const route = req.method + ' ' + path.join('/');
  const [, , third] = path;

  // Product photos are public and never change once uploaded.
  if (req.method === 'GET' && path[0] === 'image' && path.length === 2) {
    const rows = await q(`SELECT mime, data FROM images WHERE id = $1`, [path[1]]);
    if (!rows[0]) throw new Fail(404, 'Not found');
    return new Response(Buffer.from(rows[0].data, 'base64'), { headers: { 'content-type': rows[0].mime, 'cache-control': 'public, max-age=31536000, immutable', 'x-content-type-options': 'nosniff' } });
  }

  if (route === 'GET auth/me') {
    const user = await currentUser(req);
    const owners = await q(`SELECT 1 FROM users WHERE role = 'owner' LIMIT 1`);
    return json({ user, ownerExists: owners.length > 0 });
  }
  if (route === 'GET orders') {
    const user = await currentUser(req);
    if (!user) throw new Fail(401, 'Please log in.');
    const rows = await q(`SELECT * FROM orders WHERE user_id = $1 ORDER BY id DESC LIMIT 50`, [user.id]);
    return json({ orders: rows.map(toOrder) });
  }
  if (route === 'GET owner/data') {
    await owner(req);
    const [products, orders, customers] = await Promise.all([
      q(`SELECT * FROM products ORDER BY sort, created_at`),
      q(`SELECT * FROM orders ORDER BY id DESC LIMIT 300`),
      q(`SELECT count(*)::int AS n FROM users WHERE role = 'customer'`),
    ]);
    return json({ products: products.map(toProduct), orders: orders.map(toOrder), settings: await getSettings(), customers: customers[0].n });
  }
  if (req.method === 'GET') throw new Fail(404, 'Not found');

  sameOrigin(req);
  const body: Row = req.method === 'DELETE' ? {} : await req.json().catch(() => { throw new Fail(400, 'Invalid request.'); });

  if (route === 'POST auth/signup') {
    await limit('signup:' + ip(req), 10, 60);
    const fields = { name: text(body.name, 'Name', 80), email: email(body.email), phone: phone(body.phone) };
    const password = text(body.password, 'Password', 200);
    if (password.length < 8) throw new Fail(400, 'Use a password of at least 8 characters.');
    const role = fields.email === OWNER_EMAIL ? 'owner' : 'customer';
    if (role === 'owner') {
      const supplied = sha(text(body.ownerCode, 'Owner setup code', 100).toUpperCase());
      if (!timingSafeEqual(Buffer.from(supplied), Buffer.from(OWNER_CODE_HASH))) throw new Fail(403, 'Enter your private owner setup code to create this account.');
      if ((await q("SELECT 1 FROM users WHERE role = 'owner'")).length) throw new Fail(409, 'The owner account is already set up. Please log in.');
    }
    const userId = id();
    const rows = await q(`INSERT INTO users (id, email, name, phone, pass_hash, role) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (email) DO NOTHING RETURNING *`,
      [userId, fields.email, fields.name, fields.phone, hashPassword(password), role]);
    if (!rows[0]) throw new Fail(409, 'An account with this email already exists. Try logging in.');
    return json({ user: toUser(rows[0]) }, 200, await startSession(userId));
  }
  if (route === 'POST auth/login') {
    const address = email(body.email);
    await limit('login-ip:' + ip(req), 30, 15);
    await limit('login-email:' + address, 12, 15);
    const rows = await q(`SELECT * FROM users WHERE email = $1`, [address]);
    const ok = checkPassword(text(body.password, 'Password', 200), rows[0]?.pass_hash ?? DUMMY_HASH);
    if (!rows[0] || !ok) throw new Fail(401, 'That email and password do not match.');
    return json({ user: toUser(rows[0]) }, 200, await startSession(rows[0].id));
  }
  if (route === 'POST auth/logout') {
    const token = readCookie(req);
    if (token) await q(`DELETE FROM sessions WHERE token_hash = $1`, [sha(token)]);
    return json({ ok: true }, 200, sessionCookie('', 0));
  }

  if (route === 'POST orders') {
    const user = await currentUser(req);
    const requestKey = text(body.requestId, 'Request ID', 36);
    if (!/^[a-f0-9-]{36}$/i.test(requestKey)) throw new Fail(400, 'Refresh checkout and try again.');
    const requestHash = sha(JSON.stringify({ ...body, userId: user?.id ?? null }));
    const previous = (await q('SELECT * FROM orders WHERE request_key = $1', [requestKey]))[0];
    if (previous) {
      if (previous.request_hash !== requestHash) throw new Fail(409, 'This checkout was already submitted. Start a new checkout.');
      return json({ order: toOrder(previous) });
    }
    await limit('order:' + ip(req), 6, 60);
    const wanted = Array.isArray(body.items) ? body.items.slice(0, 30) : [];
    const lines = new Map<string, number>();
    const expectedPrices = new Map<string, number>();
    for (const line of wanted) {
      const qty = Number(line?.qty);
      if (typeof line?.id !== 'string' || !/^[a-z0-9-]{1,80}$/.test(line.id) || !Number.isInteger(qty) || qty < 1 || qty > 20) throw new Fail(400, 'Your cart could not be read. Please refresh and try again.');
      lines.set(line.id, qty);
      expectedPrices.set(line.id, Number(line.expectedPrice));
    }
    if (!lines.size) throw new Fail(400, 'Your cart is empty.');
    const state = text(body.state, 'State', 40);
    if (!states.includes(state)) throw new Fail(400, 'Choose a state.');
    const details = {
      name: text(body.name, 'Name', 80), phone: phone(body.phone), address: text(body.address, 'Address', 300),
      city: text(body.city, 'City', 60), pincode: text(body.pincode, 'PIN code', 6), note: optional(body.note, 'Note', 500),
    };
    if (!/^\d{6}$/.test(details.pincode)) throw new Fail(400, 'Enter a 6-digit PIN code.');
    // Prices always come from the database, never from the browser.
    const found = await q(`SELECT id, name, price, in_stock FROM products WHERE active AND id = ANY(string_to_array($1, ','))`, [[...lines.keys()].join(',')]);
    const items: OrderItem[] = [];
    for (const [productId, qty] of lines) {
      const p = found.find(r => r.id === productId);
      if (!p || p.price === null || !p.in_stock) throw new Fail(409, 'Something in your cart is no longer available. Please review your cart.');
      if (expectedPrices.get(productId) !== p.price) throw new Fail(409, 'A product price has changed. Refresh the page and review your cart before submitting again.');
      items.push({ id: p.id, name: p.name, price: p.price, qty });
    }
    const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const zone = zoneFor(state, details.city);
    const fee = (await getSettings()).delivery[zone];
    const rows = await q(`INSERT INTO orders (user_id, name, phone, address, city, state, pincode, zone, items, subtotal, delivery_fee, note, request_key, request_hash) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,$14) ON CONFLICT (request_key) DO UPDATE SET request_key = EXCLUDED.request_key WHERE orders.request_hash = EXCLUDED.request_hash RETURNING *`,
      [user?.id ?? null, details.name, details.phone, details.address, details.city, state, details.pincode, zone, JSON.stringify(items), subtotal, fee, details.note, requestKey, requestHash]);
    if (!rows[0]) throw new Fail(409, 'This checkout was already submitted.');
    return json({ order: toOrder(rows[0]) });
  }

  if (route === 'POST owner/claim') {
    const user = await currentUser(req);
    if (!user) throw new Fail(401, 'Log in first, then enter the owner code.');
    if (user.email !== OWNER_EMAIL) throw new Fail(403, 'Use the designated owner email to set up this dashboard.');
    await limit('claim:' + ip(req), 5, 60);
    const given = Buffer.from(sha(text(body.code, 'Owner code', 100).toUpperCase()));
    if (!timingSafeEqual(given, Buffer.from(OWNER_CODE_HASH))) throw new Fail(403, 'That owner code is not right.');
    // Only succeeds while the shop has no owner.
    const rows = await q(`UPDATE users SET role = 'owner' WHERE id = $1 AND NOT EXISTS (SELECT 1 FROM users WHERE role = 'owner') RETURNING *`, [user.id]);
    if (!rows[0]) throw new Fail(409, 'This shop already has an owner.');
    return json({ user: toUser(rows[0]) });
  }

  // ---- everything below is owner-only ----
  await owner(req);

  if (route === 'POST owner/products') {
    const f = productFields(body);
    const imageId = body.image ? await saveImage(body.image) : null;
    const slug = f.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'product';
    const rows = await q(`INSERT INTO products (id, name, category, type, description, tag, suits, sizes, ask, brand, model, price, in_stock, active, image_id, sort) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,(SELECT coalesce(max(sort),0)+1 FROM products)) RETURNING *`,
      [slug + '-' + id().slice(0, 5), f.name, f.category, f.type, f.description, f.tag, f.suits, f.sizes, f.ask, f.brand, f.model, f.price, f.inStock, f.active, imageId]);
    return json({ product: toProduct(rows[0]) });
  }
  if (path[0] === 'owner' && path[1] === 'products' && third && path.length === 3) {
    const existing = (await q(`SELECT image_id FROM products WHERE id = $1`, [third]))[0];
    if (!existing) throw new Fail(404, 'That product no longer exists.');
    if (req.method === 'DELETE') {
      await q(`DELETE FROM products WHERE id = $1`, [third]);
      if (existing.image_id) await q(`DELETE FROM images WHERE id = $1`, [existing.image_id]);
      return json({ ok: true });
    }
    if (req.method === 'PUT') {
      const f = productFields(body);
      // image: a new data URL replaces the photo, null removes it, undefined keeps it.
      const imageId = body.image ? await saveImage(body.image) : body.image === null ? null : existing.image_id;
      const rows = await q(`UPDATE products SET name=$2, category=$3, type=$4, description=$5, tag=$6, suits=$7, sizes=$8, ask=$9, brand=$10, model=$11, price=$12, in_stock=$13, active=$14, image_id=$15 WHERE id=$1 RETURNING *`,
        [third, f.name, f.category, f.type, f.description, f.tag, f.suits, f.sizes, f.ask, f.brand, f.model, f.price, f.inStock, f.active, imageId]);
      if (existing.image_id && existing.image_id !== imageId) await q(`DELETE FROM images WHERE id = $1`, [existing.image_id]);
      return json({ product: toProduct(rows[0]) });
    }
  }
  if (req.method === 'PUT' && path[0] === 'owner' && path[1] === 'orders' && third && path.length === 3) {
    const status = text(body.status, 'Status', 30);
    if (!orderStatuses.includes(status)) throw new Fail(400, 'Unknown status.');
    const rows = await q(`UPDATE orders SET status = $2, delivery_fee = $3 WHERE id = $1 RETURNING *`, [Number(third) || 0, status, money(body.deliveryFee, 'Delivery charge')]);
    if (!rows[0]) throw new Fail(404, 'That order no longer exists.');
    return json({ order: toOrder(rows[0]) });
  }
  if (route === 'PUT owner/settings') {
    const d: Row = body.delivery ?? {}, h: Row | null = body.hours ?? null;
    const time = (v: unknown, label: string) => { const s = text(v, label, 5); if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s)) throw new Fail(400, label + ' must look like 10:00.'); return s; };
    const settings: Settings = {
      delivery: { ludhiana: money(d.ludhiana, 'Ludhiana charge'), punjab: money(d.punjab, 'Punjab charge'), other: money(d.other, 'Other states charge'), note: optional(d.note, 'Delivery note', 300) },
      hours: h ? { open: time(h.open, 'Opening time'), close: time(h.close, 'Closing time'), closedDays: (Array.isArray(h.closedDays) ? h.closedDays : []).map(Number).filter((n: number) => Number.isInteger(n) && n >= 0 && n <= 6) } : null,
      brands: (Array.isArray(body.brands) ? body.brands : []).slice(0, 40).map((b: unknown) => optional(b, 'Brand', 40)).filter(Boolean),
      offers: (Array.isArray(body.offers) ? body.offers : []).slice(0, 12).map((o: Row) => {
        const ends = text(o?.ends, 'Offer end date', 40);
        if (Number.isNaN(Date.parse(ends))) throw new Fail(400, 'Give each offer an end date.');
        const category = optional(o.category, 'Offer category', 60);
        return { title: text(o.title, 'Offer title', 80), detail: optional(o.detail, 'Offer detail', 240), ends, ...(categories.some(c => c.id === category) ? { category } : {}) };
      }),
    };
    await q(`INSERT INTO settings (key, value) VALUES ('site', $1::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [JSON.stringify(settings)]);
    return json({ settings });
  }
  throw new Fail(404, 'Not found');
}

async function entry(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (!dbConfigured()) return json({ error: 'Online ordering is not switched on yet.' }, 503);
  try {
    return await handle(req, (await params).path);
  } catch (e) {
    if (e instanceof Fail) return json({ error: e.message }, e.status);
    console.error(e);
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
}
export { entry as GET, entry as POST, entry as PUT, entry as DELETE };
