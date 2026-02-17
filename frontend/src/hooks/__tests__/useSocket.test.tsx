import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSocket } from '../useSocket';
import { io } from 'socket.io-client';

vi.mock('socket.io-client');
vi.mock('../../stores/authStore', () => ({
    useAuthStore: vi.fn(() => 'mock-token'),
}));

const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
};

describe('useSocket', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (io as any).mockReturnValue(mockSocket);
    });

    it('connects to socket with board ID', () => {
        const queryClient = new QueryClient();
        const wrapper = ({ children }: any) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );

        renderHook(() => useSocket('board-123'), { wrapper });

        expect(io).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                auth: { token: 'mock-token' },
            })
        );
    });

    it('joins board room on connect', async () => {
        const queryClient = new QueryClient();
        const wrapper = ({ children }: any) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );

        renderHook(() => useSocket('board-123'), { wrapper });

        await waitFor(() => {
            expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
        });
    });

    it('disconnects on unmount', () => {
        const queryClient = new QueryClient();
        const wrapper = ({ children }: any) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );

        const { unmount } = renderHook(() => useSocket('board-123'), { wrapper });
        unmount();

        expect(mockSocket.emit).toHaveBeenCalledWith('leave:board', { boardId: 'board-123' });
        expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('does not connect without board ID', () => {
        const queryClient = new QueryClient();
        const wrapper = ({ children }: any) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );

        renderHook(() => useSocket(undefined), { wrapper });

        expect(io).not.toHaveBeenCalled();
    });
});
