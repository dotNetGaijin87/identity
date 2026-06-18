import { useParams } from 'react-router-dom';
import { Button } from '@/components/button';
import { Table, type Column } from '@/components/table';
import { Badge, EmptyState, ErrorState, PageHeader, Spinner } from '@/components/misc';
import { useNotifications } from '@/stores/notifications';
import { useSessions } from '../api/get-sessions';
import { useRevokeSession } from '../api/revoke-session';
import type { Session } from '../types';

const fmt = (ms: number) => new Date(ms).toLocaleString();

export function SessionsList() {
  const { tenantId = '' } = useParams();
  const { data: sessions, isLoading, isError } = useSessions(tenantId);
  const { showNotification } = useNotifications();

  const revoke = useRevokeSession(tenantId, {
    onSuccess: () => showNotification({ type: 'success', title: 'Session revoked', duration: 4000 }),
  });

  const columns: Array<Column<Session>> = [
    { header: 'User', cell: (s) => s.username },
    {
      header: 'Signed into',
      cell: (s) =>
        s.clients.length ? (
          <span className="row-actions">
            {s.clients.map((c) => (
              <Badge key={c.clientId} tone="neutral">
                {c.clientName || c.clientId}
              </Badge>
            ))}
          </span>
        ) : (
          <span className="muted">—</span>
        ),
    },
    { header: 'IP', cell: (s) => s.ipAddress || <span className="muted">—</span> },
    { header: 'Started', cell: (s) => fmt(s.createdAt) },
    { header: 'Last active', cell: (s) => fmt(s.lastSeenAt) },
    { header: 'Expires', cell: (s) => fmt(s.expiresAt) },
    {
      header: 'Actions',
      width: '1%',
      cell: (s) => (
        <Button
          variant="danger"
          size="sm"
          isLoading={revoke.isPending && revoke.variables === s.id}
          onClick={() => revoke.mutate(s.id)}
        >
          Revoke
        </Button>
      ),
    },
  ];

  return (
    <div className="stack">
      <PageHeader
        title="Sessions"
        description="Active end-user login sessions (SSO) and the clients they've signed into. Revoking ends the session everywhere."
      />
      {isLoading ? (
        <Spinner label="Loading sessions" />
      ) : isError ? (
        <ErrorState message="Couldn't load sessions." />
      ) : !sessions || sessions.length === 0 ? (
        <EmptyState message="No active sessions." />
      ) : (
        <Table columns={columns} rows={sessions} rowKey={(s) => s.id} />
      )}
    </div>
  );
}
