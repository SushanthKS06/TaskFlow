import { useState } from 'react';
import { useSearchTasks } from '../api/hooks';
import { X, Search as SearchIcon, FileText } from 'lucide-react';

interface Props {
    boardId: string;
    onClose: () => void;
}

export default function SearchPanel({ boardId, onClose }: Props) {
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const { data, isLoading } = useSearchTasks(boardId, query, page);

    const priorityConfig: Record<string, { color: string; label: string }> = {
        low: { color: 'text-emerald-400', label: 'Low' },
        medium: { color: 'text-amber-400', label: 'Medium' },
        high: { color: 'text-orange-400', label: 'High' },
        urgent: { color: 'text-red-400', label: 'Urgent' },
    };

    return (
        <div className="w-80 border-l border-surface-700/30 bg-surface-900/80 backdrop-blur-xl flex flex-col animate-slide-in-right">
            <div className="p-4 border-b border-surface-700/30 flex items-center justify-between">
                <h3 className="font-semibold text-surface-200 text-sm flex items-center gap-2">
                    <SearchIcon size={16} className="text-primary-400" />
                    Search Tasks
                </h3>
                <button onClick={onClose} className="text-surface-500 hover:text-surface-300 p-1 rounded hover:bg-surface-800">
                    <X size={16} />
                </button>
            </div>

            <div className="p-3">
                <div className="relative">
                    <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
                    <input
                        type="text"
                        className="input-field pl-9 text-sm"
                        placeholder="Search by title or description..."
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                        autoFocus
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <div className="w-5 h-5 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
                    </div>
                ) : data?.tasks?.length ? (
                    data.tasks.map((task: any) => {
                        const pc = priorityConfig[task.priority] || priorityConfig.medium;
                        return (
                            <div key={task.id} className="p-3 rounded-lg bg-surface-800/60 border border-surface-700/50 hover:border-primary-500/30 transition-colors">
                                <p className="text-sm font-medium text-surface-200">{task.title}</p>
                                {task.description && (
                                    <p className="text-xs text-surface-500 mt-1 line-clamp-2">{task.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                    <span className={`text-[10px] ${pc.color} font-medium`}>{pc.label}</span>
                                    {task.list && (
                                        <span className="text-[10px] text-surface-500">in {task.list.title}</span>
                                    )}
                                    {task.assignee && (
                                        <span className="text-[10px] text-surface-400 ml-auto">{task.assignee.name}</span>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : query ? (
                    <div className="text-center py-8">
                        <FileText className="mx-auto text-surface-600 mb-2" size={32} />
                        <p className="text-sm text-surface-500">No tasks found</p>
                    </div>
                ) : (
                    <p className="text-center text-surface-500 text-sm py-8">Type to search tasks</p>
                )}
            </div>

            {data?.pagination && data.pagination.totalPages > 1 && (
                <div className="p-3 border-t border-surface-700/30 text-center">
                    <span className="text-xs text-surface-500">
                        Showing {data.tasks?.length} of {data.pagination.total} results
                    </span>
                </div>
            )}
        </div>
    );
}
