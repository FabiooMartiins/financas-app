import { useImageUrl } from '@/lib/storage';
import { useProfile } from '../hooks/useProfile';

/** Foto do perfil (RF-33) ou, sem foto, as iniciais / um ícone de pessoa. */
export function ProfileAvatar({ size = 44 }: { size?: number }) {
  const { data: profile } = useProfile();
  const { data: url } = useImageUrl('avatars', profile?.avatar_path);
  const style = { width: size, height: size };
  const name = profile?.nickname || profile?.full_name;

  if (profile?.avatar_path && url) {
    return <img src={url} alt="" style={style} className="shrink-0 rounded-full border-2 border-brand object-cover" />;
  }
  return (
    <span
      style={style}
      className="flex shrink-0 items-center justify-center rounded-full border-2 border-brand bg-invest-soft font-bold text-invest"
      aria-hidden="true"
    >
      {name ? (
        name.trim().charAt(0).toUpperCase()
      ) : (
        <svg width={size / 2} height={size / 2} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
        </svg>
      )}
    </span>
  );
}
