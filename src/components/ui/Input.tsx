import { useId, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={!!error}
        className={`h-13 rounded-xl border border-line-strong bg-surface px-4 ${className}`}
        {...props}
      />
      {error && <p className="text-sm text-expense">{error}</p>}
    </div>
  );
}
