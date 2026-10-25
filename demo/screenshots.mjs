// Abre o app compilado (vite preview) com um Supabase de mentira e tira as capturas.
// Uso: node demo/screenshots.mjs http://localhost:4173 demo/telas
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import * as data from './mock-data.mjs';

const [base = 'http://localhost:4173', outDir = 'demo/telas'] = process.argv.slice(2);
await mkdir(outDir, { recursive: true });

const SUPABASE = 'https://demo.supabase.co';
let currentTheme = 'dark';
const tables = {
  accounts: () => data.accounts,
  account_balances: () => data.balances(),
  transactions: () => data.transactions,
  categories: () => data.categories,
  bills: () => data.bills,
  bill_payments: () => data.billPayments,
  bank_connections: () => [],
  profiles: () => [{ ...data.profile, theme: currentTheme }],
};

// Filtros do PostgREST usados pelo app: eq, gt, gte, lte, in e or(...)
function test(row, column, expr) {
  const value = row[column];
  const [op, ...rest] = expr.split('.');
  const arg = rest.join('.');
  if (op === 'eq') return String(value) === arg;
  if (op === 'gt') return value > arg;
  if (op === 'gte') return value >= arg;
  if (op === 'lte') return value <= arg;
  if (op === 'lt') return value < arg;
  if (op === 'in') return arg.replace(/^\(|\)$/g, '').split(',').includes(String(value));
  return true; // ilike e outros: sem filtro na demo
}

function splitOr(inner) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const ch of inner) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else current += ch;
  }
  if (current) parts.push(current);
  return parts;
}

function query(rows, params) {
  let out = rows.filter((row) => {
    for (const [key, expr] of params) {
      if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(key)) continue;
      if (key === 'or') {
        const ok = splitOr(expr.replace(/^\(|\)$/g, '')).some((cond) => {
          const [col, ...e] = cond.split('.');
          return test(row, col, e.join('.'));
        });
        if (!ok) return false;
      } else if (!test(row, key, expr)) return false;
    }
    return true;
  });
  const order = params.get('order');
  if (order) {
    const keys = order.split(',').map((o) => o.split('.'));
    out = [...out].sort((a, b) => {
      for (const [col, dir] of keys) {
        const cmp = String(a[col] ?? '').localeCompare(String(b[col] ?? ''));
        if (cmp) return dir === 'desc' ? -cmp : cmp;
      }
      return 0;
    });
  }
  return out;
}

const fakeJwt = [
  Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
  Buffer.from(JSON.stringify({ sub: data.user.id, role: 'authenticated', exp: 4102444800 })).toString('base64url'),
  'demo',
].join('.');
const session = {
  access_token: fakeJwt,
  refresh_token: 'demo',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: 4102444800,
  user: data.user,
};

const browser = await chromium.launch();

// Tela inteira com a barra de navegação no fim: estica a janela até a altura da página
async function capture(page, file) {
  await page.waitForTimeout(1200);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width: 390, height: Math.max(844, height) });
  await page.waitForTimeout(400);
  await page.screenshot({ path: file });
  await page.setViewportSize({ width: 390, height: 844 });
}

async function newPage(theme) {
  currentTheme = theme;
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    locale: 'pt-BR',
    timezoneId: 'America/Maceio',
    isMobile: true,
    hasTouch: true,
  });
  await context.addInitScript(
    ([s, t]) => {
      localStorage.setItem('sb-demo-auth-token', JSON.stringify(s));
      localStorage.setItem('tema', t);
    },
    [session, theme],
  );
  await context.route(`${SUPABASE}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.pathname.startsWith('/auth/v1/user')) return route.fulfill({ json: data.user });
    if (url.pathname.startsWith('/auth/v1/')) return route.fulfill({ json: {} });
    const table = url.pathname.replace('/rest/v1/', '');
    if (req.method() !== 'GET' || !tables[table]) return route.fulfill({ status: 200, json: [] });
    let rows = query(tables[table](), url.searchParams);
    const range = req.headers()['range'];
    if (range) {
      const [from, to] = range.split('-').map(Number);
      rows = rows.slice(from, to + 1);
    }
    if ((req.headers()['accept'] ?? '').includes('vnd.pgrst.object')) {
      return rows[0] ? route.fulfill({ json: rows[0] }) : route.fulfill({ status: 406, json: { message: 'not found' } });
    }
    return route.fulfill({ json: rows, headers: { 'content-range': `0-${rows.length - 1}/${rows.length}` } });
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.error('Erro na página:', e.message));
  return page;
}

const screens = [
  ['01-inicio', '/'],
  ['02-cartoes', '/cartoes'],
  ['03-cartao-nubank', '/cartoes/a3'],
  ['04-investimentos', '/investimentos'],
  ['05-contas', '/contas'],
  ['06-historico-conta-corrente', '/historico?conta=a1'],
  ['07-editar-conta-ajustar-saldo', '/contas/a1'],
  ['08-perfil', '/perfil'],
  ['09-transacoes', '/transacoes'],
  ['10-relatorios', '/relatorios'],
  ['11-vencimentos', '/vencimentos'],
];

const dark = await newPage('dark');
for (const [name, path] of screens) {
  await dark.goto(base + path, { waitUntil: 'networkidle' });
  await capture(dark, `${outDir}/${name}.png`);
  console.log('ok', name);
}

const light = await newPage('light');
await light.goto(base + '/', { waitUntil: 'networkidle' });
await capture(light, `${outDir}/12-inicio-tema-claro.png`);
console.log('ok 12-inicio-tema-claro');

await browser.close();
