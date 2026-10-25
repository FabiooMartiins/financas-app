import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Select } from '@/components/ui/Select';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { categoryColorNames, categoryColors, type Category, type CategoryKind } from '../api';
import { useCategories, useDeleteCategory, useSaveCategory } from '../hooks/useCategories';

// RF-16: categorias e subcategorias de receitas e despesas
export function CategoriesPage() {
  const [kind, setKind] = useState<CategoryKind>('expense');
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const { data: categories, isPending, error } = useCategories();

  const visible = categories?.filter((c) => c.kind === kind) ?? [];

  return (
    <>
      <PageHeader
        title="Categorias"
        backTo="/configuracoes"
        action={
          !editing && (
            <Button className="h-11 px-4 text-sm" onClick={() => setEditing('new')}>
              Nova
            </Button>
          )
        }
      />
      <SegmentedControl
        label="Tipo de categoria"
        value={kind}
        onChange={(value) => {
          setKind(value);
          setEditing(null);
        }}
        options={[
          { value: 'expense', label: 'Despesas' },
          { value: 'income', label: 'Receitas' },
        ]}
      />

      {editing && (
        <CategoryForm
          key={editing === 'new' ? 'new' : editing.id}
          kind={kind}
          category={editing === 'new' ? undefined : editing}
          parents={visible.filter((c) => !c.parent_id && (editing === 'new' || c.id !== editing.id))}
          onDone={() => setEditing(null)}
        />
      )}

      {isPending && <LoadingState />}
      {error && <ErrorState error={error} />}
      {visible.length > 0 && (
        <Card className="divide-y divide-line">
          {visible.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setEditing(category)}
              className={`flex min-h-13 w-full items-center gap-3 px-4 py-3 text-left hover:bg-ground ${category.parent_id ? 'pl-10' : ''}`}
            >
              <span className="size-3.5 shrink-0 rounded-full" style={{ background: category.color }} aria-hidden="true" />
              <span className="font-semibold">{category.parent_id ? category.name : category.fullName}</span>
            </button>
          ))}
        </Card>
      )}
    </>
  );
}

function CategoryForm({
  kind,
  category,
  parents,
  onDone,
}: {
  kind: CategoryKind;
  category?: Category;
  parents: Category[];
  onDone: () => void;
}) {
  const save = useSaveCategory();
  const remove = useDeleteCategory();
  const [name, setName] = useState(category?.name ?? '');
  const [color, setColor] = useState(category?.color ?? categoryColors[1]);
  const [parentId, setParentId] = useState(category?.parent_id ?? '');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    save.mutate(
      { id: category?.id, input: { name: name.trim(), kind, color, parent_id: parentId || null } },
      { onSuccess: onDone },
    );
  }

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <h2 className="font-display font-semibold">{category ? 'Editar categoria' : 'Nova categoria'}</h2>
        <Input label="Nome" required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
        <Select label="Dentro de (opcional)" value={parentId} onChange={(e) => setParentId(e.target.value)}>
          <option value="">Nenhuma — categoria principal</option>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-semibold">Cor</legend>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
            {categoryColorNames.map(([c, colorName]) => (
              <button
                key={c}
                type="button"
                aria-label={colorName}
                title={colorName}
                aria-pressed={color.toUpperCase() === c}
                onClick={() => setColor(c)}
                className={`aspect-square w-full max-w-11 rounded-full border-4 ${color.toUpperCase() === c ? 'border-ink' : 'border-surface'}`}
                style={{ background: c }}
              />
            ))}
          </div>
          {/* Qualquer outra cor, pelo seletor do aparelho */}
          <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value.toUpperCase())}
              className="size-11 shrink-0 cursor-pointer rounded-full border border-line-strong bg-surface"
            />
            {categoryColors.includes(color.toUpperCase()) ? 'Outra cor…' : `Cor personalizada ${color.toUpperCase()}`}
          </label>
        </fieldset>

        {(save.error || remove.error) && <ErrorState error={save.error ?? remove.error} />}
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onDone}>
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" disabled={save.isPending}>
            Salvar
          </Button>
        </div>
        {category && (
          <ConfirmButton confirmLabel="Confirmar exclusão" disabled={remove.isPending} onConfirm={() => remove.mutate(category.id, { onSuccess: onDone })}>
            Excluir categoria
          </ConfirmButton>
        )}
      </form>
    </Card>
  );
}
