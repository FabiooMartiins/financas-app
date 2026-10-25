import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';

// Fotos de perfil e logos das contas ficam em buckets privados (RNF-06).
// Cada arquivo vai para a pasta do usuário: "<user_id>/<nome>".
export type ImageBucket = 'avatars' | 'logos';

const MAX_BYTES: Record<ImageBucket, number> = { avatars: 2 * 1024 * 1024, logos: 1024 * 1024 };
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

/** Envia a imagem e devolve o caminho salvo. Lança erro com mensagem em português. */
export async function uploadImage(bucket: ImageBucket, file: File, prefix: string): Promise<string> {
  if (!ACCEPTED.includes(file.type) || (bucket === 'avatars' && file.type === 'image/svg+xml')) {
    throw new Error('Formato não aceito. Use JPG, PNG ou WebP.');
  }
  if (file.size > MAX_BYTES[bucket]) {
    throw new Error(`Imagem muito grande. O máximo é ${MAX_BYTES[bucket] / 1024 / 1024} MB.`);
  }
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw authError ?? new Error('Sessão expirada. Entre de novo.');

  const ext = file.type === 'image/svg+xml' ? 'svg' : file.type.split('/')[1].replace('jpeg', 'jpg');
  // Nome novo a cada envio: evita a imagem antiga presa no cache
  const path = `${auth.user.id}/${prefix}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

export async function removeImage(bucket: ImageBucket, path: string) {
  await supabase.storage.from(bucket).remove([path]);
}

/** URL temporária (1 h) para exibir uma imagem privada. */
export function useImageUrl(bucket: ImageBucket, path: string | null | undefined) {
  return useQuery({
    queryKey: ['image-url', bucket, path],
    enabled: !!path,
    staleTime: 50 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}
