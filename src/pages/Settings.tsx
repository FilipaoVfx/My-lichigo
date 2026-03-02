import React, { useState, useEffect } from 'react';
import { Moon, Sun, Bell, Shield, ChevronRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SettingsItem {
    id: string;
    name: string;
    icon: React.ReactNode;
    type: 'toggle' | 'link';
    value?: boolean;
    action?: () => void;
}

interface SettingsSection {
    title: string;
    items: SettingsItem[];
}

export default function Settings() {
    const navigate = useNavigate();
    const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(
        (localStorage.getItem('theme') as any) || 'system'
    );

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

    const settingsOptions: SettingsSection[] = [
        {
            title: 'Apariencia',
            items: [
                {
                    id: 'theme',
                    name: 'Modo Oscuro',
                    icon: theme === 'dark' ? <Moon size={20} className="text-blue-500" /> : <Sun size={20} className="text-orange-500" />,
                    type: 'toggle',
                    value: theme === 'dark',
                    action: () => setTheme(theme === 'dark' ? 'light' : 'dark')
                }
            ]
        },
        {
            title: 'Notificaciones',
            items: [
                { id: 'reminders', name: 'Recordatorios de cobro', icon: <Bell size={20} className="text-purple-500" />, type: 'link' },
            ]
        },
        {
            title: 'Seguridad',
            items: [
                { id: 'privacy', name: 'Privacidad y datos', icon: <Shield size={20} className="text-green-500" />, type: 'link' },
            ]
        }
    ];

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
                {settingsOptions.map((section, idx) => (
                    <section key={idx} className="space-y-3">
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{section.title}</h2>
                        <div className="bg-[var(--surface)] rounded-[2rem] border border-[var(--border)] overflow-hidden shadow-sm">
                            {section.items.map((item, itemIdx) => (
                                <div
                                    key={item.id}
                                    onClick={item.type === 'toggle' ? item.action : undefined}
                                    className={`flex items-center justify-between p-4 px-6 active:bg-gray-50 dark:active:bg-slate-800 transition-colors cursor-pointer ${itemIdx !== section.items.length - 1 ? 'border-b border-[var(--border)]' : ''}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
                                            {item.icon}
                                        </div>
                                        <span className="font-bold text-sm tracking-tight">{item.name}</span>
                                    </div>

                                    {item.type === 'toggle' ? (
                                        <div className={`w-12 h-6 rounded-full transition-all duration-300 flex items-center px-1 ${item.value ? 'bg-brand-accent' : 'bg-gray-200 dark:bg-slate-700'}`}>
                                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${item.value ? 'translate-x-6' : 'translate-x-0'}`} />
                                        </div>
                                    ) : (
                                        <ChevronRight size={18} className="text-gray-300" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                ))}

                <div className="pt-8 text-center">
                    <p className="text-[10px] text-gray-300 font-black uppercase tracking-[0.2em]">v.2.0.0 Premium</p>
                    <p className="text-[8px] text-gray-400 mt-1 uppercase font-bold">Hecho con ❤️ para My Lichigo</p>
                </div>
            </main>
        </div>
    );
}
