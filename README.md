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

- Build command: `npm run build`
- Output directory: `dist`
- Variáveis: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Adicione um arquivo `public/_redirects` com `/* /index.html 200` para as rotas do React Router.

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
