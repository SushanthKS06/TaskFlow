import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SearchPanel from '../SearchPanel';

const mockSearchResults = {
    tasks: [
        {
            id: 'task-1',
            title: 'Search Result Task',
            description: 'Found this task',
            position: 1024,
            priority: 'medium',
            listId: 'list-1',
            assigneeId: null,
            creatorId: 'user-1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            assignee: null,
            list: { id: 'list-1', title: 'To Do' },
        },
    ],
    pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

vi.mock('../../api/hooks', () => ({
    useSearchTasks: (boardId: string, query: string) => ({
        data: query.length >= 2 ? mockSearchResults : null,
        isLoading: false,
        error: null,
    }),
}));

const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
});

describe('SearchPanel', () => {
    it('renders search panel with input', () => {
        render(
            <QueryClientProvider client={queryClient}>
                <SearchPanel boardId="board-1" onClose={vi.fn()} />
            </QueryClientProvider>
        );
        expect(screen.getByPlaceholderText(/search tasks/i)).toBeInTheDocument();
    });

    it('shows search results when typing', async () => {
        render(
            <QueryClientProvider client={queryClient}>
                <SearchPanel boardId="board-1" onClose={vi.fn()} />
            </QueryClientProvider>
        );
        
        const input = screen.getByPlaceholderText(/search tasks/i);
        fireEvent.change(input, { target: { value: 'Search' } });
        
        await waitFor(() => {
            expect(screen.getByText('Search Result Task')).toBeInTheDocument();
        });
    });

    it('shows empty state for no results', async () => {
        vi.mock('../../api/hooks', () => ({
            useSearchTasks: () => ({
                data: { tasks: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
                isLoading: false,
                error: null,
            }),
        }));
        
        render(
            <QueryClientProvider client={queryClient}>
                <SearchPanel boardId="board-1" onClose={vi.fn()} />
            </QueryClientProvider>
        );
        
        const input = screen.getByPlaceholderText(/search tasks/i);
        fireEvent.change(input, { target: { value: 'nonexistent' } });
        
        await waitFor(() => {
            expect(screen.getByText(/no tasks found/i)).toBeInTheDocument();
        });
    });
});
