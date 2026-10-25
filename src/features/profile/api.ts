import { supabase } from '@/lib/supabase';
import type { ThemeChoice } from '@/lib/theme';

// RF-33, RF-34: perfil do usuário (uma linha por usuário, criada no primeiro salvamento)
export interface Profile {
  full_name: string | null;
  nickname: string | null;
  phone: string | null;
  birth_date: string | null;
  occupation: string | null;
  monthly_income_cents: number | null;
  financial_goal: string | null;
  avatar_path: string | null;
  theme: ThemeChoice;
}

export const emptyProfile: Profile = {
  full_name: null,
  nickname: null,
  phone: null,
  birth_date: null,
  occupation: null,
  monthly_income_cents: null,
  financial_goal: null,
  avatar_path: null,
  theme: 'dark',
};

export async function getProfile(): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, nickname, phone, birth_date, occupation, monthly_income_cents, financial_goal, avatar_path, theme')
    .maybeSingle();
  if (error) throw error;
  if (!data) return emptyProfile;
  return { ...data, theme: isTheme(data.theme) ? data.theme : 'dark' };
}

export async function saveProfile(profile: Partial<Profile>) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Sessão expirada. Entre de novo.');
  const { error } = await supabase
    .from('profiles')
    .upsert({ ...profile, user_id: auth.user.id, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw error;
}

function isTheme(value: string): value is ThemeChoice {
  return value === 'dark' || value === 'light' || value === 'system';
}
