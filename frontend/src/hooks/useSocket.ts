import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';

export function useSocket(boardId: string | undefined) {
    const socketRef = useRef<Socket | null>(null);
    const queryClient = useQueryClient();
    const accessToken = useAuthStore((s) => s.accessToken);

    const invalidateBoard = useCallback(() => {
        if (boardId) {
            queryClient.invalidateQueries({ queryKey: ['board', boardId] });
            queryClient.invalidateQueries({ queryKey: ['activity', boardId] });
        }
    }, [boardId, queryClient]);

    useEffect(() => {
        if (!boardId || !accessToken) return;

        const wsUrl = import.meta.env.VITE_WS_URL || window.location.origin;
        const socket = io(wsUrl, {
            auth: { token: accessToken },
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('🔌 Socket connected');
            socket.emit('join:board', { boardId });
        });

        socket.on('reconnect', () => {
            console.log('🔌 Socket reconnected');
            socket.emit('join:board', { boardId });
            invalidateBoard();
        });

        // Listen for all board events and invalidate React Query cache
        const events = [
            'task:created', 'task:updated', 'task:moved',
            'task:deleted', 'task:assigned',
            'list:created', 'list:updated', 'list:deleted',
            'board:updated', 'member:added', 'member:removed',
        ];

        events.forEach((event) => {
            socket.on(event, () => {
                invalidateBoard();
            });
        });

        socket.on('disconnect', (reason) => {
            console.log('🔌 Socket disconnected:', reason);
        });

        return () => {
            socket.emit('leave:board', { boardId });
            socket.disconnect();
            socketRef.current = null;
        };
    }, [boardId, accessToken, invalidateBoard]);

    return socketRef;
}
