import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export type TextareaFieldProps = {
  label: string;
  error?: string;
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  function TextareaField({ label, error, id, className, rows = 3, ...rest }, ref) {
    const autoId = useId();
    const inputId = id ?? autoId;
    const errorId = `${inputId}-error`;
    return (
      <div className="field">
        <label className="field__label" htmlFor={inputId}>
          {label}
        </label>
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          className={cn('field__control', className)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          {...rest}
        />
        {error && (
          <span id={errorId} className="field__error" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  },
);
