import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/button';
import { InputField } from '@/components/input-field';
import { TextareaField } from '@/components/textarea-field';
import { roleFormSchema, type RoleFormValues } from '../types';

export type RoleFormProps = {
  mode: 'create' | 'edit';
  defaultValues: RoleFormValues;
  onSubmit: (values: RoleFormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
};

export function RoleForm({ mode, defaultValues, onSubmit, onCancel, isSubmitting }: RoleFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RoleFormValues>({ resolver: zodResolver(roleFormSchema), defaultValues });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <InputField
        label="Role name"
        placeholder="developer"
        error={errors.name?.message}
        {...register('name')}
      />
      <TextareaField
        label="Description"
        placeholder="What this role grants"
        error={errors.description?.message}
        {...register('description')}
      />
      <div className="form-actions">
        <Button type="submit" isLoading={isSubmitting}>
          {mode === 'create' ? 'Create role' : 'Save'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
