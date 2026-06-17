import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/button';
import { Table, type Column } from '@/components/table';
import {
  Badge,
  EmptyState,
  EnabledBadge,
  ErrorState,
  PageHeader,
  Spinner,
} from '@/components/misc';
import { useClients } from '../api/get-clients';
import type { Client } from '../types';

export function ClientsList() {
  const { tenantId = '' } = useParams();
  const { data: clients, isLoading, isError } = useClients(tenantId);

  const columns: Array<Column<Client>> = [
    {
      header: 'Client ID',
      cell: (c) => <Link to={`/tenants/${tenantId}/clients/${c.id}`}>{c.clientId}</Link>,
    },
    { header: 'Name', cell: (c) => c.name || <span className="muted">—</span> },
    {
      header: 'Type',
      cell: (c) => <Badge tone="neutral">{c.publicClient ? 'public' : 'confidential'}</Badge>,
    },
    { header: 'Status', cell: (c) => <EnabledBadge enabled={c.enabled} /> },
    {
      header: 'Actions',
      width: '1%',
      cell: (c) => (
        <Link className="btn btn--outline btn--sm" to={`/tenants/${tenantId}/clients/${c.id}`}>
          Edit
        </Link>
      ),
    },
  ];

  return (
    <div className="stack">
      <PageHeader
        title="Clients"
        description="Applications and services that can request authentication."
        actions={
          <Link className="btn" to={`/tenants/${tenantId}/clients/new`}>
            Create client
          </Link>
        }
      />
      {isLoading ? (
        <Spinner label="Loading clients" />
      ) : isError ? (
        <ErrorState message="Couldn't load clients." />
      ) : !clients || clients.length === 0 ? (
        <EmptyState
          message="No clients yet."
          action={
            <Link to={`/tenants/${tenantId}/clients/new`}>
              <Button>Create a client</Button>
            </Link>
          }
        />
      ) : (
        <Table columns={columns} rows={clients} rowKey={(c) => c.id} />
      )}
    </div>
  );
}
