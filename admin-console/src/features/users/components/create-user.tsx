import { useNavigate, useParams } from 'react-router-dom';
import { Card, PageHeader } from '@/components/misc';
import { useNotifications } from '@/stores/notifications';
import { useCreateUser } from '../api/create-user';
import { UserForm } from './user-form';

export function CreateUser() {
  const { tenantId = '' } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotifications();

  const createMutation = useCreateUser(tenantId, {
    onSuccess: (user) => {
      showNotification({
        type: 'success',
        title: `User "${user.username}" created`,
        duration: 4000,
      });
      // Continue to the user's page so roles can be assigned right away.
      navigate(`/tenants/${tenantId}/users/${user.id}`);
    },
  });

  return (
    <div className="stack">
      <PageHeader title="Create user" />
      <Card>
        <UserForm
          mode="create"
          defaultValues={{ username: '', email: '', firstName: '', lastName: '', enabled: true }}
          isSubmitting={createMutation.isPending}
          onSubmit={(values) => createMutation.mutate(values)}
          onCancel={() => navigate(`/tenants/${tenantId}/users`)}
        />
      </Card>
    </div>
  );
}
