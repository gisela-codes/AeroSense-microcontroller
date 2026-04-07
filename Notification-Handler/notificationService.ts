/**
 * Notification Service - Handle local and push notifications
 */

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  type: 'info' | 'warning' | 'error' | 'success';
}

class NotificationService {
  private notifications: Notification[] = [];
  private listeners: Set<(notifications: Notification[]) => void> = new Set();

  subscribe(callback: (notifications: Notification[]) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify(title: string, message: string, type: Notification['type'] = 'info') {
    const notification: Notification = {
      id: Date.now().toString(),
      title,
      message,
      timestamp: Date.now(),
      type,
    };

    this.notifications.unshift(notification);
    // Keep only last 50 notifications
    if (this.notifications.length > 50) {
      this.notifications.pop();
    }

    this.broadcast();
    return notification.id;
  }

  dismiss(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.broadcast();
  }

  clear() {
    this.notifications = [];
    this.broadcast();
  }

  private broadcast() {
    this.listeners.forEach(callback => callback([...this.notifications]));
  }

  getAll(): Notification[] {
    return [...this.notifications];
  }
}

export const notificationService = new NotificationService();
