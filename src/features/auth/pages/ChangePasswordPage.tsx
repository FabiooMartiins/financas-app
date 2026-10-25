import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '../hooks/useAuth';

// RF-02: nova senha (também é o destino do link de recuperação enviado por e-mail)
export function ChangePasswordPage() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setError('As senhas não conferem.');
      return;
    }
    setSaving(true);
    const message = await updatePassword(password);
    setSaving(false);
    setError(message);
    if (!message) setDone(true);
  }

  return (
    <>
      <PageHeader title="Alterar senha" backTo="/configuracoes" />
      {done ? (
        <div className="flex max-w-lg flex-col gap-4">
          <p role="status" className="font-semibold text-brand">
            Senha alterada.
          </p>
          <Button onClick={() => navigate('/')}>Ir para o início</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-4">
          <Input label="Nova senha" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
          <Input label="Repita a nova senha" type="password" autoComplete="new-password" minLength={6} required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          {error && (
            <p role="alert" className="text-sm font-semibold text-expense">
              {error}
            </p>
          )}
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar nova senha'}
          </Button>
        </form>
      )}
    </>
  );
}
