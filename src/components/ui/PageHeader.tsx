import type { ReactNode } from 'react';
import { Link } from 'react-router';

export function PageHeader({ title, action, backTo }: { title: string; action?: ReactNode; backTo?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-1">
        {backTo && (
          <Link to={backTo} aria-label="Voltar" className="-ml-3 flex size-11 items-center justify-center rounded-xl text-muted hover:bg-surface">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
        )}
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
      </div>
      {action}
    </div>
  );
}
