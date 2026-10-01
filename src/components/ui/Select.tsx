import { useId, type SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
}

export function Select({ label, error, className = '', children, ...props }: SelectProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <select
        id={id}
        aria-invalid={!!error}
        className={`h-13 rounded-xl border border-line-strong bg-surface px-4 disabled:bg-ground disabled:text-muted ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-sm text-expense">{error}</p>}
    </div>
  );
}
