import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import TaskCard from './TaskCard';
import { useCreateTask, useDeleteList, useUpdateList } from '../api/hooks';
import { MoreHorizontal, Plus, Trash2, Edit2, X, PlusCircle } from 'lucide-react';
import type { List, BoardMember } from '../types';

interface Props {
    list: List;
    boardId: string;
    members: BoardMember[];
}

export default function ListColumn({ list, boardId, members }: Props) {
    const [showAddTask, setShowAddTask] = useState(false);
    const [taskTitle, setTaskTitle] = useState('');
    const [showMenu, setShowMenu] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(list.title);

    const createTask = useCreateTask();
    const deleteList = useDeleteList();
    const updateList = useUpdateList();

    const { setNodeRef, isOver } = useDroppable({ id: list.id, data: { type: 'List', list } });

    const taskIds = list.tasks.map((t) => t.id);

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskTitle.trim()) return;
        await createTask.mutateAsync({ title: taskTitle.trim(), listId: list.id, boardId });
        setTaskTitle('');
        setShowAddTask(false);
    };

    const handleRename = async () => {
        if (!editTitle.trim() || editTitle === list.title) {
            setIsEditing(false);
            return;
        }
        await updateList.mutateAsync({ id: list.id, boardId, title: editTitle.trim() });
        setIsEditing(false);
    };

    return (
        <div
            ref={setNodeRef}
            className={`flex-shrink-0 w-72 flex flex-col max-h-[calc(100vh-8rem)] rounded-xl transition-all duration-200 ${isOver ? 'bg-surface-800/80 ring-2 ring-primary-500/30' : 'bg-surface-900/40 border border-surface-800/50'
                }`}
        >
            {/* List Header */}
            <div className="p-3 pb-2 flex items-center justify-between group/header">
                {isEditing ? (
                    <div className="flex items-center gap-1 flex-1">
                        <input
                            type="text"
                            className="w-full bg-surface-950 border border-primary-500/50 rounded px-2 py-1 text-sm font-semibold text-surface-100 focus:outline-none"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onBlur={handleRename}
                            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                            autoFocus
                        />
                    </div>
                ) : (
                    <h3
                        onClick={() => setIsEditing(true)}
                        className="font-semibold text-surface-300 text-sm flex items-center gap-2 cursor-pointer hover:text-surface-100 transition-colors flex-1"
                    >
                        {list.title}
                        <span className="text-[10px] text-surface-500 font-medium bg-surface-800 px-1.5 py-0.5 rounded-full">
                            {list.tasks.length}
                        </span>
                    </h3>
                )}

                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="text-surface-500 hover:text-surface-200 p-1 rounded hover:bg-surface-800 opacity-0 group-hover/header:opacity-100 transition-opacity"
                    >
                        <MoreHorizontal size={16} />
                    </button>
                    {showMenu && (
                        <div className="absolute right-0 top-full mt-1 w-40 bg-surface-900 border border-surface-800 shadow-xl rounded-lg py-1 z-20 animate-fade-in">
                            <button
                                onClick={() => { setIsEditing(true); setShowMenu(false); }}
                                className="w-full px-3 py-2 text-xs font-medium text-left text-surface-300 hover:bg-surface-800 hover:text-surface-100 flex items-center gap-2"
                            >
                                <Edit2 size={13} /> Rename List
                            </button>
                            <div className="h-px bg-surface-800 my-1" />
                            <button
                                onClick={() => {
                                    import('../stores/uiStore').then(({ useUIStore }) => {
                                        const { showConfirm } = useUIStore.getState();
                                        showConfirm({
                                            title: 'Delete List',
                                            message: `Delete "${list.title}" and all its tasks? This cannot be undone.`,
                                            confirmText: 'Delete',
                                            onConfirm: () => deleteList.mutate({ id: list.id, boardId }),
                                        });
                                    });
                                    setShowMenu(false);
                                }}
                                className="w-full px-3 py-2 text-xs font-medium text-left text-rose-400 hover:bg-surface-800 flex items-center gap-2"
                            >
                                <Trash2 size={13} /> Delete List
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Tasks */}
            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2 min-h-[2rem] scrollbar-thin scrollbar-thumb-surface-800 scrollbar-track-transparent">
                <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                    {list.tasks.map((task) => (
                        <TaskCard key={task.id} task={task} boardId={boardId} members={members} />
                    ))}
                </SortableContext>
            </div>

            {/* Add Task */}
            <div className="p-2 pt-0">
                {showAddTask ? (
                    <form onSubmit={handleAddTask} className="bg-surface-900 border border-surface-800 rounded-lg p-2 shadow-sm animate-fade-in">
                        <textarea
                            className="w-full bg-transparent text-sm text-surface-200 placeholder:text-surface-500 resize-none outline-none h-16 mb-2"
                            placeholder="Enter a title for this card..."
                            value={taskTitle}
                            onChange={(e) => setTaskTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleAddTask(e);
                                }
                            }}
                            autoFocus
                        />
                        <div className="flex items-center justify-between">
                            <button type="submit" className="bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium py-1.5 px-3 rounded transition-colors">
                                Add Card
                            </button>
                            <button type="button" onClick={() => { setShowAddTask(false); setTaskTitle(''); }} className="text-surface-400 hover:text-surface-200 p-1">
                                <X size={16} />
                            </button>
                        </div>
                    </form>
                ) : (
                    <button
                        onClick={() => setShowAddTask(true)}
                        className="w-full text-left group px-2 py-1.5 rounded-lg hover:bg-surface-800/50 transition-colors flex items-center gap-2 text-surface-400 hover:text-surface-200"
                    >
                        <Plus size={16} />
                        <span className="text-sm font-medium">Add a card</span>
                    </button>
                )}
            </div>
        </div>
    );
}
