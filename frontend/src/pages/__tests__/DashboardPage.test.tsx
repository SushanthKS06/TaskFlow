import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import DashboardPage from '../DashboardPage';

const mockBoards = [
    {
        id: 'board-1',
        title: 'Project Alpha',
        description: 'Main project',
        ownerId: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        owner: { id: 'user-1', name: 'John', email: 'john@test.com' },
        members: [{ id: 'member-1', userId: 'user-1', role: 'owner', user: { id: 'user-1', name: 'John', email: 'john@test.com' } }],
        _count: { lists: 3 },
    },
];

vi.mock('../../api/hooks', () => ({
    useBoards: () => ({
        data: mockBoards,
        isLoading: false,
        error: null,
    }),
    useCreateBoard: () => ({
        mutateAsync: vi.fn().mockResolvedValue({ id: 'new-board' }),
    }),
    useDeleteBoard: () => ({
        mutate: vi.fn(),
    }),
}));

vi.mock('../../stores/authStore', () => ({
    useAuthStore: () => ({
        user: { id: 'user-1', name: 'John', email: 'john@test.com' },
        logout: vi.fn(),
    }),
}));

const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
});

describe('DashboardPage', () => {
    it('renders dashboard with boards', () => {
        render(
            <QueryClientProvider client={queryClient}>
                <BrowserRouter>
                    <DashboardPage />
                </BrowserRouter>
            </QueryClientProvider>
        );
        expect(screen.getByText('Project Alpha')).toBeInTheDocument();
        expect(screen.getByText('3 Lists')).toBeInTheDocument();
    });

    it('shows create board button', () => {
        render(
            <QueryClientProvider client={queryClient}>
                <BrowserRouter>
                    <DashboardPage />
                </BrowserRouter>
            </QueryClientProvider>
        );
        expect(screen.getByText('Create Board')).toBeInTheDocument();
    });

    it('displays user name in header', () => {
        render(
            <QueryClientProvider client={queryClient}>
                <BrowserRouter>
                    <DashboardPage />
                </BrowserRouter>
            </QueryClientProvider>
        );
        expect(screen.getByText('John')).toBeInTheDocument();
    });
});
