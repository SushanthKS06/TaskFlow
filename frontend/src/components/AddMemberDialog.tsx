import { useState } from 'react';
import { useSearchUsers, useAddBoardMember } from '../api/hooks';
import type { BoardMember, User } from '../types';
import { UserPlus, X, Search, Loader2, Check } from 'lucide-react';

interface Props {
    boardId: string;
    existingMembers: BoardMember[];
    onClose: () => void;
}

export default function AddMemberDialog({ boardId, existingMembers, onClose }: Props) {
    const [search, setSearch] = useState('');
    const { data: users, isLoading } = useSearchUsers(search);
    const addMember = useAddBoardMember();

    const existingIds = new Set(existingMembers.map((m) => m.userId));

    const handleAdd = async (user: User) => {
        await addMember.mutateAsync({ boardId, userId: user.id });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Dialog */}
            <div className="relative bg-surface-900 rounded-2xl border border-surface-700 shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-surface-800">
                    <div className="flex items-center gap-2">
                        <UserPlus size={18} className="text-primary-400" />
                        <h2 className="font-semibold text-surface-100">Add Member</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
                        <input
                            type="text"
                            className="w-full bg-surface-950 border border-surface-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-surface-200 focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/30 outline-none transition-all placeholder:text-surface-600"
                            placeholder="Search by name or email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                {/* Results */}
                <div className="px-2 pb-2 max-h-64 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-surface-700 scrollbar-track-transparent">
                    {isLoading && (
                        <div className="flex justify-center py-4">
                            <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
                        </div>
                    )}

                    {!isLoading && search.length >= 2 && (!users || users.length === 0) && (
                        <p className="text-sm text-surface-500 text-center py-8">No users found</p>
                    )}

                    {search.length < 2 && (
                        <p className="text-sm text-surface-500 text-center py-8">Type at least 2 characters to search</p>
                    )}

                    {users?.map((user: User) => {
                        const alreadyMember = existingIds.has(user.id);
                        return (
                            <div
                                key={user.id}
                                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-800/50 transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary-600/20 border border-primary-500/20 flex items-center justify-center text-xs font-bold text-primary-400">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-surface-200 group-hover:text-surface-100 transition-colors">{user.name}</p>
                                        <p className="text-xs text-surface-500 group-hover:text-surface-400 transition-colors">{user.email}</p>
                                    </div>
                                </div>

                                {alreadyMember ? (
                                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                                        <Check size={12} /> Member
                                    </span>
                                ) : (
                                    <button
                                        onClick={() => handleAdd(user)}
                                        disabled={addMember.isPending}
                                        className="text-xs font-medium px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-primary-600 text-surface-300 hover:text-white transition-all disabled:opacity-50"
                                    >
                                        {addMember.isPending ? 'Adding...' : 'Add'}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
