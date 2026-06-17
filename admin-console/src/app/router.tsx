import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Protected } from '@/features/auth';
import { TenantsList, CreateTenant, EditTenant } from '@/features/tenants';
import { UsersList, CreateUser, EditUser } from '@/features/users';
import { RolesList, CreateRole, EditRole } from '@/features/roles';
import { ClientsList, CreateClient, EditClient } from '@/features/clients';
import { AdminLayout } from './layouts/admin-layout';
import { LoginPage } from './pages/login-page';
import { NotFoundPage } from './pages/not-found-page';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <Protected>
        <AdminLayout />
      </Protected>
    ),
    children: [
      { index: true, element: <Navigate to="/tenants" replace /> },

      // Tenants
      { path: 'tenants', element: <TenantsList /> },
      { path: 'tenants/new', element: <CreateTenant /> },
      { path: 'tenants/:tenantId/settings', element: <EditTenant /> },

      // Users (+ role assignment on the edit page)
      { path: 'tenants/:tenantId/users', element: <UsersList /> },
      { path: 'tenants/:tenantId/users/new', element: <CreateUser /> },
      { path: 'tenants/:tenantId/users/:userId', element: <EditUser /> },

      // Roles
      { path: 'tenants/:tenantId/roles', element: <RolesList /> },
      { path: 'tenants/:tenantId/roles/new', element: <CreateRole /> },
      { path: 'tenants/:tenantId/roles/:roleId', element: <EditRole /> },

      // Clients
      { path: 'tenants/:tenantId/clients', element: <ClientsList /> },
      { path: 'tenants/:tenantId/clients/new', element: <CreateClient /> },
      { path: 'tenants/:tenantId/clients/:clientId', element: <EditClient /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
