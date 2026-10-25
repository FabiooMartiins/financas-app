interface Option<T extends string> {
  value: T;
  label: string;
}

/** Escolha única entre poucas opções (ex.: Despesa | Receita | Transferência). */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-2xl border border-line bg-surface p-1">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`h-11 flex-1 rounded-xl px-2 text-sm font-bold disabled:opacity-60 ${
              selected ? 'bg-brand text-on-brand' : 'text-muted hover:bg-ground'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
