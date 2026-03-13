import { CalendarDays, Loader2, User, UserPlus, FilePlus, DollarSign, ChevronRight, AlertTriangle, LogOut } from 'lucide-react';
import { useDashboardData } from '../hooks/useDashboardData.ts';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.ts';
import { formatCurrency } from '../lib/format.ts';

export default function Dashboard() {
    const { stats, collectionsToday, loading, error, refresh } = useDashboardData();
    const { signOut } = useAuth();
    const navigate = useNavigate();

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-brand-accent" size={40} />
                <p className="text-gray-500 mt-4 font-medium italic">Sincronizando cartera...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4">
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl text-center">
                    <p className="text-red-800 font-semibold text-sm">Error al cargar el tablero: {error}</p>
                    <button className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md active:scale-95 transition-transform" onClick={refresh}>Reintentar</button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-background min-h-screen pb-24 transition-colors duration-300">
            {/* TopBar */}
            <header className="sticky top-0 z-50 bg-surface border-b border-border-main px-4 py-3 flex justify-between items-center shadow-sm">
                <h1 className="text-2xl font-black text-brand-deepBlue italic tracking-tighter">PRESTAMOS</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => navigate('/reportes')}
                        aria-label="Reportes"
                        className="w-10 h-10 flex items-center justify-center rounded-2xl bg-background touch-target active:bg-gray-100 transition-all shadow-sm border border-border-main"
                    >
                        <User size={18} className="text-gray-400" />
                    </button>
                    <button
                        onClick={() => signOut()}
                        aria-label="Cerrar sesión"
                        className="w-10 h-10 flex items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/20 touch-target active:scale-90 transition-all border border-red-100 dark:border-red-900/40"
                    >
                        <LogOut size={18} className="text-red-500" />
                    </button>
                </div>
            </header>

            <main className="p-4 space-y-6">
                {/* SummaryCard */}
                <section className="bg-brand-deepBlue rounded-2xl p-6 text-white shadow-lg">
                    <div className="mb-4">
                        <p className="text-xs opacity-80 uppercase tracking-wide font-semibold mb-1">Cartera Activa Total</p>
                        <p className="text-3xl font-bold tracking-tight">{formatCurrency(stats.activePortfolio)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-4">
                        <div>
                            <p className="text-[10px] opacity-80 uppercase font-bold mb-1">Clientes en Mora</p>
                            <p className="text-xl font-bold text-red-300">{stats.overdueCount}</p>
                        </div>
                        <div>
                            <p className="text-[10px] opacity-80 uppercase font-bold mb-1">Cobros Hoy</p>
                            <p className="text-xl font-bold text-green-300">{collectionsToday.length}</p>
                        </div>
                    </div>
                </section>

                {/* MainAction */}
                <section>
                    <button
                        onClick={() => navigate('/cobranza')}
                        className="w-full bg-brand-profGreen hover:bg-green-800 text-white font-bold py-4 rounded-xl shadow-md transition-transform active:scale-95 text-lg touch-target flex items-center justify-center gap-2"
                    >
                        Ver Cobros de Hoy
                    </button>
                </section>

                {/* QuickActions */}
                <section>
                    <h2 className="text-lg font-bold mb-3 text-text-main">Acciones Rápidas</h2>
                    <div className="grid grid-cols-3 gap-3">
                        {/* Add Client */}
                        <button
                            onClick={() => navigate('/clientes')} // Assuming adding client is via clients page or we can add a modal later
                            className="flex flex-col items-center justify-center bg-surface border border-border-main p-4 rounded-xl shadow-sm touch-target active:bg-gray-50 transition-colors"
                        >
                            <UserPlus size={24} className="mb-1 text-brand-accent" />
                            <span className="text-[10px] font-bold text-text-main uppercase">Cliente</span>
                        </button>
                        {/* Add Loan */}
                        <button
                            onClick={() => navigate('/nuevo-prestamo')}
                            className="flex flex-col items-center justify-center bg-surface border border-border-main p-4 rounded-xl shadow-sm touch-target active:bg-gray-50 transition-colors"
                        >
                            <FilePlus size={24} className="mb-1 text-brand-accent" />
                            <span className="text-[10px] font-bold text-text-main uppercase">Préstamo</span>
                        </button>
                        {/* Add Payment */}
                        <button
                            onClick={() => navigate('/cobranza')}
                            className="flex flex-col items-center justify-center bg-white border border-gray-100 p-4 rounded-xl shadow-sm touch-target active:bg-gray-50 transition-colors"
                        >
                            <DollarSign size={24} className="mb-1 text-brand-accent" />
                            <span className="text-[10px] font-bold text-gray-800 uppercase">Pago</span>
                        </button>
                    </div>
                </section>

                {/* AlertsSection */}
                {stats.overdueCount > 0 && (
                    <section>
                        <h2 className="text-lg font-bold mb-3 text-gray-700">Alertas</h2>
                        <div className="space-y-3">
                            {/* Mora Alert */}
                            <div
                                onClick={() => navigate('/cobranza')}
                                className="flex items-center bg-white p-4 rounded-xl border-l-4 border-red-500 shadow-sm active:bg-gray-50 cursor-pointer"
                            >
                                <div className="mr-4 text-red-500">
                                    <AlertTriangle size={24} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-gray-800">{stats.overdueCount} Préstamos en Mora</p>
                                    <p className="text-xs text-red-600 font-medium">Total: {formatCurrency(stats.overdueAmount)}</p>
                                </div>
                                <ChevronRight size={18} className="text-gray-300" />
                            </div>
                        </div>
                    </section>
                )}

                {/* Recent Collections Feed (Added based on current app features but styled like alerts) */}
                <section>
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-lg font-bold text-gray-700">Próximos Cobros</h2>
                        <span className="text-xs font-bold text-brand-accent bg-blue-50 px-2 py-1 rounded-full">{collectionsToday.length}</span>
                    </div>
                    <div className="space-y-3">
                        {collectionsToday.length === 0 ? (
                            <div className="bg-white rounded-xl p-8 text-center border border-gray-100 shadow-sm">
                                <CalendarDays className="mx-auto text-gray-300 mb-2" size={40} />
                                <p className="text-gray-400 text-sm font-medium">No hay cobros hoy</p>
                            </div>
                        ) : (
                            collectionsToday.map((loan) => (
                                <div
                                    key={loan.id}
                                    onClick={() => navigate(`/clientes/${loan.clients?.id}`)}
                                    className="flex items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm active:bg-gray-50 cursor-pointer"
                                >
                                    <div className="w-10 h-10 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent mr-4 font-bold">
                                        {loan.clients?.first_name?.[0].toUpperCase()}{loan.clients?.last_name?.[0].toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-gray-800">{loan.clients?.first_name} {loan.clients?.last_name}</p>
                                        <p className="text-xs text-gray-500">Cuota: {formatCurrency(loan.total_expected / loan.term_count)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-brand-primary">{formatCurrency(loan.total_expected / loan.term_count)}</p>
                                        <span className="text-[10px] font-bold text-amber-600 uppercase">Hoy</span>
                                    </div>
                                </div>
                            ))
                        )}
                        <button
                            className="w-full text-center py-2 text-sm font-bold text-gray-400 active:text-brand-accent transition-colors"
                            onClick={refresh}
                        >
                            Actualizar Cartera
                        </button>
                    </div>
                </section>
            </main>
        </div>
    );
}


