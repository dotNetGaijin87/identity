import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/button';
import { Table, type Column } from '@/components/table';
import { EmptyState, ErrorState, PageHeader, Spinner } from '@/components/misc';
import { useRoles } from '../api/get-roles';
import type { Role } from '../types';

export function RolesList() {
  const { tenantId = '' } = useParams();
  const { data: roles, isLoading, isError } = useRoles(tenantId);

  const columns: Array<Column<Role>> = [
    {
      header: 'Name',
      cell: (r) => <Link to={`/tenants/${tenantId}/roles/${r.id}`}>{r.name}</Link>,
    },
    { header: 'Description', cell: (r) => r.description || <span className="muted">—</span> },
    {
      header: 'Actions',
      width: '1%',
      cell: (r) => (
        <Link className="btn btn--outline btn--sm" to={`/tenants/${tenantId}/roles/${r.id}`}>
          Edit
        </Link>
      ),
    },
  ];

  return (
    <div className="stack">
      <PageHeader
        title="Tenant roles"
        description="Roles can be assigned to users in this tenant."
        actions={
          <Link className="btn" to={`/tenants/${tenantId}/roles/new`}>
            Create role
          </Link>
        }
      />
      {isLoading ? (
        <Spinner label="Loading roles" />
      ) : isError ? (
        <ErrorState message="Couldn't load roles." />
      ) : !roles || roles.length === 0 ? (
        <EmptyState
          message="No roles yet."
          action={
            <Link to={`/tenants/${tenantId}/roles/new`}>
              <Button>Create a role</Button>
            </Link>
          }
        />
      ) : (
        <Table columns={columns} rows={roles} rowKey={(r) => r.id} />
      )}
    </div>
  );
}
