import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '../hooks/useAuth';

type Mode = 'signin' | 'signup' | 'reset';

// RF-01 (entrar/cadastrar), RF-02 (recuperação de senha)
export function LoginPage() {
  const { session, signIn, signUp, sendPasswordReset } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (session) return <Navigate to="/" replace />;

  const isSignUp = mode === 'signup';
  const isReset = mode === 'reset';

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);

    if (isReset) {
      const message = await sendPasswordReset(email);
      setSubmitting(false);
      if (message) setError(message);
      else {
        setNotice(`Se houver uma conta para ${email}, enviamos um link para criar uma nova senha.`);
        setMode('signin');
      }
      return;
    }

    if (isSignUp) {
      const result = await signUp(email, password);
      setSubmitting(false);
      if (result.error) setError(result.error);
      else if (result.needsConfirmation) {
        setNotice(`Enviamos um link de confirmação para ${email}. Abra o e-mail e depois volte aqui para entrar.`);
        setMode('signin');
      } else navigate('/', { replace: true });
      return;
    }

    const message = await signIn(email, password);
    setSubmitting(false);
    if (message) setError(message);
    else navigate('/', { replace: true });
  }

  return (
    <div className="pt-safe pb-safe flex min-h-dvh items-center justify-center px-7">
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-8 py-12">
        <div className="flex flex-col gap-5">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-brand font-display text-xl font-bold text-white">
            R$
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-3xl leading-tight font-semibold">
              {isReset ? 'Recuperar senha' : isSignUp ? 'Crie sua conta' : 'Suas finanças em um só lugar'}
            </h1>
            <p className="text-muted">
              {isReset
                ? 'Informe seu e-mail para receber um link de nova senha.'
                : isSignUp
                ? 'Use seu e-mail e uma senha com pelo menos 6 caracteres.'
                : 'Entre para ver seus saldos, contas do mês e relatórios.'}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Input label="E-mail" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          {!isReset && (
            <Input
              label="Senha"
              type="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              minLength={isSignUp ? 6 : undefined}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
          {error && <p role="alert" className="text-sm font-semibold text-expense">{error}</p>}
          {notice && <p role="status" className="text-sm font-semibold text-brand">{notice}</p>}
        </div>

        <div className="flex flex-col gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting
              ? 'Aguarde…'
              : isReset
                ? 'Enviar link'
                : isSignUp
                  ? 'Criar conta'
                  : 'Entrar'}
          </Button>
          <Button variant="secondary" onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}>
            {mode === 'signin' ? 'Criar conta' : 'Voltar para entrar'}
          </Button>
          {mode === 'signin' && (
            <Button variant="ghost" onClick={() => switchMode('reset')}>
              Esqueci minha senha
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
