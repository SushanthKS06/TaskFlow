import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DndContext } from '@dnd-kit/core';
import ListColumn from '../ListColumn';

const mockCreateTask = { mutateAsync: vi.fn() };
const mockUpdateList = { mutateAsync: vi.fn() };
const mockDeleteList = { mutate: vi.fn() };

vi.mock('../../api/hooks', () => ({
    useCreateTask: () => mockCreateTask,
    useUpdateList: () => mockUpdateList,
    useDeleteList: () => mockDeleteList,
}));

vi.mock('../../stores/uiStore', () => ({
    useUIStore: {
        getState: () => ({
            showConfirm: vi.fn(({ onConfirm }) => onConfirm()),
        }),
    },
}));

const mockList = {
    id: 'list-1',
    title: 'To Do',
    position: 1024,
    boardId: 'board-1',
    tasks: [
        {
            id: 'task-1',
            title: 'Task 1',
            description: 'Description 1',
            position: 1024,
            priority: 'high',
            listId: 'list-1',
            assigneeId: null,
            creatorId: 'user-1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            assignee: null,
            creator: { id: 'user-1', name: 'John', email: 'john@test.com' },
        },
    ],
};

const mockMembers = [
    { id: 'member-1', userId: 'user-1', boardId: 'board-1', role: 'owner', user: { id: 'user-1', name: 'John', email: 'john@test.com' } },
];

const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

const renderWithProviders = (component: React.ReactElement) => {
    return render(
        <QueryClientProvider client={queryClient}>
            <DndContext>
                {component}
            </DndContext>
        </QueryClientProvider>
    );
};

describe('ListColumn', () => {
    it('renders list title and task count', () => {
        renderWithProviders(<ListColumn list={mockList as any} boardId="board-1" members={mockMembers as any} />);
        expect(screen.getByText('To Do')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('shows add task form when clicking add button', async () => {
        renderWithProviders(<ListColumn list={mockList as any} boardId="board-1" members={mockMembers as any} />);
        const addButton = screen.getByText('Add task');
        fireEvent.click(addButton);
        await waitFor(() => {
            expect(screen.getByPlaceholderText(/task title/i)).toBeInTheDocument();
        });
    });

    it('creates task when form is submitted', async () => {
        mockCreateTask.mutateAsync.mockResolvedValue({ id: 'new-task' });
        renderWithProviders(<ListColumn list={mockList as any} boardId="board-1" members={mockMembers as any} />);
        
        const addButton = screen.getByText('Add task');
        fireEvent.click(addButton);
        
        const input = await screen.findByPlaceholderText(/task title/i);
        fireEvent.change(input, { target: { value: 'New Task' } });
        
        const submitButton = screen.getByText('Add');
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            expect(mockCreateTask.mutateAsync).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'New Task',
                    listId: 'list-1',
                    boardId: 'board-1',
                })
            );
        });
    });

    it('renders all tasks in the list', () => {
        renderWithProviders(<ListColumn list={mockList as any} boardId="board-1" members={mockMembers as any} />);
        expect(screen.getByText('Task 1')).toBeInTheDocument();
    });

    it('shows empty state when no tasks', () => {
        const emptyList = { ...mockList, tasks: [] };
        renderWithProviders(<ListColumn list={emptyList as any} boardId="board-1" members={mockMembers as any} />);
        expect(screen.getByText(/no tasks yet/i)).toBeInTheDocument();
    });
});
