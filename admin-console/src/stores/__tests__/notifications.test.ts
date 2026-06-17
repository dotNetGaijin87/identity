import { describe, expect, test } from 'vitest';
import { notificationsStore } from '../notifications';

describe('notifications store', () => {
  test('shows and dismisses a notification', () => {
    const { showNotification, dismissNotification } = notificationsStore.getState();
    const id = showNotification({ type: 'success', title: 'Saved' });

    const [n] = notificationsStore.getState().notifications;
    expect(n?.title).toBe('Saved');
    expect(n?.id).toBe(id);

    dismissNotification(id);
    expect(notificationsStore.getState().notifications).toHaveLength(0);
  });

  test('clear removes every notification', () => {
    const { showNotification, clear } = notificationsStore.getState();
    showNotification({ type: 'info', title: 'A' });
    showNotification({ type: 'error', title: 'B' });
    expect(notificationsStore.getState().notifications).toHaveLength(2);

    clear();
    expect(notificationsStore.getState().notifications).toHaveLength(0);
  });
});
