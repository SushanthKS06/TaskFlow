export interface User {
    id: string;
    name: string;
    email: string;
    createdAt?: string;
}

export interface Board {
    id: string;
    title: string;
    description?: string;
    ownerId: string;
    owner: User;
    members: BoardMember[];
    lists?: List[];
    _count?: { lists: number };
    createdAt: string;
    updatedAt: string;
}

export interface BoardMember {
    id: string;
    userId: string;
    boardId: string;
    role: string;
    user: User;
}

export interface List {
    id: string;
    title: string;
    position: number;
    boardId: string;
    tasks: Task[];
    createdAt: string;
    updatedAt: string;
}

export interface Task {
    id: string;
    title: string;
    description?: string;
    position: number;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    dueDate?: string;
    listId: string;
    creatorId: string;
    creator?: User;
    assigneeId?: string;
    assignee?: User;
    createdAt: string;
    updatedAt: string;
}

export interface ActivityLog {
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    details?: string;
    userId: string;
    user: User;
    boardId: string;
    createdAt: string;
}

export interface PaginatedResponse<T> {
    activities?: T[];
    tasks?: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface AuthResponse {
    user: User;
    accessToken: string;
    refreshToken: string;
}

export interface TokenResponse {
    accessToken: string;
    refreshToken: string;
}
