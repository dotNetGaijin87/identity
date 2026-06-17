import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/button';
import { Table, type Column } from '@/components/table';
import { EmptyState, EnabledBadge, ErrorState, PageHeader, Spinner } from '@/components/misc';
import { useUsers } from '../api/get-users';
import type { User } from '../types';

export function UsersList() {
  const { tenantId = '' } = useParams();
  const { data: users, isLoading, isError } = useUsers(tenantId);

  const columns: Array<Column<User>> = [
    {
      header: 'Username',
      cell: (u) => <Link to={`/tenants/${tenantId}/users/${u.id}`}>{u.username}</Link>,
    },
    { header: 'Email', cell: (u) => u.email || <span className="muted">—</span> },
    {
      header: 'Name',
      cell: (u) =>
        [u.firstName, u.lastName].filter(Boolean).join(' ') || <span className="muted">—</span>,
    },
    { header: 'Roles', cell: (u) => u.roleIds.length },
    { header: 'Status', cell: (u) => <EnabledBadge enabled={u.enabled} /> },
    {
      header: 'Actions',
      width: '1%',
      cell: (u) => (
        <Link className="btn btn--outline btn--sm" to={`/tenants/${tenantId}/users/${u.id}`}>
          Edit
        </Link>
      ),
    },
  ];

  return (
    <div className="stack">
      <PageHeader
        title="Users"
        description="People who can authenticate against this tenant."
        actions={
          <Link className="btn" to={`/tenants/${tenantId}/users/new`}>
            Create user
          </Link>
        }
      />
      {isLoading ? (
        <Spinner label="Loading users" />
      ) : isError ? (
        <ErrorState message="Couldn't load users." />
      ) : !users || users.length === 0 ? (
        <EmptyState
          message="No users yet."
          action={
            <Link to={`/tenants/${tenantId}/users/new`}>
              <Button>Create a user</Button>
            </Link>
          }
        />
      ) : (
        <Table columns={columns} rows={users} rowKey={(u) => u.id} />
      )}
    </div>
  );
}
