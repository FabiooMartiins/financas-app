import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/States';
import { removeImage, uploadImage } from '@/lib/storage';
import type { Account } from '../api';
import { useSetAccountLogo } from '../hooks/useAccounts';
import { AccountLogo } from './AccountLogo';

/** RF-32: enviar ou remover o logo da conta (JPG, PNG, WebP ou SVG até 1 MB). */
export function LogoPicker({ account }: { account: Account }) {
  const input = useRef<HTMLInputElement>(null);
  const setLogo = useSetAccountLogo();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const path = await uploadImage('logos', file, account.id);
      const old = account.logo_path;
      await setLogo.mutateAsync({ id: account.id, logoPath: path });
      if (old) await removeImage('logos', old);
    } catch (e) {
      setError(e);
    } finally {
      setUploading(false);
      if (input.current) input.current.value = '';
    }
  }

  async function handleRemove() {
    if (!account.logo_path) return;
    setError(null);
    try {
      const old = account.logo_path;
      await setLogo.mutateAsync({ id: account.id, logoPath: null });
      await removeImage('logos', old);
    } catch (e) {
      setError(e);
    }
  }

  const busy = uploading || setLogo.isPending;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <AccountLogo account={account} size={56} />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" className="h-11 px-4 text-sm" disabled={busy} onClick={() => input.current?.click()}>
            {uploading ? 'Enviando…' : account.logo_path ? 'Trocar logo' : 'Enviar logo'}
          </Button>
          {account.logo_path && (
            <Button variant="ghost" className="h-11 px-3 text-sm" disabled={busy} onClick={handleRemove}>
              Remover
            </Button>
          )}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="sr-only"
        tabIndex={-1}
        aria-label="Arquivo do logo"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <p className="text-sm text-muted">Use a imagem do app do banco (print ou download). Sem logo, aparecem as iniciais.</p>
      {error !== null && <ErrorState error={error} />}
    </div>
  );
}
