import { useState } from 'react';
import { supabase } from '../lib/supabase.ts';
import { Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center p-6 font-sans">
            <div className="max-w-md w-full mx-auto space-y-8">
                {/* Logo & Header */}
                <div className="text-center">
                    <div className="mx-auto w-20 h-20 bg-brand-deepBlue rounded-[2rem] flex items-center justify-center shadow-lg shadow-blue-900/20 mb-6">
                        <Lock className="text-white" size={32} />
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight italic">PRESTAMOS</h1>
                    <p className="text-gray-400 font-medium text-sm mt-2">Gestión de cartera premium</p>
                </div>

                {/* Login Form */}
                <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold border border-red-100">
                                <AlertCircle size={20} />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail size={18} className="text-gray-300 group-focus-within:text-brand-accent transition-colors" />
                                    </div>
                                    <input
                                        type="email"
                                        id="login-email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full h-14 pl-12 pr-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-accent transition-all font-bold text-gray-900 placeholder:text-gray-300"
                                        placeholder="tu@email.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contraseña</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock size={18} className="text-gray-300 group-focus-within:text-brand-accent transition-colors" />
                                    </div>
                                    <input
                                        type="password"
                                        id="login-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full h-14 pl-12 pr-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-accent transition-all font-bold text-gray-900 placeholder:text-gray-300"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-2 space-y-3">
                            <button
                                type="submit"
                                disabled={loading}
                                id="btn-login"
                                className="w-full h-16 bg-brand-deepBlue hover:bg-blue-900 text-white font-black rounded-2xl shadow-lg shadow-blue-900/20 active:scale-95 transition-all text-lg flex items-center justify-center gap-3"
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin" size={24} />
                                ) : (
                                    <span>Iniciar Sesión</span>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/register')}
                                disabled={loading}
                                id="btn-goto-register"
                                className="w-full h-14 bg-transparent text-gray-400 font-bold rounded-2xl hover:bg-gray-50 active:scale-95 transition-all text-sm"
                            >
                                ¿No tienes cuenta? Regístrate
                            </button>
                        </div>
                    </form>
                </div>

                <div className="text-center">
                    <p className="text-[10px] text-gray-300 font-black uppercase tracking-[0.2em]">v.2.0.0 Premium</p>
                </div>
            </div>
        </div>
    );
}
