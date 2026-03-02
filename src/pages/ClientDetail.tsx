import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.ts';
import { ArrowLeft, Plus, DollarSign, Calendar, Clock, Wallet, Percent, Trash2, StickyNote, Smartphone, ChevronDown, CheckCircle2, Loader2 } from 'lucide-react';
import { useLoans } from '../hooks/useLoans.ts';
import { usePayments } from '../hooks/usePayments.ts';
import { useClients } from '../hooks/useClients.ts';
import type { Client } from '../types/client.ts';
import type { Loan } from '../types/loan.ts';

export default function ClientDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [client, setClient] = useState<Client | null>(null);
    const [loadingClient, setLoadingClient] = useState(true);

    const { loans, loading: loadingLoans, addLoan, fetchLoans, updateLoanNotes, deleteLoan } = useLoans(id || '');
    const { clients, deleteClient } = useClients(); // For the picker
    const { addPayment } = usePayments();

    // UI State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
    const [savingLoan, setSavingLoan] = useState(false);
    const [savingPayment, setSavingPayment] = useState(false);
    const [savingNote, setSavingNote] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [noteContent, setNoteContent] = useState('');

    // Form State for new loan
    const [amount, setAmount] = useState('');
    const [interestRate, setInterestRate] = useState('');
    const [termCount, setTermCount] = useState('');
    const [paymentFreq, setPaymentFreq] = useState<'daily' | 'weekly' | 'biweekly' | 'monthly'>('monthly');
    const [disbursementDate, setDisbursementDate] = useState(new Date().toISOString().split('T')[0]);
    const [firstDueDate, setFirstDueDate] = useState('');

    useEffect(() => {
        async function fetchClient() {
            if (!id) return;
            setLoadingClient(true);
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('id', id)
                .single();

            if (!error && data) {
                setClient(data as Client);
            }
            setLoadingClient(false);
        }
        fetchClient();
    }, [id]);

    const handleAddPayment = async (e: FormEvent) => {
        e.preventDefault();
        if (!selectedLoan) return;
        setSavingPayment(true);

        const { error } = await addPayment({
            loan_id: selectedLoan.id,
            amount: parseInt(paymentAmount, 10),
            method: 'cash'
        });

        setSavingPayment(false);

        if (!error) {
            setIsPaymentModalOpen(false);
            setPaymentAmount('');
            fetchLoans();
        } else {
            alert(`Error al registrar pago: ${error}`);
        }
    };

    const handleAddLoan = async (e: FormEvent) => {
        e.preventDefault();
        setSavingLoan(true);

        const intRate = parseFloat(interestRate) / 100;
        const principal = parseFloat(amount);

        const { error } = await addLoan({
            client_id: id as string,
            principal_amount: principal,
            interest_type: 'simple',
            interest_rate: intRate,
            interest_rate_period: paymentFreq,
            payment_frequency: paymentFreq,
            term_count: parseInt(termCount, 10),
            disbursement_date: disbursementDate,
            first_due_date: firstDueDate,
            grace_days: 0,
            late_fee_type: 'none',
            late_fee_value: 0,
            notes: null,
        });

        setSavingLoan(false);

        if (!error) {
            setIsModalOpen(false);
            setAmount('');
            setInterestRate('');
            setTermCount('');
            setFirstDueDate('');
        } else {
            alert(`Error al crear préstamo: ${error}`);
        }
    };

    const handleDeleteClient = async () => {
        if (!id) return;
        if (window.confirm(`¿Estás seguro de que deseas eliminar a este cliente?`)) {
            const { error } = await deleteClient(id);
            if (!error) {
                navigate('/clientes');
            } else {
                alert(`Error al eliminar: ${error}`);
            }
        }
    };

    const handleUpdateNote = async (e: FormEvent) => {
        e.preventDefault();
        if (!selectedLoan) return;
        setSavingNote(true);
        const { error } = await updateLoanNotes(selectedLoan.id, noteContent);
        setSavingNote(false);
        if (!error) {
            setIsNoteModalOpen(false);
        } else {
            alert(`Error al guardar nota: ${error}`);
        }
    };

    const handleDeleteLoan = async (loanId: string) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este préstamo? Esta acción no se puede deshacer.')) {
            const { error } = await deleteLoan(loanId);
            if (error) {
                alert(`Error al eliminar préstamo: ${error}`);
            }
        }
    };

    if (loadingClient || loadingLoans) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-brand-accent" size={40} />
                <p className="text-gray-500 mt-4 font-medium italic">Cargando detalles...</p>
            </div>
        );
    }

    if (!client) {
        return <div className="p-8 text-center text-gray-500">Cliente no encontrado</div>;
    }

    return (
        <div className="bg-background min-h-screen pb-24 transition-colors duration-300">
            {/* Header / Picker */}
            <header className="sticky top-0 z-50 bg-surface border-b border-border-main px-4 py-3 flex items-center gap-4 shadow-sm">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 text-gray-400 hover:text-brand-accent transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>

                {/* Client Picker Logic */}
                <div className="flex-1 relative">
                    <div className="flex items-center gap-2 cursor-pointer group">
                        <div className="w-8 h-8 rounded-full bg-brand-accent text-white flex items-center justify-center font-bold text-xs">
                            {client.first_name[0]}{client.last_name[0]}
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-1">
                                <span className="font-bold text-text-main leading-tight">{client.first_name} {client.last_name}</span>
                                <ChevronDown size={14} className="text-gray-400 group-hover:text-brand-accent" />
                            </div>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-none">Detalles del Cliente</span>
                        </div>

                        {/* Hidden Select for Picker functionality */}
                        <select
                            className="absolute inset-0 opacity-0 cursor-pointer w-full"
                            value={client.id}
                            onChange={(e) => navigate(`/clientes/${e.target.value}`)}
                        >
                            {clients.map(c => (
                                <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <button
                    onClick={handleDeleteClient}
                    className="p-2 text-red-400 hover:text-red-600 transition-colors"
                    title="Eliminar Cliente"
                >
                    <Trash2 size={20} />
                </button>
            </header>

            <main className="p-4 space-y-6">
                {/* Info Card */}
                <section className="bg-surface rounded-2xl p-5 shadow-sm border border-border-main flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center text-gray-400">
                                <Smartphone size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Teléfono</p>
                                <p className="text-sm font-bold text-text-main">{client.phone || 'N/A'}</p>
                            </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${client.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                            {client.status === 'active' ? 'Activo' : 'Inactivo'}
                        </span>
                    </div>
                </section>

                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold text-text-main/80">Préstamos Activos</h2>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-brand-accent hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md active:scale-95 transition-all flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Préstamo
                    </button>
                </div>

                {/* Loans List */}
                <div className="space-y-4">
                    {loans.length === 0 ? (
                        <div className="bg-surface rounded-2xl p-12 text-center border border-dashed border-border-main">
                            <Wallet className="mx-auto text-gray-200 mb-4" size={48} />
                            <p className="text-gray-400 font-medium">No hay préstamos registrados</p>
                        </div>
                    ) : (
                        loans.map((loan: Loan) => {
                            const isOverdue = loan.status === 'overdue';
                            const isPaid = loan.status === 'paid';
                            const daysOverdue = isOverdue ? Math.floor((new Date().getTime() - new Date(loan.next_due_date).getTime()) / (1000 * 3600 * 24)) : 0;
                            const cuota = Math.round(loan.total_expected / loan.term_count);

                            return (
                                <article
                                    key={loan.id}
                                    className={`bg-surface rounded-2xl p-5 shadow-sm border border-border-main flex flex-col gap-4 relative overflow-hidden transition-all ${isOverdue ? 'ring-2 ring-red-500/10' : ''}`}
                                >
                                    {/* Status Indicator Bar */}
                                    <div className={`absolute top-0 right-0 w-24 h-1 ${isOverdue ? 'bg-red-500' : isPaid ? 'bg-green-500' : 'bg-brand-accent'}`} />

                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`w-2 h-2 rounded-full ${isOverdue ? 'bg-red-500 animate-pulse' : isPaid ? 'bg-green-500' : 'bg-brand-accent'}`} />
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Saldo Pendiente</p>
                                            </div>
                                            <p className={`text-2xl font-black ${isOverdue ? 'text-red-600' : 'text-text-main'}`}>
                                                ${Math.round(loan.balance).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isPaid ? 'bg-green-100 text-green-700' : isOverdue ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {isPaid ? 'Pagado' : isOverdue ? 'En Mora' : 'Al día'}
                                            </span>
                                            {isOverdue && <span className="text-[10px] font-bold text-red-600 italic">{daysOverdue} días de atraso</span>}
                                            <button
                                                onClick={() => handleDeleteLoan(loan.id)}
                                                className="mt-2 p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                                                title="Eliminar Préstamo"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-y-4 gap-x-2 bg-background/50 p-4 rounded-xl border border-border-main/50">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-surface shadow-xs flex items-center justify-center text-gray-400">
                                                <DollarSign size={14} />
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Principal</p>
                                                <p className="text-xs font-bold text-text-main/80">${Math.round(loan.principal_amount).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-surface shadow-xs flex items-center justify-center text-gray-400">
                                                <Percent size={14} />
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Interés</p>
                                                <p className="text-xs font-bold text-text-main/80">{Math.round(loan.interest_rate * 100)}%</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-surface shadow-xs flex items-center justify-center text-gray-400">
                                                <Clock size={14} />
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Frecuencia</p>
                                                <p className="text-xs font-bold text-gray-700 uppercase">{loan.payment_frequency}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-surface shadow-xs flex items-center justify-center text-gray-400">
                                                <Calendar size={14} />
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Próximo Pago</p>
                                                <p className="text-xs font-bold text-gray-700">{loan.next_due_date}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {loan.notes && (
                                        <div className="p-3 bg-amber-50 rounded-xl flex gap-x-3 items-start border border-amber-100">
                                            <StickyNote size={14} className="text-amber-600 mt-0.5" />
                                            <p className="text-xs text-amber-900 font-medium italic leading-relaxed">"{loan.notes}"</p>
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        {!isPaid && (
                                            <button
                                                onClick={() => {
                                                    setSelectedLoan(loan);
                                                    setPaymentAmount(cuota.toString());
                                                    setIsPaymentModalOpen(true);
                                                }}
                                                className="flex-1 bg-brand-primary hover:bg-emerald-700 text-white h-12 rounded-xl text-sm font-bold shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Wallet size={18} />
                                                Registrar Pago
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                setSelectedLoan(loan);
                                                setNoteContent(loan.notes || '');
                                                setIsNoteModalOpen(true);
                                            }}
                                            className="w-12 h-12 bg-white border border-gray-200 text-gray-400 hover:text-brand-accent rounded-xl flex items-center justify-center active:scale-95 transition-all"
                                        >
                                            <StickyNote size={18} />
                                        </button>
                                    </div>
                                </article>
                            )
                        })
                    )}
                </div>
            </main>

            {/* Modal: New Loan */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-end justify-center px-0 pb-0 sm:p-4">
                    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
                    <div className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] sm:rounded-3xl p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto no-scrollbar">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-gray-900">Nuevo Préstamo</h2>
                            <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">✕</button>
                        </div>
                        <form onSubmit={handleAddLoan} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1" htmlFor="amount">Monto Principal ($)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                    <input id="amount" type="number" step="0.01" className="w-full pl-9 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-accent font-bold text-lg" value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="Ej: 1000" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1" htmlFor="interest">Tasa (%)</label>
                                    <input id="interest" type="number" step="0.01" className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-accent font-bold" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} required placeholder="Ej: 5" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1" htmlFor="freq">Frecuencia</label>
                                    <select id="freq" className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-accent font-bold cursor-pointer" value={paymentFreq} onChange={(e) => setPaymentFreq(e.target.value as any)} required>
                                        <option value="daily">Diaria</option>
                                        <option value="weekly">Semanal</option>
                                        <option value="biweekly">Quincenal</option>
                                        <option value="monthly">Mensual</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1" htmlFor="term">Número de Cuotas</label>
                                <input id="term" type="number" className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-accent font-bold" value={termCount} onChange={(e) => setTermCount(e.target.value)} required placeholder="Ej: 12" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1" htmlFor="disbursement">Desembolso</label>
                                    <input id="disbursement" type="date" className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-accent font-bold text-sm" value={disbursementDate} onChange={(e) => setDisbursementDate(e.target.value)} required />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1" htmlFor="firstDue">Primer Pago</label>
                                    <input id="firstDue" type="date" className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-accent font-bold text-sm" value={firstDueDate} onChange={(e) => setFirstDueDate(e.target.value)} required />
                                </div>
                            </div>
                            <button type="submit" className="w-full mt-4 bg-brand-accent hover:bg-blue-700 text-white h-14 rounded-2xl font-black shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-lg" disabled={savingLoan}>
                                {savingLoan ? 'Procesando...' : 'Crear'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Register Payment */}
            {isPaymentModalOpen && selectedLoan && (
                <div className="fixed inset-0 z-[60] flex items-end justify-center px-0 pb-0 sm:p-4">
                    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsPaymentModalOpen(false)}></div>
                    <div className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] sm:rounded-3xl p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-xl font-black text-gray-900">Registrar Pago</h2>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Préstamo de ${Math.round(selectedLoan.principal_amount).toLocaleString()}</p>
                            </div>
                            <button onClick={() => setIsPaymentModalOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">✕</button>
                        </div>
                        <form onSubmit={handleAddPayment} className="space-y-8">
                            <div className="text-center">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4" htmlFor="payAmount">Monto a recibir ($)</label>
                                <input
                                    id="payAmount"
                                    type="number"
                                    className="w-full bg-transparent border-none text-5xl font-black text-brand-primary text-center focus:outline-none placeholder-gray-100"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    required
                                    autoFocus
                                />
                                <div className="mt-4 inline-flex items-center gap-2 px-4 py-1 bg-gray-100 rounded-full text-[10px] font-bold text-gray-500 uppercase">
                                    <Smartphone size={12} />
                                    Saldo actual: ${Math.round(selectedLoan.balance).toLocaleString()}
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-brand-primary hover:bg-emerald-700 text-white h-16 rounded-2xl font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition-all text-xl flex items-center justify-center gap-3" disabled={savingPayment}>
                                {savingPayment ? 'Sincronizando...' : (
                                    <>
                                        <CheckCircle2 size={24} />
                                        Confirmar Cobro
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Update Note */}
            {isNoteModalOpen && selectedLoan && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsNoteModalOpen(false)}></div>
                    <div className="relative w-full max-w-sm bg-white rounded-[2rem] p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-gray-900 flex items-center gap-2">
                                <StickyNote size={20} className="text-brand-accent" />
                                Nota de Seguimiento
                            </h3>
                            <button onClick={() => setIsNoteModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        <form onSubmit={handleUpdateNote}>
                            <textarea
                                className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-medium text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-brand-accent"
                                rows={4}
                                value={noteContent}
                                onChange={(e) => setNoteContent(e.target.value)}
                                placeholder="Escribe una observación aquí..."
                            />
                            <button type="submit" className="w-full mt-4 bg-gray-900 hover:bg-black text-white h-12 rounded-xl font-bold shadow-md active:scale-95 transition-all flex items-center justify-center gap-2" disabled={savingNote}>
                                {savingNote ? 'Guardando...' : 'Guardar Observación'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

