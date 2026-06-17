import { Link } from 'react-router-dom';
import { Button } from '@/components/button';
import { Table, type Column } from '@/components/table';
import { EmptyState, EnabledBadge, ErrorState, PageHeader, Spinner } from '@/components/misc';
import { useTenants } from '../api/get-tenants';
import type { Tenant } from '../types';

const columns: Array<Column<Tenant>> = [
  { header: 'Name', cell: (r) => <Link to={`/tenants/${r.id}/users`}>{r.name}</Link> },
  { header: 'Display name', cell: (r) => r.displayName },
  { header: 'Status', cell: (r) => <EnabledBadge enabled={r.enabled} /> },
  {
    header: 'Actions',
    width: '1%',
    cell: (r) => (
      <div className="row-actions">
        <Link className="btn btn--outline btn--sm" to={`/tenants/${r.id}/settings`}>
          Edit
        </Link>
      </div>
    ),
  },
];

export function TenantsList() {
  const { data: tenants, isLoading, isError } = useTenants();

  return (
    <div className="stack">
      <PageHeader
        title="Tenants"
        description="A tenant manages a set of users, clients, and roles."
        actions={
          <Link className="btn" to="/tenants/new">
            Create tenant
          </Link>
        }
      />
      {isLoading ? (
        <Spinner label="Loading tenants" />
      ) : isError ? (
        <ErrorState message="Couldn't load tenants." />
      ) : !tenants || tenants.length === 0 ? (
        <EmptyState
          message="No tenants yet."
          action={
            <Link to="/tenants/new">
              <Button>Create your first tenant</Button>
            </Link>
          }
        />
      ) : (
        <Table columns={columns} rows={tenants} rowKey={(r) => r.id} />
      )}
    </div>
  );
}
