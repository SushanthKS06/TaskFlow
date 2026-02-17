import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBoards, useCreateBoard, useDeleteBoard } from '../api/hooks';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { Plus, LayoutDashboard, LogOut, Zap, Trash2, Users, X, Loader2 } from 'lucide-react';

export default function DashboardPage() {
    const { data: boards, isLoading } = useBoards();
    const createBoard = useCreateBoard();
    const deleteBoard = useDeleteBoard();
    const { user, logout } = useAuthStore();
    const [showCreate, setShowCreate] = useState(false);
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        await createBoard.mutateAsync({ title: title.trim(), description: desc.trim() || undefined });
        setTitle('');
        setDesc('');
        setShowCreate(false);
    };

    return (
        <div className="min-h-screen bg-surface-950 text-surface-100 selection:bg-primary-500/30">
            {/* Header */}
            <header className="h-16 border-b border-surface-800 bg-surface-900/50 backdrop-blur-xl sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-surface-800 border border-surface-700">
                            <Zap className="w-5 h-5 text-primary-400 fill-current" />
                        </div>
                        <span className="text-lg font-bold tracking-tight text-surface-100">
                            TaskFlow
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-surface-800/50 border border-surface-700/50">
                            <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                                {user?.name?.charAt(0)}
                            </div>
                            <span className="text-xs font-medium text-surface-300 hidden sm:block pr-1">
                                {user?.name}
                            </span>
                        </div>
                        <button
                            onClick={logout}
                            className="text-surface-400 hover:text-rose-400 transition-colors p-2 rounded-lg hover:bg-surface-800"
                            title="Sign out"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                {/* Page Header */}
                <div className="flex items-center justify-between mb-10">
                    <h1 className="text-xl font-bold text-surface-100 flex items-center gap-3">
                        <LayoutDashboard className="text-surface-500" size={20} />
                        Your Boards
                    </h1>
                    <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 py-2 px-4 shadow-lg shadow-primary-900/20">
                        <Plus size={18} />
                        Create Board
                    </button>
                </div>

                {/* Create Board Modal */}
                {showCreate && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowCreate(false)}>
                        <div className="w-full max-w-md bg-surface-900 border border-surface-700 rounded-2xl p-6 shadow-2xl m-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-semibold text-surface-100">Create Board</h2>
                                <button onClick={() => setShowCreate(false)} className="text-surface-500 hover:text-surface-300 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-surface-400 uppercase tracking-wider mb-1.5">Title</label>
                                    <input
                                        type="text"
                                        className="w-full bg-surface-950 border border-surface-700 rounded-lg px-3 py-2.5 text-surface-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 outline-none transition-all placeholder:text-surface-600"
                                        placeholder="Board title"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        autoFocus
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-surface-400 uppercase tracking-wider mb-1.5">Description <span className="text-surface-600 normal-case tracking-normal">(optional)</span></label>
                                    <textarea
                                        className="w-full bg-surface-950 border border-surface-700 rounded-lg px-3 py-2.5 text-surface-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 outline-none transition-all placeholder:text-surface-600 resize-none h-24"
                                        placeholder="What is this board for?"
                                        value={desc}
                                        onChange={(e) => setDesc(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="submit" disabled={createBoard.isPending} className="btn-primary w-full py-2.5">
                                        {createBoard.isPending ? 'Creating...' : 'Create Board'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Board Grid */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                    </div>
                ) : boards && boards.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {boards.map((board) => (
                            <Link
                                key={board.id}
                                to={`/board/${board.id}`}
                                className="group bg-surface-900/40 border border-surface-800/60 hover:border-primary-500/30 rounded-2xl p-5 hover:bg-surface-800/40 transition-all duration-300 hover:shadow-xl hover:shadow-black/20 hover:-translate-y-1 relative overflow-hidden"
                            >
                                <div className="flex flex-col h-full">
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="font-semibold text-base text-surface-200 group-hover:text-primary-400 transition-colors line-clamp-1 pr-2">
                                            {board.title}
                                        </h3>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                useUIStore.getState().showConfirm({
                                                    title: 'Delete Board',
                                                    message: `Are you sure you want to delete "${board.title}"? This action cannot be undone.`,
                                                    confirmText: 'Delete',
                                                    onConfirm: () => deleteBoard.mutate(board.id),
                                                });
                                            }}
                                            className="text-surface-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all p-1 -mr-2 -mt-2"
                                            title="Delete Board"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    <p className="text-sm text-surface-500 line-clamp-2 mb-6 flex-1 min-h-[2.5rem]">
                                        {board.description || "No description provided."}
                                    </p>

                                    <div className="flex items-center justify-between border-t border-surface-800/50 pt-3 mt-auto">
                                        <div className="flex items-center gap-1.5 text-xs text-surface-400">
                                            <Users size={12} />
                                            <span>{board.members.length}</span>
                                        </div>
                                        <div className="text-xs font-medium text-surface-500 bg-surface-800/50 px-2 py-0.5 rounded-full">
                                            {board._count?.lists || 0} lists
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-24 bg-surface-900/20 border border-surface-800/50 rounded-2xl border-dashed">
                        <div className="w-16 h-16 bg-surface-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <LayoutDashboard className="text-surface-500" size={24} />
                        </div>
                        <h3 className="text-lg font-medium text-surface-200 mb-2">No boards yet</h3>
                        <p className="text-surface-500 mb-6 max-w-xs mx-auto">Create your first board to start organizing your tasks and collaborating with your team.</p>
                        <button onClick={() => setShowCreate(true)} className="btn-primary inline-flex items-center gap-2">
                            <Plus size={18} />
                            Create Board
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
