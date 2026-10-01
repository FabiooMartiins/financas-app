# Contexto do projeto para o Claude Code

App pessoal de controle financeiro. Fase 1: PWA responsivo (iPhone, Android e PC).
Fase 2: app iOS nativo. Idioma da interface: português do Brasil.

## Stack
- Vite + React 19 + TypeScript (strict), Tailwind CSS 4 (tokens em `src/styles/global.css`)
- React Router 7 (`src/app/router.tsx`), TanStack Query para dados do servidor
- Supabase: Postgres + Auth + Edge Functions. Cliente em `src/lib/supabase.ts`
- Recharts para gráficos; vite-plugin-pwa para manifest e service worker

## Convenções
- Organização por feature: `src/features/<area>/{pages,components,hooks,api.ts}`
- Chamadas ao Supabase ficam em `api.ts`; componentes usam hooks do TanStack Query
- Dinheiro SEMPRE em centavos (inteiro). Formatar só na exibição com `lib/money.ts`
- Datas no banco em ISO (`aaaa-mm-dd`); exibir com `lib/dates.ts` (dd/mm/aaaa)
- Mobile first: layout base para celular, ajustes para PC a partir de `lg:`
- Celular usa `BottomNav`; PC usa `Sidebar` (ambos em `components/layout`)
- Respeitar áreas seguras do iPhone (`pt-safe`, `pb-safe`) e inputs com 16px
- Botões e links reais (`<button>`, `<a>`), alvos de toque com pelo menos 44px
- Cores: brand/receita `#0E6B58`, despesa `#B4410F`; fontes Sora (títulos) e Manrope (texto)

## Segurança
- Nunca colocar a chave `service_role` nem segredos do agregador no front-end
- Toda tabela tem RLS por `user_id = auth.uid()`; novas tabelas devem seguir o mesmo padrão
- Integração Open Finance acontece só em `supabase/functions/`

## Requisitos
Os IDs RF-xx, RNF-xx e RN-xx citados nos comentários vêm do documento de requisitos.
Principais regras de negócio:
- RN-01: transferências entre contas próprias não contam como receita nem despesa
- RN-02: pagamento de fatura do cartão é transferência; despesas contam na data da compra
- RN-03: marcar conta mensal como paga gera uma transação; desmarcar remove
- RN-04: conta não paga após o vencimento fica "vencida"
- RN-05: transações importadas do banco: só categoria e descrição são editáveis
- RN-08: período padrão dos relatórios é o mês civil

## Situação (01/10/2026)
Feito: auth (cadastro, login, recuperar/alterar senha), contas, categorias, transações
(filtros, parcelado, recorrente, transferência), contas do mês (pagar/desmarcar via RPC
/), início, relatórios (por categoria, 6 meses, CSV).
Regras no banco:  (view ,
RN-03, RN-05 por trigger).

## Próximos passos
1. Integração Open Finance (Edge Function ) — falta escolher o agregador
2. Publicar (Cloudflare Pages) e ajustar Site URL / Redirect URLs no Supabase Auth
3. Notificações push de vencimento (hoje o lembrete RF-20 aparece dentro do app)
