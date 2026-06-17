import { NavLink, Outlet, useMatch, useNavigate } from 'react-router-dom';
import { useUser, useLogout } from '@/features/auth';
import { useTenants } from '@/features/tenants';
import { Button } from '@/components/button';
import { cn } from '@/utils/cn';

export function AdminLayout() {
  const navigate = useNavigate();
  const match = useMatch('/tenants/:tenantId/*');
  const tenantId = match?.params.tenantId ?? '';

  const { data: user } = useUser();
  const { data: tenants } = useTenants();
  const logoutMutation = useLogout({ onSuccess: () => navigate('/login', { replace: true }) });

  const tabClass = ({ isActive }: { isActive: boolean }) => cn('tab', isActive && 'is-active');

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar__brand">Admin Console</div>

        <select
          aria-label="Select tenant"
          className="tenant-select"
          value={tenantId}
          onChange={(e) => {
            const value = e.target.value;
            navigate(value ? `/tenants/${value}/users` : '/tenants');
          }}
        >
          <option value="">All tenants</option>
          {(tenants ?? []).map((tenant) => (
            <option key={tenant.id} value={tenant.id}>
              {tenant.displayName || tenant.name}
            </option>
          ))}
        </select>

        <div className="topbar__spacer" />

        <div className="topbar__account">
          {user && <span className="muted">{user.username}</span>}
          <Button
            variant="outline"
            size="sm"
            isLoading={logoutMutation.isPending}
            onClick={() => logoutMutation.mutate()}
          >
            Sign out
          </Button>
        </div>
      </header>

      <nav className="tabs" aria-label="Primary">
        <NavLink to="/tenants" end className={tabClass}>
          Tenants
        </NavLink>
        {tenantId && (
          <>
            <NavLink to={`/tenants/${tenantId}/users`} className={tabClass}>
              Users
            </NavLink>
            <NavLink to={`/tenants/${tenantId}/roles`} className={tabClass}>
              Roles
            </NavLink>
            <NavLink to={`/tenants/${tenantId}/clients`} className={tabClass}>
              Clients
            </NavLink>
            <NavLink to={`/tenants/${tenantId}/settings`} className={tabClass}>
              Settings
            </NavLink>
          </>
        )}
      </nav>

      <main className="content">
        <div className="content__inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
