import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/button';
import { Card, ErrorState, PageHeader, Spinner } from '@/components/misc';
import { useNotifications } from '@/stores/notifications';
import { useClient } from '../api/get-client';
import { useUpdateClient } from '../api/update-client';
import { useRegenerateClientSecret } from '../api/regenerate-secret';
import { ClientForm } from './client-form';
import type { Client, ClientInput } from '../types';

const toInput = (client: Client): ClientInput => ({
  clientId: client.clientId,
  name: client.name,
  description: client.description,
  enabled: client.enabled,
  publicClient: client.publicClient,
  rootUrl: client.rootUrl,
  homeUrl: client.homeUrl,
  redirectUris: client.redirectUris,
  postLogoutRedirectUris: client.postLogoutRedirectUris,
  directAccessGrants: client.directAccessGrants,
  serviceAccounts: client.serviceAccounts,
  implicitFlow: client.implicitFlow,
  deviceFlow: client.deviceFlow,
  pkce: client.pkce,
  consentRequired: client.consentRequired,
  accessTokenLifespan: client.accessTokenLifespan,
  idTokenSignatureAlg: client.idTokenSignatureAlg,
  defaultScopes: client.defaultScopes,
  fullScopeAllowed: client.fullScopeAllowed,
});

export function EditClient() {
  const { tenantId = '', clientId = '' } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotifications();

  const { data: client, isLoading, isError } = useClient(tenantId, clientId);
  const updateMutation = useUpdateClient(tenantId, clientId, {
    onSuccess: () => showNotification({ type: 'success', title: 'Client saved', duration: 4000 }),
  });
  const regenerateMutation = useRegenerateClientSecret(tenantId, clientId, {
    onSuccess: () =>
      showNotification({ type: 'success', title: 'Client secret regenerated', duration: 4000 }),
  });

  if (isLoading) return <Spinner label="Loading client" />;
  if (isError || !client) return <ErrorState message="Couldn't load this client." />;

  return (
    <div className="stack">
      <PageHeader title={`Client: ${client.clientId}`} />

      {/* Credentials only exist for confidential (client-authentication) clients. */}
      {!client.publicClient && (
        <Card>
          <h2>Credentials</h2>
          <div className="field">
            <label className="field__label" htmlFor="client-secret">
              Client secret
            </label>
            <div className="inline-fields">
              <input
                id="client-secret"
                className="field__control"
                style={{ fontFamily: 'monospace' }}
                readOnly
                value={client.secret}
              />
              <Button
                variant="outline"
                onClick={() => navigator.clipboard?.writeText(client.secret)}
              >
                Copy
              </Button>
              <Button
                variant="outline"
                isLoading={regenerateMutation.isPending}
                onClick={() => regenerateMutation.mutate()}
              >
                Regenerate
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <ClientForm
          mode="edit"
          defaultValues={toInput(client)}
          isSubmitting={updateMutation.isPending}
          onSubmit={(values) => updateMutation.mutate(values)}
          onCancel={() => navigate(`/tenants/${tenantId}/clients`)}
        />
      </Card>
    </div>
  );
}
