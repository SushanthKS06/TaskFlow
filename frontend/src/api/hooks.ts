import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from './client';
import type { Board, List, Task, AuthResponse, PaginatedResponse, ActivityLog } from '../types';

// ─── Auth ───────────────────────────────────────────────────────────
export const useSignup = () => {
    return useMutation({
        mutationFn: (data: { name: string; email: string; password: string }) =>
            api.post<AuthResponse>('/auth/signup', data).then((r) => r.data),
    });
};

export const useLogin = () => {
    return useMutation({
        mutationFn: (data: { email: string; password: string }) =>
            api.post<AuthResponse>('/auth/login', data).then((r) => r.data),
    });
};

// ─── Boards ─────────────────────────────────────────────────────────
export const useBoards = () => {
    return useQuery({
        queryKey: ['boards'],
        queryFn: () => api.get<Board[]>('/boards').then((r) => r.data),
    });
};

export const useBoard = (id: string) => {
    return useQuery({
        queryKey: ['board', id],
        queryFn: () => api.get<Board>(`/boards/${id}`).then((r) => r.data),
        enabled: !!id,
    });
};

export const useCreateBoard = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { title: string; description?: string }) =>
            api.post<Board>('/boards', data).then((r) => r.data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['boards'] }),
    });
};

export const useUpdateBoard = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: { id: string; title?: string; description?: string }) =>
            api.put<Board>(`/boards/${id}`, data).then((r) => r.data),
        onSuccess: (_, vars) => {
            qc.invalidateQueries({ queryKey: ['boards'] });
            qc.invalidateQueries({ queryKey: ['board', vars.id] });
        },
    });
};

export const useDeleteBoard = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.delete(`/boards/${id}`).then((r) => r.data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['boards'] }),
    });
};

export const useAddBoardMember = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ boardId, userId }: { boardId: string; userId: string }) =>
            api.post(`/boards/${boardId}/members`, { userId }).then((r) => r.data),
        onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['board', vars.boardId] }),
    });
};

// ─── Lists ──────────────────────────────────────────────────────────
export const useCreateList = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { title: string; boardId: string }) =>
            api.post<List>('/lists', data).then((r) => r.data),
        onSuccess: (data) => qc.invalidateQueries({ queryKey: ['board', data.boardId] }),
    });
};

export const useUpdateList = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, boardId, ...data }: { id: string; boardId: string; title?: string }) =>
            api.put<List>(`/lists/${id}`, data).then((r) => r.data),
        onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['board', vars.boardId] }),
    });
};

export const useDeleteList = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, boardId }: { id: string; boardId: string }) =>
            api.delete(`/lists/${id}`).then((r) => r.data),
        onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['board', vars.boardId] }),
    });
};

// ─── Tasks ──────────────────────────────────────────────────────────
export const useCreateTask = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ boardId, ...data }: { title: string; listId: string; description?: string; priority?: string; assigneeId?: string; boardId: string }) =>
            api.post<Task & { boardId: string }>('/tasks', data).then((r) => r.data),
        onMutate: async (newTask) => {
            const queryKey = ['board', newTask.boardId];
            await qc.cancelQueries({ queryKey });
            const previousBoard = qc.getQueryData<Board>(queryKey);

            if (previousBoard) {
                const tempId = 'temp-' + Date.now();
                qc.setQueryData<Board>(queryKey, (old) => {
                    if (!old) return old;
                    return {
                        ...old,
                        lists: old.lists?.map((list) => {
                            if (list.id === newTask.listId) {
                                return {
                                    ...list,
                                    tasks: [
                                        ...list.tasks,
                                        {
                                            ...newTask,
                                            id: tempId,
                                            position: 65535, // end of list
                                            createdAt: new Date().toISOString(),
                                            updatedAt: new Date().toISOString(),
                                            lists: undefined,
                                            priority: (newTask.priority || 'medium') as Task['priority'],
                                        } as any,
                                    ],
                                };
                            }
                            return list;
                        }),
                    };
                });
            }
            return { previousBoard };
        },
        onError: (_err, newTodo, context) => {
            if (context?.previousBoard) {
                qc.setQueryData(['board', newTodo.boardId], context.previousBoard);
            }
        },
        onSettled: (data, error, variables) => {
            qc.invalidateQueries({ queryKey: ['board', variables.boardId] });
        },
    });
};

