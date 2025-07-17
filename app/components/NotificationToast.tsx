import React from 'react';
import { Notification } from '../types';

interface NotificationToastProps {
  notification: Notification;
  onClose: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onClose
}) => {
  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 max-w-md animate-in slide-in-from-right-full ${
      notification.type === 'success' ? 'bg-green-500 text-white' :
      notification.type === 'error' ? 'bg-red-500 text-white' :
      'bg-blue-500 text-white'
    }`}>
      <span className="font-medium">{notification.message}</span>
      <button
        onClick={onClose}
        className="ml-auto text-white hover:text-gray-200 transition-colors"
      >
        ✕
      </button>
    </div>
  );
}; 