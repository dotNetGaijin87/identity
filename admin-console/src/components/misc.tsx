import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

/** Loading spinner with an accessible status role. */
export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="state" role="status">
      <span className="spinner" aria-hidden="true" /> <span>{label}…</span>
    </div>
  );
}

/** Inline error message for a failed async view. */
export function ErrorState({
  message = "Something went wrong. Couldn't load this view.",
}: {
  message?: string;
}) {
  return (
    <div className="state" role="alert">
      {message}
    </div>
  );
}

/** Empty-collection placeholder. */
export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="state">
      <p>{message}</p>
      {action}
    </div>
  );
}

/** On/off pill used in resource tables. */
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'on' | 'off' | 'neutral';
}) {
  return <span className={cn('badge', `badge--${tone}`)}>{children}</span>;
}

export function EnabledBadge({ enabled }: { enabled: boolean }) {
  return <Badge tone={enabled ? 'on' : 'off'}>{enabled ? 'Enabled' : 'Disabled'}</Badge>;
}

/** Card surface. */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('card', className)}>{children}</div>;
}

/** Page title + optional action area. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="toolbar">
      <div>
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {actions && <div className="row-actions">{actions}</div>}
    </div>
  );
}