export const useUpdateTask = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, boardId, ...data }: { id: string; boardId: string; title?: string; description?: string; priority?: string }) =>
            api.put<Task & { boardId: string }>(`/tasks/${id}`, data).then((r) => r.data),
        onMutate: async ({ id, boardId, ...data }) => {
            const queryKey = ['board', boardId];
            await qc.cancelQueries({ queryKey });
            const previousBoard = qc.getQueryData<Board>(queryKey);

            qc.setQueryData<Board>(queryKey, (old) => {
                if (!old) return old;
                return {
                    ...old,
                    lists: old.lists?.map((list) => ({
                        ...list,
                        tasks: list.tasks.map((task) => (task.id === id ? { ...task, ...data, priority: (data.priority as Task['priority']) ?? task.priority } : task)),
                    })),
                };
            });
            return { previousBoard };
        },
        onError: (_err, _vars, context) => {
            if (context?.previousBoard) {
                qc.setQueryData(['board', _vars.boardId], context.previousBoard);
            }
        },
        onSettled: (data, error, variables) => {
            qc.invalidateQueries({ queryKey: ['board', variables.boardId] });
        },
    });
};

export const useMoveTask = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, boardId, ...data }: { id: string; boardId: string; targetListId: string; position: number }) =>
            api.put<Task & { boardId: string }>(`/tasks/${id}/move`, data).then((r) => r.data),
        onMutate: async ({ id, boardId, targetListId, position }) => {
            const queryKey = ['board', boardId];
            await qc.cancelQueries({ queryKey });
            const previousBoard = qc.getQueryData<Board>(queryKey);

            qc.setQueryData<Board>(queryKey, (old) => {
                if (!old || !old.lists) return old;
                // Deep clone to avoid mutation
                const newLists = JSON.parse(JSON.stringify(old.lists)) as List[];

                // Find task and remove from source
                let task: Task | undefined;
                for (const list of newLists) {
                    const taskIndex = list.tasks.findIndex((t) => t.id === id);
                    if (taskIndex !== -1) {
                        task = list.tasks[taskIndex];
                        list.tasks.splice(taskIndex, 1);
                        break;
                    }
                }

                // Add to target at the correct sorted position
                if (task) {
                    const targetList = newLists.find((l) => l.id === targetListId);
                    if (targetList) {
                        task.listId = targetListId;
                        task.position = position;
                        // Insert at correct sorted position by position value
                        const insertIdx = targetList.tasks.findIndex((t) => t.position > position);
                        if (insertIdx === -1) {
                            targetList.tasks.push(task);
                        } else {
                            targetList.tasks.splice(insertIdx, 0, task);
                        }
                    }
                }
                return { ...old, lists: newLists };
            });
            return { previousBoard };
        },
        onError: (_err, _vars, context) => {
            if (context?.previousBoard) {
                qc.setQueryData(['board', _vars.boardId], context.previousBoard);
            }
        },
        onSettled: (data, error, variables) => {
            qc.invalidateQueries({ queryKey: ['board', variables.boardId] });
        },
    });
};

export const useAssignTask = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, boardId, assigneeId }: { id: string; boardId: string; assigneeId?: string | null }) =>
            api.put<Task & { boardId: string }>(`/tasks/${id}/assign`, { assigneeId }).then((r) => r.data),
        onSuccess: (data) => qc.invalidateQueries({ queryKey: ['board', data.boardId] }),
    });
};

export const useDeleteTask = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, boardId }: { id: string; boardId: string }) =>
            api.delete(`/tasks/${id}`).then((r) => r.data),
        onMutate: async ({ id, boardId }) => {
            const queryKey = ['board', boardId];
            await qc.cancelQueries({ queryKey });
            const previousBoard = qc.getQueryData<Board>(queryKey);

            qc.setQueryData<Board>(queryKey, (old) => {
                if (!old) return old;
                return {
                    ...old,
                    lists: old.lists?.map(list => ({
                        ...list,
                        tasks: list.tasks.filter(t => t.id !== id)
                    }))
                };
            });
            return { previousBoard };
        },
        onError: (_err, _vars, context) => {
            if (context?.previousBoard) {
                qc.setQueryData(['board', _vars.boardId], context.previousBoard);
            }
        },
        onSettled: (_, __, vars) => qc.invalidateQueries({ queryKey: ['board', vars.boardId] }),
    });
};

export const useSearchTasks = (boardId: string, query: string, page = 1) => {
    return useQuery({
        queryKey: ['tasks', 'search', boardId, query, page],
        queryFn: () =>
            api.get<PaginatedResponse<Task>>(`/tasks/search/${boardId}`, {
                params: { q: query, page, limit: 20 },
            }).then((r) => r.data),
        enabled: !!boardId && !!query,
    });
};

// ─── Users ──────────────────────────────────────────────────────────
export const useSearchUsers = (query: string) => {
    return useQuery({
        queryKey: ['users', 'search', query],
        queryFn: () => api.get(`/users/search`, { params: { q: query } }).then((r) => r.data),
        enabled: query.length >= 2,
    });
};

// ─── Activity ───────────────────────────────────────────────────────
export const useActivity = (boardId: string, page = 1) => {
    return useQuery({
        queryKey: ['activity', boardId, page],
        queryFn: () =>
            api.get<PaginatedResponse<ActivityLog>>(`/activity/${boardId}`, {
                params: { page, limit: 20 },
            }).then((r) => r.data),
        enabled: !!boardId,
    });
};
