import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    DndContext, DragOverlay, closestCorners,
    PointerSensor, useSensor, useSensors,
    type DragStartEvent, type DragEndEvent, type DragOverEvent,
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useBoard, useCreateList, useMoveTask } from '../api/hooks';
import { useSocket } from '../hooks/useSocket';
import ListColumn from '../components/ListColumn';
import TaskCard from '../components/TaskCard';
import ActivityPanel from '../components/ActivityPanel';
import SearchPanel from '../components/SearchPanel';
import AddMemberDialog from '../components/AddMemberDialog';
import { ArrowLeft, Plus, Zap, Activity, Search, Loader2, UserPlus, X, Clock, Trash2 } from 'lucide-react';
import type { Task } from '../types';

export default function BoardDetailPage() {
    const { boardId } = useParams<{ boardId: string }>();
    const { data: board, isLoading } = useBoard(boardId || '');
    const createList = useCreateList();
    const moveTask = useMoveTask();
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [showNewList, setShowNewList] = useState(false);
    const [newListTitle, setNewListTitle] = useState('');
    const [showActivity, setShowActivity] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [showAddMember, setShowAddMember] = useState(false);

    // Connect to WebSocket for real-time updates
    useSocket(boardId);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    );

    const listIds = useMemo(() => board?.lists?.map((l) => l.id) || [], [board?.lists]);

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const task = board?.lists
            ?.flatMap((l) => l.tasks)
            .find((t) => t.id === active.id);
        if (task) setActiveTask(task);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTask(null);

        if (!over || !boardId) return;

        const activeTaskId = active.id as string;
        const overId = over.id as string;

        // Find which list the task is going to
        let targetListId: string | null = null;
        let position = 1024;

        // Check if dropped on a list
        const targetList = board?.lists?.find((l) => l.id === overId);
        if (targetList) {
            targetListId = targetList.id;
            const lastTask = targetList.tasks[targetList.tasks.length - 1];
            position = lastTask ? lastTask.position + 1024 : 1024;
        } else {
            // Dropped on a task — find which list it belongs to
            for (const list of board?.lists || []) {
                const taskIdx = list.tasks.findIndex((t) => t.id === overId);
                if (taskIdx !== -1) {
                    targetListId = list.id;
                    const overTask = list.tasks[taskIdx];
                    const prevTask = list.tasks[taskIdx - 1];
                    position = prevTask
                        ? (prevTask.position + overTask.position) / 2
                        : overTask.position / 2;
                    break;
                }
            }
        }

        if (!targetListId) return;

        // Find the current list of the active task
        const currentList = board?.lists?.find((l) => l.tasks.some((t) => t.id === activeTaskId));
        if (!currentList) return;

        // Only move if something changed
        if (currentList.id === targetListId && activeTaskId === overId) return;

        moveTask.mutate({
            id: activeTaskId,
            boardId,
            targetListId,
            position,
        });
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        if (activeId === overId) return;

        // Note: For a fully optimizated sortable experience, we should update the local state here.
        // However, since state is managed by React Query, we rely on the visual placeholder 
        // and the final onDragEnd event to commit the change.
        // ensuring onDragOver exists allows dnd-kit to process intersection correctly.
    };

    const handleCreateList = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newListTitle.trim() || !boardId) return;
        await createList.mutateAsync({ title: newListTitle.trim(), boardId });
        setNewListTitle('');
        setShowNewList(false);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-surface-950 via-surface-900 to-surface-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
        );
    }

    if (!board) {
        return (
            <div className="min-h-screen bg-surface-950 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-surface-200 mb-2">Board not found</h2>
                    <Link to="/" className="text-primary-400 hover:text-primary-300">Back to dashboard</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-surface-950 via-surface-900 to-surface-950 flex flex-col">
            {/* Header */}
            {/* Minimalist Header */}
            <header className="h-14 border-b border-surface-800 bg-surface-900/50 backdrop-blur-xl sticky top-0 z-20 flex items-center justify-between px-4">
                <div className="flex items-center gap-4">
                    <Link
                        to="/"
                        className="p-1.5 text-surface-400 hover:text-surface-100 hover:bg-surface-800 rounded-lg transition-all"
                    >
                        <ArrowLeft size={18} />
                    </Link>

                    <div className="flex flex-col">
                        <h1 className="text-sm font-semibold text-surface-100 leading-tight">{board.title}</h1>
                        <div className="flex items-center gap-2 text-[10px] text-surface-500 font-medium tracking-wide uppercase">
                            <span>{board.lists?.length || 0} Lists</span>
                            <span className="w-0.5 h-0.5 rounded-full bg-surface-700" />
                            <span>{board.lists?.reduce((acc, l) => acc + l.tasks.length, 0) || 0} Tasks</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    {/* Members */}
                    <div className="flex -space-x-1.5 mr-3">
                        {board.members.slice(0, 4).map((m) => (
                            <div
                                key={m.id}
                                className="w-7 h-7 rounded-full border-2 border-surface-900 bg-surface-800 flex items-center justify-center text-[10px] font-medium text-surface-300 relative z-0 hover:z-10 transition-all hover:scale-110 cursor-default shadow-sm"
                                title={m.user.name}
                            >
                                {m.user.name.charAt(0).toUpperCase()}
                            </div>
                        ))}
                        {board.members.length > 4 && (
                            <div className="w-7 h-7 rounded-full border-2 border-surface-900 bg-surface-800 flex items-center justify-center text-[9px] font-bold text-surface-500">
                                +{board.members.length - 4}
                            </div>
                        )}
                    </div>

                    <div className="h-6 w-px bg-surface-800 mx-1" />

                    <button
                        onClick={() => setShowAddMember(true)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-surface-900 border border-surface-700 hover:border-surface-600 text-xs font-medium text-surface-300 transition-all hover:shadow-sm"
                    >
                        <UserPlus size={14} />
                        <span className="hidden sm:inline">Share</span>
                    </button>

                    <button
                        onClick={() => setShowSearch(!showSearch)}
                        className={`p-2 rounded-md transition-colors text-surface-400 hover:text-surface-100 hover:bg-surface-800 ${showSearch ? 'text-primary-400 bg-primary-500/10' : ''}`}
                    >
                        <Search size={18} />
                    </button>

                    <button
                        onClick={() => setShowActivity(!showActivity)}
                        className={`p-2 rounded-md transition-colors text-surface-400 hover:text-surface-100 hover:bg-surface-800 ${showActivity ? 'text-primary-400 bg-primary-500/10' : ''}`}
                    >
                        <Activity size={18} />
                    </button>
                </div>
            </header>

            {/* Board Canvas & Side Panels Container */}
            <div className="flex-1 flex overflow-hidden relative">
                <main className="flex-1 overflow-x-auto overflow-y-hidden p-4">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCorners}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver}
                    >
                        <div className="flex h-full gap-4 items-start min-w-fit">
                            <SortableContext items={listIds} strategy={horizontalListSortingStrategy}>
                                {board.lists?.map((list) => (
                                    <ListColumn key={list.id} list={list} boardId={board.id} members={board.members} />
                                ))}
                            </SortableContext>

                            {/* Add List Button */}
                            <div className="flex-shrink-0 w-72">
                                {showNewList ? (
                                    <form onSubmit={handleCreateList} className="bg-surface-900 border border-surface-800 rounded-xl p-3 shadow-lg animate-fade-in ring-1 ring-primary-500/20">
                                        <input
                                            type="text"
                                            className="w-full bg-surface-950 border border-surface-800 rounded px-2 py-1.5 text-sm mb-2 focus:border-primary-500/50 outline-none transition-colors"
                                            placeholder="List title..."
                                            value={newListTitle}
                                            onChange={(e) => setNewListTitle(e.target.value)}
                                            autoFocus
                                        />
                                        <div className="flex gap-2">
                                            <button type="submit" className="flex-1 bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium py-1.5 rounded transition-colors">Add List</button>
                                            <button
                                                type="button"
                                                onClick={() => { setShowNewList(false); setNewListTitle(''); }}
                                                className="p-1.5 text-surface-400 hover:text-surface-200 hover:bg-surface-800 rounded transition-colors"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <button
                                        onClick={() => setShowNewList(true)}
                                        className="w-full h-12 flex items-center justify-center gap-2 text-surface-400 hover:text-surface-200 bg-surface-900/30 hover:bg-surface-900/60 border border-surface-800 hover:border-surface-700/80 border-dashed rounded-xl transition-all duration-200 group"
                                    >
                                        <Plus size={18} className="group-hover:scale-110 transition-transform" />
                                        <span className="text-sm font-medium">Add another list</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        <DragOverlay>
                            {activeTask ? (
                                <div className="w-72 opacity-90 rotate-2 cursor-grabbing">
                                    <TaskCard task={activeTask} isDragging boardId={board.id} members={board.members} />
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                </main>

                {/* Side Panels */}
                {showActivity && <ActivityPanel boardId={board.id} onClose={() => setShowActivity(false)} />}
                {showSearch && <SearchPanel boardId={board.id} onClose={() => setShowSearch(false)} />}
            </div>

            {/* Add Member Dialog */}
            {showAddMember && (
                <AddMemberDialog
                    boardId={board.id}
                    existingMembers={board.members}
                    onClose={() => setShowAddMember(false)}
                />
            )}
        </div>
    );
}
