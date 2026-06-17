import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/button';
import { InputField } from '@/components/input-field';
import { CheckboxField } from '@/components/checkbox-field';
import { tenantFormSchema, type TenantFormValues } from '../types';

export type TenantFormProps = {
  mode: 'create' | 'edit';
  defaultValues: TenantFormValues;
  onSubmit: (values: TenantFormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
};

/** Presentational create/edit form. The `name` is fixed once a tenant exists. */
export function TenantForm({
  mode,
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
}: TenantFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TenantFormValues>({ resolver: zodResolver(tenantFormSchema), defaultValues });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <InputField
        label="Tenant name"
        placeholder="my-tenant"
        readOnly={mode === 'edit'}
        error={errors.name?.message}
        {...register('name')}
      />
      <InputField
        label="Display name"
        placeholder="My Tenant"
        error={errors.displayName?.message}
        {...register('displayName')}
      />
      <CheckboxField label="Enabled" {...register('enabled')} />
      <div className="form-actions">
        <Button type="submit" isLoading={isSubmitting}>
          {mode === 'create' ? 'Create tenant' : 'Save'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
