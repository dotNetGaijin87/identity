import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

const variants = {
  solid: 'btn',
  outline: 'btn btn--outline',
  danger: 'btn btn--danger',
  ghost: 'btn btn--ghost',
} as const;

export type ButtonProps = {
  variant?: keyof typeof variants;
  size?: 'sm' | 'md';
  isLoading?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

/** Thin wrapper over <button> that bakes in our variants and a loading state. */
export function Button({
  variant = 'solid',
  size = 'md',
  isLoading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      // eslint-disable-next-line react/button-has-type
      type={type}
      className={cn(variants[variant], size === 'sm' && 'btn--sm', className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...rest}
    >
      {isLoading && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
