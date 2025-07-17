import { useState } from 'react';
import { Notification } from '../types';

export const useNotifications = () => {
  const [notification, setNotification] = useState<Notification | null>(null);

  const showNotification = (message: string, type: Notification['type'] = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const hideNotification = () => {
    setNotification(null);
  };

  return {
    notification,
    showNotification,
    hideNotification
  };
}; 