import React, { useState, useEffect } from 'react';
import { Moon, Sun, Bell, Shield, ChevronRight, ArrowLeft, RefreshCw, Send, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useAuth } from '../hooks/useAuth';

export default function Settings() {
    const navigate = useNavigate();
    const { session } = useAuth();
    const { 
        permission, 
        isSubscribed, 
        isSyncing, 
        requestPermission, 
        triggerTest 
    } = usePushNotifications(session?.user?.id);

    const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(
        (localStorage.getItem('theme') as any) || 'system'
    );

    const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);

    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            root.classList.toggle('dark', systemTheme === 'dark');
            localStorage.removeItem('theme');
        } else {
            root.classList.toggle('dark', theme === 'dark');
            localStorage.setItem('theme', theme);
        }
    }, [theme]);

    const handleTestPush = async () => {
        setTestResult(null);
        const res = await triggerTest();
        setTestResult(res);
        if (res.success) {
            setTimeout(() => setTestResult(null), 5000);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--background)] pb-24 font-sans text-[var(--text)] transition-colors duration-300">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[var(--surface)] border-b border-[var(--border)] px-4 py-3 flex items-center gap-4 shadow-sm">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 text-gray-400 hover:text-brand-accent transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-bold tracking-tight">Ajustes</h1>
            </header>

            <main className="p-4 space-y-8 max-w-lg mx-auto">
                {/* Apariencia */}
                <section className="space-y-3">
                    <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Apariencia</h2>
                    <div className="bg-[var(--surface)] rounded-[2rem] border border-[var(--border)] overflow-hidden shadow-sm">
                        <div
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="flex items-center justify-between p-4 px-6 active:bg-gray-50 dark:active:bg-slate-800 transition-colors cursor-pointer"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
                                    {theme === 'dark' ? <Moon size={20} className="text-blue-500" /> : <Sun size={20} className="text-orange-500" />}
                                </div>
                                <span className="font-bold text-sm tracking-tight">Modo Oscuro</span>
                            </div>
                            <div className={`w-12 h-6 rounded-full transition-all duration-300 flex items-center px-1 ${theme === 'dark' ? 'bg-brand-accent' : 'bg-gray-200 dark:bg-slate-700'}`}>
                                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`} />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Notificaciones */}
                <section className="space-y-3">
                    <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Notificaciones</h2>
                    <div className="bg-[var(--surface)] rounded-[2.5rem] border border-[var(--border)] p-6 shadow-sm space-y-6">
                        
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-500">
                                    <Bell size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm tracking-tight">Estado del Sistema</h3>
                                    <p className="text-[10px] text-gray-400 font-medium">
                                        {permission === 'granted' 
                                            ? (isSubscribed ? '✅ Suscrito y activo' : '⚠️ Permiso dado, falta suscripción') 
                                            : '❌ Notificaciones desactivadas'}
                                    </p>
                                </div>
                            </div>
                            {permission !== 'granted' ? (
                                <button 
                                    onClick={() => requestPermission()}
                                    className="px-4 py-2 bg-brand-accent text-white text-xs font-black rounded-xl hover:opacity-90 transition-all shadow-lg shadow-brand-accent/20"
                                >
                                    ACTIVAR
                                </button>
                            ) : (
                                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                    <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                                </div>
                            )}
                        </div>

                        {permission === 'granted' && (
                            <div className="pt-4 border-t border-[var(--border)]">
                                <button
                                    onClick={handleTestPush}
                                    disabled={isSyncing}
                                    className={`w-full flex items-center justify-center gap-3 p-4 rounded-2xl font-black text-xs tracking-widest uppercase transition-all ${
                                        isSyncing 
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                        : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                                    }`}
                                >
                                    {isSyncing ? (
                                        <>
                                            <RefreshCw size={16} className="animate-spin" />
                                            Sincronizando...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={16} />
                                            Probar Notificación Real
                                        </>
                                    )}
                                </button>
                                
                                {testResult && (
                                    <div className={`mt-4 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
                                        testResult.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                                    }`}>
                                        {testResult.success ? <RefreshCw size={16} /> : <AlertCircle size={16} />}
                                        <p className="text-[10px] font-bold uppercase tracking-tight">
                                            {testResult.success ? 'Señal enviada al motor con éxito. Revisa el celular.' : `Error: ${testResult.message}`}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        <p className="text-[9px] text-gray-400 leading-relaxed bg-gray-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-dashed border-gray-100 dark:border-slate-800">
                            <strong>Tip:</strong> Si el botón de arriba falla, intenta cerrar la pestaña y volver a entrar. En iPhone es obligatorio usar "Añadir a pantalla de inicio".
                        </p>
                    </div>
                </section>

                {/* Seguridad */}
                <section className="space-y-3">
                    <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Seguridad</h2>
                    <div className="bg-[var(--surface)] rounded-[2rem] border border-[var(--border)] overflow-hidden shadow-sm">
                        <div className="flex items-center justify-between p-4 px-6 active:bg-gray-50 dark:active:bg-slate-800 transition-colors cursor-pointer">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
                                    <Shield size={20} className="text-green-500" />
                                </div>
                                <span className="font-bold text-sm tracking-tight">Privacidad y datos</span>
                            </div>
                            <ChevronRight size={18} className="text-gray-300" />
                        </div>
                    </div>
                </section>

                <div className="pt-8 text-center text-[var(--text-muted)] opacity-50">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">v.2.1.0 Anti-Friction</p>
                    <p className="text-[8px] mt-1 uppercase font-bold">Hecho con ❤️ para My Lichigo</p>
                </div>
            </main>
        </div>
    );
}

