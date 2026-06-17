import { useNavigate, useParams } from 'react-router-dom';
import { Card, PageHeader } from '@/components/misc';
import { useNotifications } from '@/stores/notifications';
import { useCreateRole } from '../api/create-role';
import { RoleForm } from './role-form';

export function CreateRole() {
  const { tenantId = '' } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotifications();

  const createMutation = useCreateRole(tenantId, {
    onSuccess: (role) => {
      showNotification({ type: 'success', title: `Role "${role.name}" created`, duration: 4000 });
      navigate(`/tenants/${tenantId}/roles`);
    },
  });

  return (
    <div className="stack">
      <PageHeader title="Create role" />
      <Card>
        <RoleForm
          mode="create"
          defaultValues={{ name: '', description: '' }}
          isSubmitting={createMutation.isPending}
          onSubmit={(values) => createMutation.mutate(values)}
          onCancel={() => navigate(`/tenants/${tenantId}/roles`)}
        />
      </Card>
    </div>
  );
}
