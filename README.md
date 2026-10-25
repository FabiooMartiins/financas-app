# Controle Financeiro — PWA

Web app responsivo (celular e PC), instalável no iPhone e no Android pela tela de início.

**Stack:** Vite · React 19 · TypeScript · Tailwind CSS 4 · React Router · TanStack Query · Recharts · Supabase · vite-plugin-pwa

## Primeiros passos

```bash
npm install
cp .env.example .env.local   # preencha URL e chave anon do Supabase
npm run dev                  # abre em http://localhost:5173
```

O `--host` do script `dev` permite abrir no iPhone pela rede local
(use o endereço "Network" mostrado no terminal). O PWA instalável e o
service worker só funcionam no build (`npm run build && npm run preview`)
ou quando publicado com HTTPS.

## Banco de dados (Supabase)

```bash
npx supabase login
npx supabase link --project-ref SEU_ID
npx supabase db push                     # aplica supabase/migrations
npx supabase gen types typescript --project-id SEU_ID > src/types/database.ts
```

## Publicação (Cloudflare Pages)

**Automática:** cada push na `main` roda `.github/workflows/deploy.yml` (build, migrações do
Supabase e upload para o Pages). Configure uma vez os segredos listados no topo do arquivo em
Settings → Secrets and variables → Actions. O botão "Run workflow" na aba Actions publica de novo.

**Manual** (do seu computador):

Produção: https://financas-app-a4b.pages.dev (projeto `financas-app`)

```bash
npx wrangler login   # uma vez, em um terminal comum
npm run deploy       # build com o .env.local + upload
```

- `public/_redirects` (`/* /index.html 200`) faz as rotas do React Router funcionarem.
- No Supabase (Authentication → URL Configuration), o Site URL é o endereço de produção e
  `http://localhost:5173/**` fica em Redirect URLs para desenvolvimento.

## Estrutura

```
src/
  app/          rotas e providers
  components/   ui/ (botões, inputs, cards) e layout/ (menu inferior e lateral)
  features/     uma pasta por área: auth, dashboard, transactions, bills, reports, accounts
  lib/          supabase, dinheiro em centavos, datas
  types/        tipos gerados do banco
supabase/
  migrations/   tabelas, RLS e categorias padrão
  functions/    Edge Functions (integração Open Finance)
```
