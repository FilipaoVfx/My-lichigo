import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, User, Loader2, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Register() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const validateForm = () => {
        if (!fullName.trim()) return "El nombre completo es requerido.";
        if (!email.includes('@')) return "Email inválido.";
        if (password.length < 6) return "La contraseña debe tener al menos 6 caracteres.";
        if (password !== confirmPassword) return "Las contraseñas no coinciden.";
        return null;
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        setLoading(true);
        setError(null);

        const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    role: 'collector' // Default role for public registration
                }
            }
        });

        if (signUpError) {
            setError(signUpError.message);
            setLoading(false);
        } else {
            setSuccess(true);
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col justify-center p-6 font-sans">
                <div className="max-w-md w-full mx-auto text-center space-y-6">
                    <div className="mx-auto w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4 animate-bounce">
                        <CheckCircle2 size={48} />
                    </div>
                    <h1 className="text-3xl font-black text-gray-900">¡Registro Exitoso!</h1>
                    <p className="text-gray-600 font-medium">
                        Hemos enviado un correo de confirmación a <span className="font-bold text-gray-900">{email}</span>. 
                        Por favor verifica tu bandeja de entrada.
                    </p>
                    <button
                        onClick={() => navigate('/login')}
                        className="w-full h-16 bg-brand-deepBlue hover:bg-blue-900 text-white font-black rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                        <ArrowLeft size={20} />
                        Volver al Inicio
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center p-6 font-sans">
            <div className="max-w-md w-full mx-auto space-y-8">
                {/* Header */}
                <div className="text-center">
                    <button 
                        onClick={() => navigate('/login')}
                        className="mb-8 p-3 rounded-2xl hover:bg-white text-gray-400 hover:text-brand-deepBlue transition-all border border-transparent hover:border-gray-100 group"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight italic">NUEVA CUENTA</h1>
                    <p className="text-gray-400 font-medium text-sm mt-2">Únete a la gestión de cartera premium</p>
                </div>

                {/* Register Form */}
                <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
                    <form onSubmit={handleRegister} className="space-y-6" id="register-form">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold border border-red-100 animate-shake" role="alert" id="register-error">
                                <AlertCircle size={20} />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="space-y-4">
                            {/* Full Name */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <User size={18} className="text-gray-300 group-focus-within:text-brand-accent transition-colors" />
                                    </div>
                                    <input
                                        id="full-name"
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full h-14 pl-12 pr-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-accent transition-all font-bold text-gray-900 placeholder:text-gray-300"
                                        placeholder="Ej: Juan Pérez"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail size={18} className="text-gray-300 group-focus-within:text-brand-accent transition-colors" />
                                    </div>
                                    <input
                                        id="register-email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full h-14 pl-12 pr-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-accent transition-all font-bold text-gray-900 placeholder:text-gray-300"
                                        placeholder="tu@email.com"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contraseña</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock size={18} className="text-gray-300 group-focus-within:text-brand-accent transition-colors" />
                                    </div>
                                    <input
                                        id="register-password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full h-14 pl-12 pr-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-accent transition-all font-bold text-gray-900 placeholder:text-gray-300"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirmar Contraseña</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock size={18} className="text-gray-300 group-focus-within:text-brand-accent transition-colors" />
                                    </div>
                                    <input
                                        id="confirm-password"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full h-14 pl-12 pr-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-accent transition-all font-bold text-gray-900 placeholder:text-gray-300"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                id="btn-register"
                                className="w-full h-16 bg-brand-deepBlue hover:bg-blue-900 text-white font-black rounded-2xl shadow-lg shadow-blue-900/20 active:scale-95 transition-all text-lg flex items-center justify-center gap-3"
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin" size={24} />
                                ) : (
                                    <span>Crear Cuenta</span>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="text-center pb-8">
                    <p className="text-sm text-gray-400 font-medium">
                        ¿Ya tienes cuenta?{' '}
                        <button 
                            onClick={() => navigate('/login')}
                            className="text-brand-deepBlue font-black hover:underline"
                        >
                            Inicia Sesión
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
