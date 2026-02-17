import { useState } from 'react';
import { useActivity } from '../api/hooks';
import { X, ChevronLeft, ChevronRight, Clock, User } from 'lucide-react';

interface Props {
    boardId: string;
    onClose: () => void;
}

const actionLabels: Record<string, string> = {
    TASK_CREATED: 'created a task',
    TASK_UPDATED: 'updated a task',
    TASK_MOVED: 'moved a task',
    TASK_DELETED: 'deleted a task',
    TASK_ASSIGNED: 'assigned a task',
    LIST_CREATED: 'created a list',
    LIST_UPDATED: 'updated a list',
    LIST_DELETED: 'deleted a list',
    BOARD_CREATED: 'created the board',
    BOARD_UPDATED: 'updated the board',
    MEMBER_ADDED: 'added a member',
    MEMBER_REMOVED: 'removed a member',
};

const actionColors: Record<string, string> = {
    TASK_CREATED: 'bg-emerald-500/20 text-emerald-400',
    TASK_UPDATED: 'bg-blue-500/20 text-blue-400',
    TASK_MOVED: 'bg-purple-500/20 text-purple-400',
    TASK_DELETED: 'bg-red-500/20 text-red-400',
    TASK_ASSIGNED: 'bg-amber-500/20 text-amber-400',
    LIST_CREATED: 'bg-emerald-500/20 text-emerald-400',
    LIST_UPDATED: 'bg-blue-500/20 text-blue-400',
    LIST_DELETED: 'bg-red-500/20 text-red-400',
    BOARD_UPDATED: 'bg-blue-500/20 text-blue-400',
    MEMBER_ADDED: 'bg-primary-500/20 text-primary-400',
    MEMBER_REMOVED: 'bg-orange-500/20 text-orange-400',
};

export default function ActivityPanel({ boardId, onClose }: Props) {
    const [page, setPage] = useState(1);
    const { data, isLoading } = useActivity(boardId, page);

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const getDetails = (details?: string) => {
        if (!details) return null;
        try {
            const parsed = JSON.parse(details);
            return parsed.title || parsed.memberName || null;
        } catch {
            return null;
        }
    };

    return (
        <div className="w-80 border-l border-surface-700/30 bg-surface-900/80 backdrop-blur-xl flex flex-col animate-slide-in-right">
            <div className="p-4 border-b border-surface-700/30 flex items-center justify-between">
                <h3 className="font-semibold text-surface-200 text-sm flex items-center gap-2">
                    <Clock size={16} className="text-primary-400" />
                    Activity
                </h3>
                <button onClick={onClose} className="text-surface-500 hover:text-surface-300 p-1 rounded hover:bg-surface-800">
                    <X size={16} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <div className="w-5 h-5 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
                    </div>
                ) : data?.activities?.length ? (
                    data.activities.map((activity) => {
                        const detail = getDetails(activity.details);
                        return (
                            <div key={activity.id} className="p-2.5 rounded-lg hover:bg-surface-800/50 transition-colors group">
                                <div className="flex items-start gap-2.5">
                                    <div className="w-6 h-6 rounded-full bg-primary-600/30 flex items-center justify-center text-[9px] font-bold text-primary-300 flex-shrink-0 mt-0.5">
                                        {activity.user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-surface-300 leading-relaxed">
                                            <span className="font-medium text-surface-200">{activity.user.name}</span>{' '}
                                            {actionLabels[activity.action] || activity.action}
                                            {detail && (
                                                <span className="font-medium text-surface-200"> "{detail}"</span>
                                            )}
                                        </p>
                                        <span className="text-[10px] text-surface-500 mt-0.5 block">
                                            {formatTime(activity.createdAt)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <p className="text-center text-surface-500 text-sm py-8">No activity yet</p>
                )}
            </div>

            {/* Pagination */}
            {data?.pagination && data.pagination.totalPages > 1 && (
                <div className="p-3 border-t border-surface-700/30 flex items-center justify-between">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="text-surface-400 hover:text-surface-200 disabled:opacity-30 p-1"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs text-surface-500">
                        {page} / {data.pagination.totalPages}
                    </span>
                    <button
                        onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                        disabled={page === data.pagination.totalPages}
                        className="text-surface-400 hover:text-surface-200 disabled:opacity-30 p-1"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}
        </div>
    );
}
