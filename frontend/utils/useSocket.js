import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export function useSocket(userId, onNotification) {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    const socket = io(
      process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000',
      {
        transports: ['websocket', 'polling'],
      }
    );
    socketRef.current = socket;
    socket.emit('join', userId);
    socket.on('notification', (data) => {
      if (onNotification) onNotification(data);
    });
    socket.on('low_stock_alert', (data) => {
      if (onNotification) onNotification({ type: 'lowStock', ...data });
    });
    return () => {
      socket.disconnect();
    };
  }, [userId]);

  return socketRef;
}
