import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export type InputFieldProps = {
  label: string;
  error?: string;
} & InputHTMLAttributes<HTMLInputElement>;

/** Labelled text input wired for accessibility and react-hook-form (`register`). */
export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(function InputField(
  { label, error, id, className, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  return (
    <div className="field">
      <label className="field__label" htmlFor={inputId}>
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
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
});
