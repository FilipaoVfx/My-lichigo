import { useEffect, useState } from 'react';
import { useTimeline } from '../hooks/useTimeline.ts';
import { Clock, Ban, DollarSign, MessageSquare, User, Loader2, RefreshCw } from 'lucide-react';

export default function LoanTimeline({ loanId, onPaymentVoided }: { loanId: string, onPaymentVoided: () => void }) {
    const { timeline, loading, error, fetchTimeline, voidPayment } = useTimeline(loanId);
    const [refreshing, setRefreshing] = useState(false);

    // Refresh initially
    useEffect(() => {
        fetchTimeline();
    }, [fetchTimeline]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchTimeline();
        setRefreshing(false);
    };

    const handleVoid = async (paymentId: string) => {
        if (window.confirm('¿Anular este pago? Esta acción mantendrá el registro pero revertirá el saldo.')) {
            const { error } = await voidPayment(paymentId);
            if (!error) {
                onPaymentVoided(); // refresh loan data in parent
            } else {
                alert(`Error al anular: ${error}`);
            }
        }
    };

    if (loading && timeline.length === 0) {
        return (
            <div className="flex justify-center p-6 mt-6">
                <Loader2 className="animate-spin text-gray-400" size={24} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center p-6 text-red-400 text-sm bg-red-50 rounded-xl mt-6">
                Hubo un error al cargar la bitácora: {error}
            </div>
        );
    }

    return (
        <div className="mt-6 border-t border-border-main pt-6 animate-in fade-in slide-in-from-bottom-2 duration-300 relative z-0">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                    <Clock size={16} /> Bitácora del Préstamo
                </h3>
                <button onClick={handleRefresh} className="p-1.5 text-gray-400 hover:text-brand-accent transition-colors">
                    <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                </button>
            </div>

            {timeline.length === 0 && (
                <div className="text-center p-6 text-gray-400 text-sm font-medium">
                    No hay actividad registrada aún.
                </div>
            )}

            <div className="relative border-l-2 border-dashed border-gray-200 ml-4 pl-6 space-y-6">
                {timeline.map((item, index) => {
                    const isPayment = item.entry_type === 'payment';
                    const isVoid = item.is_void;

                    return (
                        <div key={item.id + index} className="relative">
                            <div className={`absolute -left-[35px] top-1 w-8 h-8 rounded-full flex items-center justify-center border-4 border-surface shadow-sm ${!isPayment ? 'bg-amber-100 text-amber-600' :
                                    isVoid ? 'bg-red-100 text-red-500' : 'bg-brand-primary/10 text-brand-primary'
                                }`}>
                                {isPayment ? <DollarSign size={14} /> : <MessageSquare size={14} />}
                            </div>

                            <div className={`p-4 rounded-2xl border ${isVoid ? 'bg-gray-50 border-gray-100 opacity-75' : 'bg-white border-gray-100 shadow-sm'} flex flex-col gap-2`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${!isPayment ? 'bg-amber-50 text-amber-700' :
                                                    isVoid ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                                                }`}>
                                                {!isPayment ? 'Observación' : isVoid ? 'Anulado' : 'Pago'}
                                            </span>
                                            <span className="text-[10px] font-bold text-gray-400">
                                                {new Date(item.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                            </span>
                                        </div>
                                        {isPayment && (
                                            <h4 className={`text-lg font-black ${isVoid ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                                +${Math.round(item.amount).toLocaleString()}
                                            </h4>
                                        )}
                                    </div>
                                    {isPayment && !isVoid && (
                                        <button
                                            onClick={() => handleVoid(item.id)}
                                            className="text-gray-300 hover:text-red-500 transition-colors p-2 -mr-2 bg-gray-50 rounded-lg"
                                            title="Anular pago"
                                        >
                                            <Ban size={16} />
                                        </button>
                                    )}
                                </div>

                                {item.content && (
                                    <div className="p-3 bg-gray-50 rounded-xl mt-1 border border-gray-100">
                                        <p className="text-sm text-gray-600 font-medium italic leading-relaxed">"{item.content}"</p>
                                    </div>
                                )}

                                <div className="flex items-center justify-between mt-2 pt-3 border-t border-gray-50">
                                    <div className="flex items-center gap-1.5 text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                                        <User size={12} />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">{item.created_by_name || 'Admin'}</span>
                                    </div>
                                    {isPayment && item.balance_after !== null && !isVoid && (
                                        <div className="text-right flex items-center gap-2">
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Saldo Remanente</span>
                                            <span className="text-sm font-black text-brand-accent bg-blue-50 px-2 py-1 rounded-md">${Math.round(item.balance_after).toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
