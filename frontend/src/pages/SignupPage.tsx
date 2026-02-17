import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSignup } from '../api/hooks';
import { useAuthStore } from '../stores/authStore';
import { UserPlus, Eye, EyeOff, Zap } from 'lucide-react';

export default function SignupPage() {
    const navigate = useNavigate();
    const signup = useSignup();
    // const setAuth = useAuthStore((s) => s.setAuth); // Not needed anymore
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            await signup.mutateAsync({ name, email, password });
            // Don't auto-login. Redirect to login page instead.
            navigate('/login', { state: { message: 'Account created! Please sign in.' } });
        } catch (err: any) {
            setError(err.response?.data?.message || 'Signup failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-surface-950 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary-900/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary-800/10 rounded-full blur-[100px]" />
            </div>

            <div className="w-full max-w-md animate-fade-in z-10">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-600/30">
                            <Zap className="w-5 h-5 text-white fill-current" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-surface-50 tracking-tight mb-2">Create an account</h1>
                    <p className="text-surface-400 text-sm">Start managing your tasks effectively</p>
                </div>

                <div className="bg-surface-900/50 backdrop-blur-xl border border-surface-800 rounded-2xl p-8 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-danger-500/10 border border-danger-500/20 text-danger-400 px-4 py-3 rounded-lg text-xs font-medium animate-slide-up">
                                {error}
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-surface-400 uppercase tracking-wider">Full Name</label>
                            <input
                                type="text"
                                className="w-full bg-surface-950 border border-surface-700/50 rounded-lg px-3 py-2.5 text-surface-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 outline-none transition-all placeholder:text-surface-600"
                                placeholder="Your name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-surface-400 uppercase tracking-wider">Email</label>
                            <input
                                type="email"
                                className="w-full bg-surface-950 border border-surface-700/50 rounded-lg px-3 py-2.5 text-surface-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 outline-none transition-all placeholder:text-surface-600"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="block text-xs font-medium text-surface-400 uppercase tracking-wider">Password</label>
                            </div>
                            <div className="relative">
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    className="w-full bg-surface-950 border border-surface-700/50 rounded-lg px-3 py-2.5 pr-10 text-surface-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 outline-none transition-all placeholder:text-surface-600"
                                    placeholder="Min 8 characters"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    minLength={8}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(!showPw)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300"
                                >
                                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={signup.isPending}
                            className="btn-primary w-full py-2.5 font-semibold text-sm shadow-lg shadow-primary-900/20 hover:shadow-primary-900/40"
                        >
                            {signup.isPending ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                "Create Account"
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-surface-400 text-sm mt-8">
                    Already have an account?{' '}
                    <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
