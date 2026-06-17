import { useNavigate, useParams } from 'react-router-dom';
import { Card, ErrorState, PageHeader, Spinner } from '@/components/misc';
import { useNotifications } from '@/stores/notifications';
import { useRole } from '../api/get-role';
import { useUpdateRole } from '../api/update-role';
import { RoleForm } from './role-form';

export function EditRole() {
  const { tenantId = '', roleId = '' } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotifications();

  const { data: role, isLoading, isError } = useRole(tenantId, roleId);
  const updateMutation = useUpdateRole(tenantId, roleId, {
    onSuccess: () => showNotification({ type: 'success', title: 'Role saved', duration: 4000 }),
  });

  if (isLoading) return <Spinner label="Loading role" />;
  if (isError || !role) return <ErrorState message="Couldn't load this role." />;

  return (
    <div className="stack">
      <PageHeader title={`Role: ${role.name}`} />
      <Card>
        <RoleForm
          mode="edit"
          defaultValues={{ name: role.name, description: role.description }}
          isSubmitting={updateMutation.isPending}
          onSubmit={(values) => updateMutation.mutate(values)}
          onCancel={() => navigate(`/tenants/${tenantId}/roles`)}
        />
      </Card>
    </div>
  );
}
