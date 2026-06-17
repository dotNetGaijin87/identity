import { useNavigate, useParams } from 'react-router-dom';
import { Card, PageHeader } from '@/components/misc';
import { useNotifications } from '@/stores/notifications';
import { useCreateClient } from '../api/create-client';
import { ClientForm } from './client-form';
import type { ClientInput } from '../types';

const EMPTY_CLIENT: ClientInput = {
  clientId: '',
  name: '',
  description: '',
  enabled: true,
  publicClient: true, // default: no secret
  rootUrl: '',
  homeUrl: '',
  redirectUris: [],
  postLogoutRedirectUris: [],
  directAccessGrants: false,
  serviceAccounts: false,
  implicitFlow: false,
  deviceFlow: false,
  pkce: 'S256',
  consentRequired: false,
  accessTokenLifespan: 300,
  idTokenSignatureAlg: 'RS256',
  defaultScopes: ['openid'],
  fullScopeAllowed: false,
};

export function CreateClient() {
  const { tenantId = '' } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotifications();

  const createMutation = useCreateClient(tenantId, {
    onSuccess: (client) => {
      showNotification({
        type: 'success',
        title: `Client "${client.clientId}" created`,
        duration: 4000,
      });
      navigate(`/tenants/${tenantId}/clients/${client.id}`);
    },
  });

  return (
    <div className="stack">
      <PageHeader title="Create client" />
      <Card>
        <ClientForm
          mode="create"
          defaultValues={EMPTY_CLIENT}
          isSubmitting={createMutation.isPending}
          onSubmit={(values) => createMutation.mutate(values)}
          onCancel={() => navigate(`/tenants/${tenantId}/clients`)}
        />
      </Card>
    </div>
  );
}
