import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary';

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-dark',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-ground',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex h-13 items-center justify-center gap-2 rounded-xl px-5 text-base font-bold disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
