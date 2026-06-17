import { forwardRef, useId, type InputHTMLAttributes } from 'react';

export type CheckboxFieldProps = {
  label: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export const CheckboxField = forwardRef<HTMLInputElement, CheckboxFieldProps>(
  function CheckboxField({ label, id, ...rest }, ref) {
    const autoId = useId();
    const inputId = id ?? autoId;
    return (
      <div className="field field--checkbox">
        <input ref={ref} id={inputId} type="checkbox" {...rest} />
        <label className="field__label" htmlFor={inputId}>
          {label}
        </label>
      </div>
    );
  },
);
