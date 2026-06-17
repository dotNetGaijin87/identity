import { useNavigate, useParams } from 'react-router-dom';
import { Card, ErrorState, PageHeader, Spinner } from '@/components/misc';
import { useNotifications } from '@/stores/notifications';
import { useUserDetail } from '../api/get-user';
import { useUpdateUser } from '../api/update-user';
import { UserForm } from './user-form';
import { UserRolesForm } from './user-roles-form';

export function EditUser() {
  const { tenantId = '', userId = '' } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotifications();

  const { data: user, isLoading, isError } = useUserDetail(tenantId, userId);
  const updateMutation = useUpdateUser(tenantId, userId, {
    onSuccess: () => showNotification({ type: 'success', title: 'User saved', duration: 4000 }),
  });

  if (isLoading) return <Spinner label="Loading user" />;
  if (isError || !user) return <ErrorState message="Couldn't load this user." />;

  return (
    <div className="stack">
      <PageHeader title={`User: ${user.username}`} />

      <Card>
        <h2>Details</h2>
        <UserForm
          mode="edit"
          defaultValues={{
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            enabled: user.enabled,
          }}
          isSubmitting={updateMutation.isPending}
          onSubmit={(values) => updateMutation.mutate(values)}
          onCancel={() => navigate(`/tenants/${tenantId}/users`)}
        />
      </Card>

      <Card>
        <h2>Role assignment</h2>
        <UserRolesForm tenantId={tenantId} userId={user.id} assignedRoleIds={user.roleIds} />
      </Card>
    </div>
  );
}
