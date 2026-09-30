// Edge Function: sincroniza contas e transações do agregador Open Finance.
// A chave secreta do agregador fica só aqui (RNF-01), configurada com:
//   supabase secrets set AGGREGATOR_CLIENT_ID=... AGGREGATOR_CLIENT_SECRET=...
//
// Fluxo previsto (RF-07, RF-08, RNF-13):
// 1. Validar o usuário pelo JWT do header Authorization.
// 2. Buscar as bank_connections ativas dele.
// 3. Para cada conexão: obter token no agregador, baixar contas e transações.
// 4. Fazer upsert em accounts e transactions usando external_id (sem duplicar).
// 5. Atualizar last_synced_at e status da conexão.

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  return new Response(JSON.stringify({ ok: false, message: 'Ainda não implementado' }), {
    status: 501,
    headers: { 'Content-Type': 'application/json' },
  });
});
