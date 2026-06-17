import { useNotifications } from '@/stores/notifications';
import { cn } from '@/utils/cn';

/** Renders the global notification stack near the app root. */
export function Notifications() {
  const { notifications, dismissNotification } = useNotifications();
  if (notifications.length === 0) return null;
  return (
    <div className="notifications" aria-live="polite">
      {notifications.map((n) => (
        <div key={n.id} className={cn('notification', `notification--${n.type}`)} role="status">
          <div>
            <div className="notification__title">{n.title}</div>
            {n.message && <div className="muted">{n.message}</div>}
          </div>
          <button
            type="button"
            className="notification__close"
            aria-label="Dismiss notification"
            onClick={() => dismissNotification(n.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
