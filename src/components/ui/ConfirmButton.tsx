import { useState, type ReactNode } from 'react';
import { Button } from './Button';

/**
 * Ação destrutiva em dois toques ("Excluir" -> "Confirmar exclusão"),
 * sem usar window.confirm, que trava o app instalado no iPhone.
 */
export function ConfirmButton({
  children,
  confirmLabel,
  onConfirm,
  disabled,
  className = '',
}: {
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <Button variant="secondary" className={`text-expense ${className}`} disabled={disabled} onClick={() => setArmed(true)}>
        {children}
      </Button>
    );
  }

  return (
    <div className={`flex gap-2 ${className}`}>
      <Button variant="secondary" className="flex-1" onClick={() => setArmed(false)}>
        Cancelar
      </Button>
      <Button variant="danger" className="flex-1" disabled={disabled} onClick={onConfirm}>
        {confirmLabel}
      </Button>
    </div>
  );
}
