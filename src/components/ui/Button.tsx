import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-on-brand hover:bg-brand-dark',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-ground',
  danger: 'bg-expense text-on-expense hover:opacity-90',
  ghost: 'text-muted hover:bg-ground',
};

/** Classes do botão, para usar também em <Link> com cara de botão. */
export function buttonClasses(variant: Variant = 'primary', className = '') {
  return `inline-flex h-13 items-center justify-center gap-2 rounded-xl px-5 text-base font-bold disabled:opacity-60 ${variants[variant]} ${className}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = 'primary', className = '', type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, className)} {...props} />;
}
