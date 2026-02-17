import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ActivityPanel from '../ActivityPanel';

const mockActivity = {
    activities: [
        {
            id: 'activity-1',
            action: 'TASK_CREATED',
            entityType: 'task',
            entityId: 'task-1',
            details: '{"title":"New Task"}',
            userId: 'user-1',
            boardId: 'board-1',
            createdAt: new Date().toISOString(),
            user: { id: 'user-1', name: 'John Doe', email: 'john@test.com' },
        },
        {
            id: 'activity-2',
            action: 'TASK_MOVED',
            entityType: 'task',
            entityId: 'task-1',
            details: '{"fromListId":"list-1","toListId":"list-2"}',
            userId: 'user-1',
            boardId: 'board-1',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            user: { id: 'user-1', name: 'John Doe', email: 'john@test.com' },
        },
    ],
    pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
};

vi.mock('../../api/hooks', () => ({
    useActivity: () => ({
        data: mockActivity,
        isLoading: false,
        error: null,
    }),
}));

const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
});

describe('ActivityPanel', () => {
    it('renders activity panel with title', () => {
        render(
            <QueryClientProvider client={queryClient}>
                <ActivityPanel boardId="board-1" onClose={vi.fn()} />
            </QueryClientProvider>
        );
        expect(screen.getByText('Activity')).toBeInTheDocument();
    });

    it('displays activity entries', () => {
        render(
            <QueryClientProvider client={queryClient}>
                <ActivityPanel boardId="board-1" onClose={vi.fn()} />
            </QueryClientProvider>
        );
        expect(screen.getByText(/John Doe/)).toBeInTheDocument();
        expect(screen.getByText(/created/i)).toBeInTheDocument();
    });

    it('shows loading state', () => {
        vi.mock('../../api/hooks', () => ({
            useActivity: () => ({
                data: null,
                isLoading: true,
                error: null,
            }),
        }));
        
        render(
            <QueryClientProvider client={queryClient}>
                <ActivityPanel boardId="board-1" onClose={vi.fn()} />
            </QueryClientProvider>
        );
        expect(screen.getByText('Activity')).toBeInTheDocument();
    });
});
