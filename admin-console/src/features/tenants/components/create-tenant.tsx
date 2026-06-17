import { useNavigate } from 'react-router-dom';
import { Card, PageHeader } from '@/components/misc';
import { useNotifications } from '@/stores/notifications';
import { useCreateTenant } from '../api/create-tenant';
import { TenantForm } from './tenant-form';

export function CreateTenant() {
  const navigate = useNavigate();
  const { showNotification } = useNotifications();
  const createMutation = useCreateTenant({
    onSuccess: (tenant) => {
      showNotification({
        type: 'success',
        title: `Tenant "${tenant.name}" created`,
        duration: 4000,
      });
      navigate(`/tenants/${tenant.id}/users`);
    },
  });

  return (
    <div className="stack">
      <PageHeader title="Create tenant" />
      <Card>
        <TenantForm
          mode="create"
          defaultValues={{ name: '', displayName: '', enabled: true }}
          isSubmitting={createMutation.isPending}
          onSubmit={(values) => createMutation.mutate(values)}
          onCancel={() => navigate('/tenants')}
        />
      </Card>
    </div>
  );
}
