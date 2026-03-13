import { Settings, Search, Loader2, ChevronRight, AlertCircle, Clock } from 'lucide-react';
import { useState } from 'react';
import { useCollections } from '../hooks/useCollections.ts';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../lib/format.ts';

export default function Cobranza() {
    const [view, setView] = useState<'today' | 'overdue' | 'upcoming'>('today');
    const { todayCollections, overdueCollections, loading, error, refresh } = useCollections();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');

    const getUpcomingCollections = () => {
        // Mock logic for upcoming if not in hook yet, but hook only has today and overdue
        return [];
    };

    const currentList = view === 'today'
        ? todayCollections
        : view === 'overdue'
            ? overdueCollections
            : getUpcomingCollections();

    const filteredList = currentList.filter(item => {
        const clientName = `${(item as any).clients?.first_name} ${(item as any).clients?.last_name}`.toLowerCase();
        return clientName.includes(searchTerm.toLowerCase());
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-brand-primary" size={40} />
                <p className="text-gray-500 mt-4 font-medium italic">Cargando cobranzas...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-gray-50 pb-24 font-sans text-gray-900">
            {/* Top Bar */}
            <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm">
                <h1 className="text-xl font-bold text-gray-800">Cobros</h1>
                <button className="p-2 text-gray-500 hover:text-brand-primary transition-colors">
                    <Settings className="h-6 w-6" />
                </button>
            </header>

            <main className="flex-grow flex flex-col">
                {/* Search Bar */}
                <div className="px-4 py-4 bg-white shadow-sm">
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            <Search className="h-5 w-5 text-gray-400" />
                        </span>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:ring-brand-primary focus:border-brand-primary text-sm transition-all"
                            placeholder="Buscar por cliente..."
                        />
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="bg-white px-4 border-b border-gray-100 sticky top-[61px] z-20 overflow-x-auto no-scrollbar">
                    <div className="flex space-x-8 min-w-max">
                        {/* Tab Hoy */}
                        <button
                            onClick={() => setView('today')}
                            className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors ${view === 'today' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Hoy <span className="ml-1 opacity-70">({todayCollections.length})</span>
                        </button>
                        {/* Tab Mora */}
                        <button
                            onClick={() => setView('overdue')}
                            className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors ${view === 'overdue' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Mora <span className="ml-1 opacity-70">({overdueCollections.length})</span>
                        </button>
                        {/* Tab Próximos */}
                        <button
                            onClick={() => setView('upcoming')}
                            className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors ${view === 'upcoming' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Próximos
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 flex items-center gap-3">
                            <AlertCircle size={20} />
                            <p className="text-sm font-medium">{error}</p>
                            <button onClick={refresh} className="ml-auto text-xs font-bold uppercase underline">Reintentar</button>
                        </div>
                    )}

                    {filteredList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
                            <Clock size={48} className="mb-3 opacity-20" />
                            <p className="text-sm font-medium">No hay cobros {view === 'today' ? 'para hoy' : view === 'overdue' ? 'en mora' : 'programados'}</p>
                        </div>
                    ) : (
                        filteredList.map((loan) => {
                            const isOverdue = view === 'overdue';
                            const client = (loan as any).clients;
                            const cuota = Math.round(loan.total_expected / loan.term_count);

                            return (
                                <article
                                    key={loan.id}
                                    onClick={() => navigate(`/clientes/${client?.id}`)}
                                    className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3 active:scale-[0.98] transition-transform cursor-pointer"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${isOverdue ? 'bg-blue-100 text-brand-secondary' : 'bg-brand-primary/10 text-brand-primary'}`}>
                                                {client?.first_name?.[0].toUpperCase()}{client?.last_name?.[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-800">{client?.first_name} {client?.last_name}</h3>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">ID: #{loan.id.slice(0, 4)}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {isOverdue ? 'En mora' : 'Cobrar hoy'}
                                            </span>
                                            {isOverdue && (
                                                <span className="text-[10px] font-bold text-red-600 mt-1 italic">
                                                    {Math.floor((new Date().getTime() - new Date(loan.next_due_date).getTime()) / (1000 * 3600 * 24))}d retraso
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-end pt-2">
                                        <div>
                                            <p className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Monto Cuota</p>
                                            <p className="text-xl font-bold text-gray-900">{formatCurrency(cuota)}</p>
                                            <p className="text-[10px] text-gray-500 font-medium">Saldo: <span className="font-bold">{formatCurrency(loan.balance)}</span></p>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); navigate(`/clientes/${client?.id}`); }}
                                            className="bg-brand-primary hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm active:scale-95 transition-all flex items-center gap-2"
                                        >
                                            Registrar pago
                                            <ChevronRight size={14} />
                                        </button>
                                    </div>
                                </article>
                            )
                        })
                    )}

                    {filteredList.length > 0 && (
                        <p className="text-center text-gray-400 text-[10px] font-bold uppercase tracking-widest py-4">Has llegado al final</p>
                    )}
                </div>
            </main>
        </div>
    );
}
