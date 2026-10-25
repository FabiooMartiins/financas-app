import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

export type CategoryKind = Database['public']['Enums']['category_kind'];

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  color: string;
  parent_id: string | null;
  /** "Moradia › Aluguel" para subcategorias */
  fullName: string;
}

export interface CategoryInput {
  name: string;
  kind: CategoryKind;
  color: string;
  parent_id: string | null;
}

// Paleta das categorias padrão (tokens do design)
// Paleta das categorias: 24 cores médias, que leem bem nos temas claro e escuro.
// As 8 primeiras são as originais (categorias padrão já usam essas).
export const categoryColorNames: [string, string][] = [
  ['#0E6B58', 'Verde-escuro'],
  ['#2F6FB0', 'Azul'],
  ['#D07A2B', 'Laranja'],
  ['#8A5CB8', 'Roxo'],
  ['#B4410F', 'Ferrugem'],
  ['#C2477E', 'Rosa'],
  ['#5B8A2E', 'Verde-oliva'],
  ['#9AA39E', 'Cinza'],
  ['#1F9E89', 'Verde-água'],
  ['#3BA55C', 'Verde'],
  ['#8DB33A', 'Lima'],
  ['#C9A227', 'Mostarda'],
  ['#E0B33A', 'Amarelo'],
  ['#E07B53', 'Salmão'],
  ['#D64545', 'Vermelho'],
  ['#9E2B4E', 'Vinho'],
  ['#E26DA6', 'Rosa-claro'],
  ['#B07CD8', 'Lilás'],
  ['#5B5FC7', 'Índigo'],
  ['#1C7FB6', 'Azul-petróleo'],
  ['#36A3D9', 'Azul-céu'],
  ['#7A6248', 'Marrom'],
  ['#A88B6A', 'Areia'],
  ['#4F5B66', 'Grafite'],
];
export const categoryColors = categoryColorNames.map(([hex]) => hex);

// RF-16
export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('id, name, kind, color, parent_id').order('name');
  if (error) throw error;

  const byId = new Map(data.map((c) => [c.id, c]));
  return data
    .map((c) => ({ ...c, fullName: c.parent_id ? `${byId.get(c.parent_id)?.name ?? ''} › ${c.name}` : c.name }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'pt-BR'));
}

export async function createCategory(input: CategoryInput) {
  const { error } = await supabase.from('categories').insert(input);
  if (error) throw error;
}

export async function updateCategory(id: string, input: CategoryInput) {
  const { error } = await supabase.from('categories').update(input).eq('id', id);
  if (error) throw error;
}

// RN-06: categoria em uso não pode ser excluída (FK "on delete restrict")
export async function deleteCategory(id: string) {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}
