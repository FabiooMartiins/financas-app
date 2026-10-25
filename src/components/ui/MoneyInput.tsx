import type { InputHTMLAttributes } from 'react';
import { maskMoney } from '@/lib/masks';
import { Input } from './Input';

interface MoneyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  /** Aceita "-" para valor negativo (ex.: saldo inicial negativo) */
  allowNegative?: boolean;
}

/** Campo de valor em reais com máscara 1.234,56 (dígitos entram pela direita). */
export function MoneyInput({ value, onChange, allowNegative, placeholder = '0,00', ...props }: MoneyInputProps) {
  return (
    <Input
      inputMode={allowNegative ? 'text' : 'numeric'}
      autoComplete="off"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(maskMoney(e.target.value, allowNegative))}
      {...props}
    />
  );
}
