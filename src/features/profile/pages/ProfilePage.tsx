import { useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { centsToInput, parseToCents } from '@/lib/money';
import { removeImage, uploadImage } from '@/lib/storage';
import { maskPhone } from '@/lib/masks';
import type { Profile } from '../api';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { useProfile, useSaveProfile } from '../hooks/useProfile';
import { MoneyInput } from '@/components/ui/MoneyInput';

// RF-33 (perfil com foto e dados) e RF-34 (tema)
export function ProfilePage() {
  const { data: profile, isPending, error } = useProfile();
  if (isPending) return <LoadingState />;
  if (!profile) return <ErrorState error={error} />;
  return <ProfileForm profile={profile} />;
}

function ProfileForm({ profile }: { profile: Profile }) {
  const { session } = useAuth();
  const save = useSaveProfile();
  const fileInput = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(profile.full_name ?? '');
  const [nickname, setNickname] = useState(profile.nickname ?? '');
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [birthDate, setBirthDate] = useState(profile.birth_date ?? '');
  const [occupation, setOccupation] = useState(profile.occupation ?? '');
  const [income, setIncome] = useState(profile.monthly_income_cents != null ? centsToInput(profile.monthly_income_cents) : '');
  const [goal, setGoal] = useState(profile.financial_goal ?? '');
  const [formError, setFormError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<unknown>(null);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handlePhoto(file: File | undefined) {
    if (!file) return;
    setPhotoError(null);
    setUploading(true);
    try {
      const path = await uploadImage('avatars', file, 'foto');
      const old = profile.avatar_path;
      await save.mutateAsync({ avatar_path: path });
      if (old) await removeImage('avatars', old);
    } catch (e) {
      setPhotoError(e);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function removePhoto() {
    if (!profile.avatar_path) return;
    setPhotoError(null);
    try {
      const old = profile.avatar_path;
      await save.mutateAsync({ avatar_path: null });
      await removeImage('avatars', old);
    } catch (e) {
      setPhotoError(e);
    }
  }


  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaved(false);
    const incomeCents = income.trim() ? parseToCents(income) : null;
    if (income.trim() && incomeCents === null) {
      setFormError('Renda inválida. Use o formato 1.234,56.');
      return;
    }
    setFormError(null);
    const clean = (v: string) => v.trim() || null;
    save.mutate(
      {
        full_name: clean(fullName),
        nickname: clean(nickname),
        phone: clean(phone),
        birth_date: birthDate || null,
        occupation: clean(occupation),
        monthly_income_cents: incomeCents,
        financial_goal: clean(goal),
      },
      { onSuccess: () => setSaved(true) },
    );
  }

  return (
    <>
      <PageHeader title="Meu perfil" backTo="/configuracoes" />

      <Card className="flex flex-col items-center gap-3 p-5">
        <ProfileAvatar size={96} />
        <p className="font-display text-lg font-semibold">{nickname || fullName || 'Seu nome'}</p>
        <p className="text-sm text-muted">{session?.user.email}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="secondary" className="h-11 px-4 text-sm" disabled={uploading} onClick={() => fileInput.current?.click()}>
            {uploading ? 'Enviando…' : profile.avatar_path ? 'Trocar foto' : 'Adicionar foto'}
          </Button>
          {profile.avatar_path && (
            <Button variant="ghost" className="h-11 px-3 text-sm" disabled={uploading} onClick={removePhoto}>
              Remover foto
            </Button>
          )}
        </div>
        {/* No celular, abre a câmera ou a galeria */}
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          tabIndex={-1}
          aria-label="Arquivo da foto"
          onChange={(e) => handlePhoto(e.target.files?.[0])}
        />
        <p className="text-center text-sm text-muted">JPG, PNG ou WebP até 2 MB. A foto fica privada, só você vê.</p>
        {photoError !== null && <ErrorState error={photoError} />}
      </Card>


      <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-4">
        <h2 className="text-sm font-bold text-muted">Dados pessoais</h2>
        <Input label="Nome completo" maxLength={80} autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Input label="Como quer ser chamado" maxLength={30} autoComplete="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Telefone" type="tel" maxLength={20} autoComplete="tel" placeholder="(00) 00000-0000" inputMode="tel" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} />
          <Input label="Data de nascimento" type="date" autoComplete="bday" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Profissão" maxLength={60} autoComplete="organization-title" value={occupation} onChange={(e) => setOccupation(e.target.value)} />
          <MoneyInput label="Renda mensal (R$, opcional)" value={income} onChange={setIncome} error={formError ?? undefined} />
        </div>
        <Input
          label="Objetivo financeiro"
          maxLength={120}
          placeholder="Ex.: reserva de emergência de R$ 20.000"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
        />

        {save.error && <ErrorState error={save.error} />}
        {saved && !save.isPending && (
          <p className="text-sm font-semibold text-income" role="status">
            Perfil salvo.
          </p>
        )}
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Salvando…' : 'Salvar perfil'}
        </Button>
      </form>
    </>
  );
}
