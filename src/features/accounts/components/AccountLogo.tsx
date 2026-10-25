import { useImageUrl } from '@/lib/storage';
import { accountGroup, type Account } from '../api';

const groupColors = {
  bank: 'bg-info-soft text-info',
  card: 'bg-hero text-on-hero',
  investment: 'bg-invest-soft text-invest',
} as const;

/** Iniciais do nome: "Nubank" -> "NU", "Banco do Brasil" -> "BB". */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter((w) => w.length > 2 || /^[A-Z]/.test(w));
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase();
}

/** RF-32: logo enviado pelo usuário ou, sem logo, as iniciais na cor do grupo. */
export function AccountLogo({ account, size = 40 }: { account: Pick<Account, 'name' | 'type' | 'logo_path'>; size?: number }) {
  const { data: url } = useImageUrl('logos', account.logo_path);
  const style = { width: size, height: size };

  if (account.logo_path && url) {
    return <img src={url} alt="" style={style} className="shrink-0 rounded-xl border border-line bg-surface object-contain" />;
  }
  return (
    <span
      style={style}
      className={`flex shrink-0 items-center justify-center rounded-xl text-sm font-bold ${groupColors[accountGroup(account.type)]}`}
      aria-hidden="true"
    >
      {initials(account.name)}
    </span>
  );
}
