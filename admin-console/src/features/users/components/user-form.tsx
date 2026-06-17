import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/button';
import { InputField } from '@/components/input-field';
import { CheckboxField } from '@/components/checkbox-field';
import { userFormSchema, type UserFormValues } from '../types';

export type UserFormProps = {
  mode: 'create' | 'edit';
  defaultValues: UserFormValues;
  onSubmit: (values: UserFormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
};

export function UserForm({ mode, defaultValues, onSubmit, onCancel, isSubmitting }: UserFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormValues>({ resolver: zodResolver(userFormSchema), defaultValues });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <InputField
        label="Username"
        readOnly={mode === 'edit'}
        error={errors.username?.message}
        {...register('username')}
      />
      <InputField label="Email" type="email" error={errors.email?.message} {...register('email')} />
      <InputField label="First name" error={errors.firstName?.message} {...register('firstName')} />
      <InputField label="Last name" error={errors.lastName?.message} {...register('lastName')} />
      <CheckboxField label="Enabled" {...register('enabled')} />
      <div className="form-actions">
        <Button type="submit" isLoading={isSubmitting}>
          {mode === 'create' ? 'Create user' : 'Save'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
