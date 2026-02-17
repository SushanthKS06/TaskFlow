import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useUpdateTask, useDeleteTask, useAssignTask } from '../api/hooks';
import { GripVertical, Trash2, Edit2, X, Check, UserPlus, Clock } from 'lucide-react';
import type { Task, BoardMember } from '../types';

interface Props {
    task: Task;
    isDragging?: boolean;
    boardId: string;
    members: BoardMember[];
}

const priorityConfig: Record<string, { color: string; bg: string; label: string }> = {
    low: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Low' },
    medium: { color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Medium' },
    high: { color: 'text-orange-400', bg: 'bg-orange-500/10', label: 'High' },
    urgent: { color: 'text-rose-400', bg: 'bg-rose-500/10', label: 'Urgent' },
};

export default function TaskCard({ task, isDragging, boardId, members }: Props) {
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(task.title);
    const [editDesc, setEditDesc] = useState(task.description || '');
    const [showAssign, setShowAssign] = useState(false);
    const assignBtnRef = useRef<HTMLButtonElement>(null);
    const [popoverStyle, setPopoverStyle] = useState({});

    const updateTask = useUpdateTask();
    const deleteTask = useDeleteTask();
    const assignTask = useAssignTask();

    const {
        attributes, listeners, setNodeRef, transform, transition, isDragging: isSortDragging,
    } = useSortable({ id: task.id, data: { type: 'Task', task } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isSortDragging ? 0.4 : 1,
    };

    const priority = priorityConfig[task.priority] || priorityConfig.medium;

    const handleSave = async () => {
        if (!editTitle.trim()) return;
        await updateTask.mutateAsync({
            id: task.id,
            boardId,
            title: editTitle.trim(),
            description: editDesc.trim() || undefined,
        });
        setIsEditing(false);
    };

    const handleAssign = async (userId: string | null) => {
        await assignTask.mutateAsync({ id: task.id, boardId, assigneeId: userId });
        setShowAssign(false);
    };

    const toggleAssign = () => {
        if (!showAssign && assignBtnRef.current) {
            const rect = assignBtnRef.current.getBoundingClientRect();
            // Position above the button, aligned to the right of the button
            // w-48 is 192px.
            setPopoverStyle({
                position: 'fixed',
                left: rect.right - 192 > 0 ? rect.right - 192 : rect.left,
                // Render above: bottom is viewport height - rect.top + gap
                bottom: window.innerHeight - rect.top + 8,
                zIndex: 9999, // Ensure it's on top
            });
        }
        setShowAssign(!showAssign);
    };

    if (isDragging) {
        return (
            <div className="bg-surface-800 border border-primary-500/50 rounded-lg p-3 shadow-2xl opacity-90 rotate-2 cursor-grabbing ring-2 ring-primary-500/30">
                <div className="h-2 w-10 bg-surface-700 rounded-full mb-2" />
                <p className="text-sm font-medium text-surface-200">{task.title}</p>
            </div>
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="group relative bg-surface-800 border border-surface-700 hover:border-surface-600 rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-200 ring-1 ring-inset ring-surface-700/50 hover:ring-primary-500/30"
        >
            {/* Drag Handle - Visible on Hover */}
            <div
                {...attributes}
                {...listeners}
                className="absolute top-2 right-2 p-1 text-surface-600 hover:text-surface-400 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity z-10"
            >
                <GripVertical size={14} />
            </div>

            {isEditing ? (
                <div className="space-y-2">
                    <input
                        className="w-full bg-surface-950 border border-surface-800 rounded p-1.5 text-sm focus:border-primary-500 outline-none"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        autoFocus
                    />
                    <textarea
                        className="w-full bg-surface-950 border border-surface-800 rounded p-1.5 text-xs h-16 resize-none focus:border-primary-500 outline-none"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        placeholder="Add description..."
                    />
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setIsEditing(false)} className="text-xs text-surface-400 hover:text-surface-300">Cancel</button>
                        <button onClick={handleSave} className="text-xs bg-primary-600 text-white px-2 py-1 rounded hover:bg-primary-500">Save</button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="pr-6">
                        <h4 className="text-sm font-medium text-surface-200 leading-tight mb-1">{task.title}</h4>
                        {task.description && <p className="text-xs text-surface-500 line-clamp-2 mb-3">{task.description}</p>}
                    </div>

                    <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                            {/* Priority Pill */}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border border-transparent ${priority.bg} ${priority.color}`}>
                                {priority.label}
                            </span>
                        </div>

                        <div className="flex items-center gap-1">
                            {/* Assignee Avatar */}
                            {task.assignee ? (
                                <button
                                    ref={assignBtnRef}
                                    onClick={toggleAssign}
                                    className="relative group/avatar"
                                >
                                    <div className="w-5 h-5 rounded-full bg-primary-900/50 border border-primary-500/30 flex items-center justify-center text-[9px] text-primary-300">
                                        {task.assignee.name.charAt(0)}
                                    </div>
                                    {/* Tooltip */}
                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-surface-950 text-[9px] text-surface-300 rounded opacity-0 group-hover/avatar:opacity-100 whitespace-nowrap pointer-events-none border border-surface-800">
                                        {task.assignee.name}
                                    </span>
                                </button>
                            ) : (
                                <button
                                    ref={assignBtnRef}
                                    onClick={toggleAssign}
                                    className="w-5 h-5 rounded-full border border-surface-700 border-dashed flex items-center justify-center text-surface-500 hover:text-surface-300 hover:border-surface-500 transition-colors"
                                >
                                    <UserPlus size={10} />
                                </button>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Hover Actions */}
            {!isEditing && (
                <div className="absolute top-2 right-8 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setIsEditing(true)} className="p-1 text-surface-500 hover:text-primary-400 rounded hover:bg-surface-800">
                        <Edit2 size={12} />
                    </button>
                    <button onClick={() => {
                        import('../stores/uiStore').then(({ useUIStore }) => {
                            const { showConfirm } = useUIStore.getState();
                            showConfirm({
                                title: 'Delete Task',
                                message: `Delete "${task.title}"? This cannot be undone.`,
                                confirmText: 'Delete',
                                onConfirm: () => deleteTask.mutate({ id: task.id, boardId }),
                            });
                        });
                    }} className="p-1 text-surface-500 hover:text-rose-400 rounded hover:bg-surface-800">
                        <Trash2 size={12} />
                    </button>
                </div>
            )}

            {/* Assign Popover Portal */}
            {showAssign && createPortal(
                <div className="fixed inset-0 z-50">
                    <div className="absolute inset-0" onClick={() => setShowAssign(false)} />
                    <div
                        className="absolute w-48 bg-surface-900 border border-surface-800 shadow-xl rounded-lg p-1 animate-fade-in"
                        style={popoverStyle}
                    >
                        <div className="text-[10px] font-semibold text-surface-500 px-2 py-1 uppercase tracking-wider">Assign to</div>
                        {members.map(m => (
                            <button
                                key={m.user.id}
                                onClick={() => handleAssign(m.user.id)}
                                className="w-full text-left px-2 py-1.5 text-xs text-surface-300 hover:bg-surface-800 rounded flex items-center gap-2"
                            >
                                <div className="w-4 h-4 rounded-full bg-primary-900/50 flex items-center justify-center text-[8px] text-primary-300">
                                    {m.user.name.charAt(0)}
                                </div>
                                {m.user.name}
                            </button>
                        ))}
                        <button
                            onClick={() => handleAssign(null)}
                            className="w-full text-left px-2 py-1.5 text-xs text-rose-400 hover:bg-surface-800 rounded mt-1 border-t border-surface-800/50"
                        >
                            Unassign
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
