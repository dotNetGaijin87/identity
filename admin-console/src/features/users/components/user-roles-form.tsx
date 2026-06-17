import { useState } from 'react';
import { useRoles } from '@/features/roles';
import { Button } from '@/components/button';
import { ErrorState, Spinner } from '@/components/misc';
import { useNotifications } from '@/stores/notifications';
import { useAssignUserRoles } from '../api/assign-roles';

export type UserRolesFormProps = {
  tenantId: string;
  userId: string;
  assignedRoleIds: string[];
};

/**
 * Assign tenant roles to a user. Reads the tenant's roles via the roles feature's
 * public API and persists the selection through the users data layer.
 */
export function UserRolesForm({ tenantId, userId, assignedRoleIds }: UserRolesFormProps) {
  const { data: roles, isLoading, isError } = useRoles(tenantId);
  const { showNotification } = useNotifications();
  const [selected, setSelected] = useState<Set<string>>(() => new Set(assignedRoleIds));

  const assignMutation = useAssignUserRoles(tenantId, userId, {
    onSuccess: () => showNotification({ type: 'success', title: 'Roles updated', duration: 4000 }),
  });

  if (isLoading) return <Spinner label="Loading roles" />;
  if (isError) return <ErrorState message="Couldn't load roles." />;
  if (!roles || roles.length === 0) {
    return <p className="muted">No roles exist in this tenant yet.</p>;
  }

  const toggle = (roleId: string, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(roleId);
      else next.delete(roleId);
      return next;
    });

  return (
    <div className="stack">
      <fieldset className="checkbox-list" style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend className="field__label">Assigned roles</legend>
        <div className="checkbox-list">
          {roles.map((role) => (
            <label key={role.id} className="checkbox-list__item">
              <input
                type="checkbox"
                checked={selected.has(role.id)}
                onChange={(e) => toggle(role.id, e.target.checked)}
              />
              <span>
                <strong>{role.name}</strong>
                {role.description && <div className="muted">{role.description}</div>}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="form-actions">
        <Button
          isLoading={assignMutation.isPending}
          onClick={() => assignMutation.mutate({ roleIds: Array.from(selected) })}
        >
          Save role assignment
        </Button>
      </div>
    </div>
  );
}
