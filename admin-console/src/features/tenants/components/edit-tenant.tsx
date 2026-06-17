import { useNavigate, useParams } from 'react-router-dom';
import { Card, ErrorState, PageHeader, Spinner } from '@/components/misc';
import { useNotifications } from '@/stores/notifications';
import { useTenant } from '../api/get-tenant';
import { useUpdateTenant } from '../api/update-tenant';
import { TenantForm } from './tenant-form';

export function EditTenant() {
  const { tenantId = '' } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotifications();

  const { data: tenant, isLoading, isError } = useTenant(tenantId);
  const updateMutation = useUpdateTenant(tenantId, {
    onSuccess: () =>
      showNotification({ type: 'success', title: 'Tenant settings saved', duration: 4000 }),
  });

  if (isLoading) return <Spinner label="Loading tenant" />;
  if (isError || !tenant) return <ErrorState message="Couldn't load this tenant." />;

  return (
    <div className="stack">
      <PageHeader title={`Tenant: ${tenant.name}`} description="General settings" />
      <Card>
        <TenantForm
          mode="edit"
          defaultValues={{
            name: tenant.name,
            displayName: tenant.displayName,
            enabled: tenant.enabled,
          }}
          isSubmitting={updateMutation.isPending}
          onSubmit={(values) =>
            updateMutation.mutate({ displayName: values.displayName, enabled: values.enabled })
          }
          onCancel={() => navigate('/tenants')}
        />
      </Card>
    </div>
  );
}
