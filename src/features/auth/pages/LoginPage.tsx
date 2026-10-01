import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '../hooks/useAuth';

type Mode = 'signin' | 'signup';

// RF-01, RF-02 (recuperação de senha: a implementar)
export function LoginPage() {
  const { session, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (session) return <Navigate to="/" replace />;

  const isSignUp = mode === 'signup';

  function switchMode() {
    setMode(isSignUp ? 'signin' : 'signup');
    setError(null);
    setNotice(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);

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
              {isSignUp ? 'Crie sua conta' : 'Suas finanças em um só lugar'}
            </h1>
            <p className="text-muted">
              {isSignUp
                ? 'Use seu e-mail e uma senha com pelo menos 6 caracteres.'
                : 'Entre para ver seus saldos, contas do mês e relatórios.'}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Input label="E-mail" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input
            label="Senha"
            type="password"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            minLength={isSignUp ? 6 : undefined}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p role="alert" className="text-sm font-semibold text-expense">{error}</p>}
          {notice && <p role="status" className="text-sm font-semibold text-brand">{notice}</p>}
        </div>

        <div className="flex flex-col gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? (isSignUp ? 'Criando conta…' : 'Entrando…') : isSignUp ? 'Criar conta' : 'Entrar'}
          </Button>
          <Button type="button" variant="secondary" onClick={switchMode}>
            {isSignUp ? 'Já tenho conta' : 'Criar conta'}
          </Button>
        </div>
      </form>
    </div>
  );
}
