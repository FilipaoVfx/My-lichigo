import { useState, useEffect, useMemo, useCallback, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.ts';
import { ArrowLeft, Plus, DollarSign, Calendar, Clock, Wallet, Percent, Trash2, StickyNote, Smartphone, ChevronDown, CheckCircle2, Loader2, Settings2, Zap, Shield, AlertTriangle, RotateCcw, LayoutGrid, X } from 'lucide-react';
import { useLoans } from '../hooks/useLoans.ts';
import { usePayments } from '../hooks/usePayments.ts';
import { useClients } from '../hooks/useClients.ts';
import { usePaymentSchedule, type CuotaPlan } from '../hooks/usePaymentSchedule.ts';
import type { Client } from '../types/client.ts';
import type { Loan } from '../types/loan.ts';
import { formatCurrency, formatDate } from '../lib/format.ts';

// ─── Loan Calculator Engine ───────────────────────────────────────────────────
function calcLoanPreview({
    principal,
    ratePercent,
    termCount,
    roundTo,
}: {
    principal: number;
    ratePercent: number;
    termCount: number;
    roundTo: number;
}) {
    if (!principal || !ratePercent) return null;
    const effectiveTerms = termCount || 1;
    const rate = ratePercent / 100;

    const totalInterest = Math.round(principal * rate); // Now projection of one period
    const totalExpected = principal;
    let cuota = totalExpected / effectiveTerms;

    if (roundTo > 1) {
        cuota = Math.ceil(cuota / roundTo) * roundTo;
        // Total expected stays equal to principal (sum of amortizations)
    } else {
        cuota = Math.round(cuota);
    }

    return { totalExpected, cuota, totalInterest };
}

export default function ClientDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [client, setClient] = useState<Client | null>(null);
    const [loadingClient, setLoadingClient] = useState(true);

    const { loans, loading: loadingLoans, addLoan, fetchLoans, updateLoanNotes, deleteLoan } = useLoans(id || '');
    const [lastInterestPayments, setLastInterestPayments] = useState<Record<string, string | null>>({});
    const { clients, deleteClient } = useClients(); // For the picker
    const { addPayment } = usePayments();

    // UI State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
    const [planLoan, setPlanLoan] = useState<Loan | null>(null);
    const [savingLoan, setSavingLoan] = useState(false);
    const [savingPayment, setSavingPayment] = useState(false);
    const [savingNote, setSavingNote] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentType, setPaymentType] = useState<'principal' | 'interest_only' | 'mixed'>('principal');
    const [principalAmount, setPrincipalAmount] = useState('');
    const [interestAmount, setInterestAmount] = useState('');
    const [noteContent, setNoteContent] = useState('');
    const [tempTermCount, setTempTermCount] = useState(''); // State for asking number of installments if missing

    // ─── Plan de Pagos: hook de persistencia ─────────────────────────────────
    const {
        cuotas,
        cargando: cargandoCuotas,
        estadisticas: statsCuotas,
        generarCronograma,
        toggleEstadoCuota,
    } = usePaymentSchedule(planLoan?.id || '');

    const openPlanModal = useCallback((loan: Loan) => {
        setPlanLoan(loan);
        setTempTermCount(loan.term_count?.toString() || '');
        setIsPlanModalOpen(true);
    }, []);

    // Form State for new loan — Simple
    const [amount, setAmount] = useState('');
    const [interestRate, setInterestRate] = useState('');
    const [termCount, setTermCount] = useState('');
    const [paymentFreq, setPaymentFreq] = useState<'daily' | 'weekly' | 'biweekly' | 'monthly'>('monthly');
    const [disbursementDate, setDisbursementDate] = useState(new Date().toISOString().split('T')[0]);
    const [firstDueDate, setFirstDueDate] = useState('');
    // Form State for new loan — Advanced
    const [advancedMode, setAdvancedMode] = useState(false);
    const [interestType, setInterestType] = useState<'simple' | 'flat' | 'custom'>('simple');
    const [graceDays, setGraceDays] = useState('0');
    const [lateFeeType, setLateFeeType] = useState<'none' | 'fixed' | 'percent'>('none');
    const [lateFeeValue, setLateFeeValue] = useState('0');
    const [roundTo, setRoundTo] = useState<0 | 100 | 50>(0);
    const [loanNotes, setLoanNotes] = useState('');

    // Live preview calculator — now shows interest separate from total principal-based expectation
    const loanPreview = useMemo(() => calcLoanPreview({
        principal: parseFloat(amount) || 0,
        ratePercent: parseFloat(interestRate) || 0,
        termCount: parseInt(termCount) || 0,
        roundTo: roundTo || 1,
    }), [amount, interestRate, termCount, roundTo]);

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

    useEffect(() => {
        const fetchLastPayments = async () => {
            if (!loans.length) return;
            const { data, error } = await supabase
                .from('payments')
                .select('loan_id, payment_date, payment_type')
                .in('loan_id', loans.map(l => l.id))
                .or('payment_type.eq.interest_only,payment_type.eq.mixed')
                .order('payment_date', { ascending: false });

            if (!error && data) {
                const latest: Record<string, string | null> = {};
                data.forEach(p => {
                    if (!latest[p.loan_id]) {
                        latest[p.loan_id] = p.payment_date;
                    }
                });
                setLastInterestPayments(latest);
            }
        };
        fetchLastPayments();
    }, [loans]);

    const handleAddPayment = async (e: FormEvent) => {
        e.preventDefault();
        if (!selectedLoan) return;
        setSavingPayment(true);

        const amountNum = parseInt(paymentAmount.replace(/\D/g, ''), 10);
        const princNum = paymentType === 'mixed' ? parseInt(principalAmount.replace(/\D/g, ''), 10) : (paymentType === 'principal' ? amountNum : 0);
        const intNum = paymentType === 'mixed' ? parseInt(interestAmount.replace(/\D/g, ''), 10) : (paymentType === 'interest_only' ? amountNum : 0);

        if (paymentType === 'mixed' && princNum <= intNum) {
            alert('El monto de abono a capital debe ser estrictamente superior al monto de interés.');
            setSavingPayment(false);
            return;
        }

        const { error } = await addPayment({
            loan_id: selectedLoan.id,
            amount: amountNum,
            payment_type: paymentType,
            principal_amount: princNum,
            interest_amount: intNum,
            method: 'cash'
        });

        setSavingPayment(false);

        if (!error) {
            setIsPaymentModalOpen(false);
            setPaymentAmount('');
            setPrincipalAmount('');
            setInterestAmount('');
            setPaymentType('principal');
            fetchLoans();
        } else {
            alert(`Error al registrar pago: ${error}`);
        }
    };

    const resetLoanForm = () => {
        setAmount(''); setInterestRate(''); setTermCount('');
        setFirstDueDate(''); setGraceDays('0'); setLateFeeType('none');
        setLateFeeValue('0'); setRoundTo(0); setLoanNotes('');
        setAdvancedMode(false); setInterestType('simple');
    };

    const handleAddLoan = async (e: FormEvent) => {
        e.preventDefault();
        if (!firstDueDate) { alert('Por favor ingresa la fecha del primer pago.'); return; }
        setSavingLoan(true);

        const intRate = parseFloat(interestRate) / 100;
        const principal = parseFloat(amount);

        const { data: newLoan, error } = await addLoan({
            client_id: id as string,
            principal_amount: principal,
            interest_type: interestType,
            interest_rate: intRate,
            interest_rate_period: paymentFreq,
            payment_frequency: paymentFreq,
            term_count: parseInt(termCount, 10) || 0,
            disbursement_date: disbursementDate,
            first_due_date: firstDueDate,
            grace_days: parseInt(graceDays, 10) || 0,
            late_fee_type: lateFeeType,
            late_fee_value: parseFloat(lateFeeValue) || 0,
            notes: loanNotes || null,
        });

        if (!error && newLoan && newLoan.term_count > 0) {
            // Auto-generar cronograma si tiene cuotas definidas
            await generarCronograma({
                prestamo_id: newLoan.id,
                fecha_primer_vencimiento: firstDueDate,
                frecuencia: paymentFreq,
                numero_cuotas: newLoan.term_count,
                monto_total: newLoan.total_expected
            });
        }

        setSavingLoan(false);

        if (!error) {
            setIsModalOpen(false);
            resetLoanForm();
            await fetchLoans();
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

                            // User request: capital is immutable and interest is recalculated based only on balance
                            const currentInterestAmount = Math.round(loan.balance * loan.interest_rate);
                            const currentPrincipalAmount = loan.principal_amount;

                            // Interest badge logic
                            const lastIntDate = lastInterestPayments[loan.id];
                            const periodDays = loan.payment_frequency === 'monthly' ? 30 :
                                loan.payment_frequency === 'biweekly' ? 15 :
                                    loan.payment_frequency === 'weekly' ? 7 : 1;

                            const hasInterestPaidRecent = lastIntDate && (() => {
                                const lastDate = new Date(lastIntDate);
                                const diffDays = (new Date().getTime() - lastDate.getTime()) / (1000 * 3600 * 24);
                                return diffDays < periodDays;
                            })();

                            const showInterestBadge = !hasInterestPaidRecent && !isPaid && currentInterestAmount > 0;

                            const cuota = loan.term_count > 0
                                ? Math.round(loan.total_expected / loan.term_count)
                                : Math.round(loan.balance * loan.interest_rate); // Updated fallback

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
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Saldo Pendiente (Capital)</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <p className={`text-2xl font-black ${isOverdue ? 'text-red-600' : 'text-text-main'}`}>
                                                    {formatCurrency(loan.balance)}
                                                </p>
                                                <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 shadow-sm transition-all duration-300 ${showInterestBadge ? 'show bg-indigo-50 border-indigo-200' : 'hidden opacity-0 invisible'}`}>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                                    <span className="text-[10px] font-black text-indigo-700 uppercase tracking-tight">
                                                        + {formatCurrency(currentInterestAmount)} intereses
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isPaid ? 'bg-green-100 text-green-700' : isOverdue ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {isPaid ? 'Pagado' : isOverdue ? 'En Mora' : 'Al día'}
                                            </span>
                                            {isOverdue && <span className="text-[10px] font-bold text-red-600 italic">{daysOverdue} días de atraso</span>}
                                            <button
                                                onClick={() => navigate(`/prestamos/${loan.id}/editar`)}
                                                className="mt-2 p-1.5 text-gray-300 hover:text-brand-accent transition-colors"
                                                title="Editar Préstamo"
                                            >
                                                <Settings2 size={16} />
                                            </button>
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
                                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Capital (Monto Original)</p>
                                                <p className="text-xs font-bold text-text-main/80">{formatCurrency(currentPrincipalAmount)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-surface shadow-xs flex items-center justify-center text-gray-400">
                                                <Percent size={14} />
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Interés ({Math.round(loan.interest_rate * 100)}%)</p>
                                                <p className="text-xs font-bold text-brand-accent">{formatCurrency(currentInterestAmount)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-surface shadow-xs flex items-center justify-center text-gray-400">
                                                <Clock size={14} />
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Frecuencia</p>
                                                <p className="text-xs font-bold text-gray-700 uppercase">
                                                    {loan.payment_frequency === 'daily' ? 'Diario' :
                                                        loan.payment_frequency === 'weekly' ? 'Semanal' :
                                                            loan.payment_frequency === 'biweekly' ? 'Quincenal' : 'Mensual'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-surface shadow-xs flex items-center justify-center text-gray-400">
                                                <Calendar size={14} />
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Próximo Pago</p>
                                                <p className={`text-xs font-bold ${loan.status === 'overdue' ? 'text-red-500' :
                                                    loan.next_due_date === new Date().toISOString().split('T')[0] ? 'text-amber-500' :
                                                        'text-gray-700'
                                                    }`}>
                                                    {loan.next_due_date ? (
                                                        loan.next_due_date === new Date().toISOString().split('T')[0] ? '¡Hoy!' : formatDate(loan.next_due_date)
                                                    ) : 'Completado'}
                                                </p>
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
                                        <button
                                            onClick={() => openPlanModal(loan)}
                                            className={`w-12 h-12 rounded-xl flex items-center justify-center active:scale-95 transition-all
                                                ${loan.term_count > 0
                                                    ? 'bg-indigo-50 border border-indigo-100 text-indigo-400 hover:text-indigo-600 hover:border-indigo-300'
                                                    : 'bg-gray-50 border border-gray-100 text-gray-300 hover:text-gray-400'
                                                }`}
                                            title="Plan de Pagos"
                                        >
                                            <LayoutGrid size={18} />
                                        </button>
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
                    <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm" onClick={() => { setIsModalOpen(false); resetLoanForm(); }}></div>
                    <div className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[92vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center px-7 pt-7 pb-4 flex-shrink-0">
                            <div>
                                <h2 className="text-xl font-black text-gray-900">Nuevo Préstamo</h2>
                                <p className="text-xs text-gray-400 font-medium mt-0.5">Configura las condiciones del crédito</p>
                            </div>
                            <button onClick={() => { setIsModalOpen(false); resetLoanForm(); }} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors">✕</button>
                        </div>

                        {/* Mode Toggle */}
                        <div className="px-7 pb-4 flex-shrink-0">
                            <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
                                <button
                                    type="button"
                                    onClick={() => setAdvancedMode(false)}
                                    className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${!advancedMode ? 'bg-white text-brand-accent shadow-sm' : 'text-gray-400'}`}
                                >
                                    <Zap size={14} />
                                    Modo Simple
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAdvancedMode(true)}
                                    className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${advancedMode ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-400'}`}
                                >
                                    <Settings2 size={14} />
                                    Avanzado
                                </button>
                            </div>
                        </div>

                        {/* Scrollable Form Area */}
                        <div className="overflow-y-auto no-scrollbar flex-1 px-7 pb-2">
                            <form id="loan-form" onSubmit={handleAddLoan} className="space-y-4">
                                {/* ── Principal ── */}
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1" htmlFor="modal-amount">Monto Principal ($)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-lg">$</span>
                                        <input id="modal-amount" type="tel" min="1" className="w-full pl-9 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-accent font-black text-xl" value={amount ? amount.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ''} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} required placeholder="0" />
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                        {['50000', '100000', '200000', '500000'].map(v => (
                                            <button key={v} type="button" onClick={() => setAmount(v)}
                                                className={`flex-1 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wide transition-all ${amount === v ? 'bg-brand-accent border-brand-accent text-white' : 'bg-white border-gray-100 text-gray-400'}`}>
                                                ${(parseInt(v) / 1000).toFixed(0)}k
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* ── Rate + Frequency ── */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1" htmlFor="modal-interest">Tasa (%)</label>
                                        <input id="modal-interest" type="number" step="0.1" min="0" className="w-full px-4 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-accent font-bold" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} required placeholder="Ej: 10" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1" htmlFor="modal-freq">Frecuencia</label>
                                        <select id="modal-freq" className="w-full px-4 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-accent font-bold cursor-pointer" value={paymentFreq} onChange={(e) => setPaymentFreq(e.target.value as any)} required>
                                            <option value="daily">Diaria</option>
                                            <option value="weekly">Semanal</option>
                                            <option value="biweekly">Quincenal</option>
                                            <option value="monthly">Mensual</option>
                                        </select>
                                    </div>
                                </div>

                                {/* ── Term ── */}
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1" htmlFor="modal-term">Número de Cuotas <span className="normal-case font-normal">(opcional)</span></label>
                                    <input id="modal-term" type="number" min="1" className="w-full px-4 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-accent font-bold" value={termCount} onChange={(e) => setTermCount(e.target.value)} placeholder="Ej: 12 — dejar vacío si es abierto" />
                                </div>

                                {/* ── Dates ── */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1" htmlFor="modal-disbursement">Desembolso</label>
                                        <input id="modal-disbursement" type="date" className="w-full px-4 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-accent font-bold text-sm" value={disbursementDate} onChange={(e) => setDisbursementDate(e.target.value)} required />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1" htmlFor="modal-firstDue">1er Cobro</label>
                                        <input id="modal-firstDue" type="date" className="w-full px-4 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-accent font-bold text-sm" value={firstDueDate} onChange={(e) => setFirstDueDate(e.target.value)} />
                                    </div>
                                </div>

                                {/* ══ ADVANCED SECTION ══ */}
                                {advancedMode && (
                                    <div className="space-y-4 pt-2 border-t border-gray-100">
                                        <div className="flex items-center gap-2 pt-1">
                                            <Shield size={14} className="text-purple-500" />
                                            <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Parámetros Avanzados</p>
                                        </div>

                                        {/* Interest Type */}
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Tipo de Interés</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button type="button" onClick={() => setInterestType('simple')}
                                                    className={`h-16 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 transition-all ${interestType === 'simple' ? 'border-brand-accent bg-blue-50' : 'border-gray-100 bg-white'}`}>
                                                    <Percent size={16} className={interestType === 'simple' ? 'text-brand-accent' : 'text-gray-300'} />
                                                    <span className={`text-[10px] font-black uppercase tracking-wide ${interestType === 'simple' ? 'text-brand-accent' : 'text-gray-400'}`}>Simple</span>
                                                    <span className="text-[8px] text-gray-400 font-medium">sobre el saldo</span>
                                                </button>
                                                <button type="button" onClick={() => setInterestType('flat')}
                                                    className={`h-16 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 transition-all ${interestType === 'flat' ? 'border-orange-400 bg-orange-50' : 'border-gray-100 bg-white'}`}>
                                                    <DollarSign size={16} className={interestType === 'flat' ? 'text-orange-500' : 'text-gray-300'} />
                                                    <span className={`text-[10px] font-black uppercase tracking-wide ${interestType === 'flat' ? 'text-orange-500' : 'text-gray-400'}`}>Flat</span>
                                                    <span className="text-[8px] text-gray-400 font-medium">sobre el capital</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Grace Days */}
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1" htmlFor="modal-grace">
                                                Días de Gracia <span className="normal-case font-medium">(antes de cobrar mora)</span>
                                            </label>
                                            <div className="flex gap-2 items-center">
                                                <input id="modal-grace" type="number" min="0" max="30" className="w-24 px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-purple-400 font-bold text-center" value={graceDays} onChange={(e) => setGraceDays(e.target.value)} />
                                                <div className="flex gap-2 flex-1">
                                                    {['0', '1', '3', '5'].map(d => (
                                                        <button key={d} type="button" onClick={() => setGraceDays(d)}
                                                            className={`flex-1 py-2 rounded-xl border text-[9px] font-black transition-all ${graceDays === d ? 'bg-purple-500 border-purple-500 text-white' : 'bg-white border-gray-100 text-gray-400'}`}>
                                                            {d}d
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Late Fee */}
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Cargo por Mora</label>
                                            <div className="grid grid-cols-3 gap-2 mb-3">
                                                {(['none', 'fixed', 'percent'] as const).map(t => (
                                                    <button key={t} type="button" onClick={() => setLateFeeType(t)}
                                                        className={`h-10 rounded-xl border text-[9px] font-black uppercase tracking-wide transition-all ${lateFeeType === t ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-gray-100 text-gray-400'}`}>
                                                        {t === 'none' ? 'Sin cargo' : t === 'fixed' ? 'Fijo ($)' : 'Porcentaje (%)'}
                                                    </button>
                                                ))}
                                            </div>
                                            {lateFeeType !== 'none' && (
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{lateFeeType === 'fixed' ? '$' : '%'}</span>
                                                    <input type="number" min="0" step="0.01" className="w-full pl-9 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-red-400 font-bold" value={lateFeeValue} onChange={(e) => setLateFeeValue(e.target.value)} placeholder={lateFeeType === 'fixed' ? 'Ej: 5000' : 'Ej: 2'} />
                                                </div>
                                            )}
                                            {lateFeeType !== 'none' && (
                                                <p className="text-[9px] text-gray-400 font-medium mt-1.5 ml-1 flex items-center gap-1">
                                                    <AlertTriangle size={10} className="text-amber-400" />
                                                    {lateFeeType === 'fixed' ? 'Monto fijo cobrado por cada período en mora' : 'Se aplica sobre la cuota vencida'}
                                                </p>
                                            )}
                                        </div>

                                        {/* Rounding */}
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Redondeo de Cuota</label>
                                            <div className="flex gap-2">
                                                {([0, 50, 100] as const).map(r => (
                                                    <button key={r} type="button" onClick={() => setRoundTo(r)}
                                                        className={`flex-1 h-10 rounded-xl border text-[10px] font-black transition-all ${roundTo === r ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-100 text-gray-400'}`}>
                                                        {r === 0 ? 'Sin redondeo' : `Al $${r}`}
                                                    </button>
                                                ))}
                                            </div>
                                            <p className="text-[9px] text-gray-400 font-medium mt-1.5 ml-1">Redondea la cuota hacia arriba al múltiplo más cercano. Ideal para cobros en efectivo.</p>
                                        </div>

                                        {/* Notes */}
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Notas del préstamo <span className="normal-case font-medium">(opcional)</span></label>
                                            <textarea className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-medium text-gray-700 placeholder-gray-300 focus:ring-2 focus:ring-purple-400 resize-none" rows={2} value={loanNotes} onChange={(e) => setLoanNotes(e.target.value)} placeholder="Condiciones especiales, garantías, acceso..." />
                                        </div>
                                    </div>
                                )}

                                {/* ── Live Preview Card ── */}
                                {loanPreview ? (
                                    <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white space-y-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <RotateCcw size={12} className="text-blue-200" />
                                            <p className="text-[9px] font-black uppercase tracking-widest text-blue-200">Vista Previa en Tiempo Real</p>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3 text-center">
                                            <div>
                                                <p className="text-[8px] text-blue-200 font-black uppercase tracking-wide mb-0.5">Cuota</p>
                                                <p className="text-base font-black">{formatCurrency(loanPreview.cuota)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[8px] text-blue-200 font-black uppercase tracking-wide mb-0.5">Interés por Cuota</p>
                                                <p className="text-base font-black">{formatCurrency(loanPreview.totalInterest)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[8px] text-blue-200 font-black uppercase tracking-wide mb-0.5">Total a Cobrar</p>
                                                <p className="text-base font-black">{formatCurrency(loanPreview.totalExpected)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 p-4 text-center">
                                        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Completa los campos para ver la proyección</p>
                                    </div>
                                )}
                            </form>
                        </div>

                        {/* Footer Buttons */}
                        <div className="px-7 py-5 flex-shrink-0 border-t border-gray-50 flex gap-3">
                            <button type="button" onClick={() => { setIsModalOpen(false); resetLoanForm(); }}
                                className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0">
                                ✕
                            </button>
                            <button form="loan-form" type="submit" className="flex-1 h-14 bg-brand-accent hover:bg-blue-700 text-white font-black rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-base flex items-center justify-center gap-2" disabled={savingLoan}>
                                {savingLoan ? <><Loader2 size={20} className="animate-spin" /> Procesando...</> : <><CheckCircle2 size={20} /> Crear Préstamo</>}
                            </button>
                        </div>
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
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Préstamo de {formatCurrency(selectedLoan.principal_amount)}</p>
                            </div>
                            <button onClick={() => setIsPaymentModalOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">✕</button>
                        </div>
                        <form onSubmit={handleAddPayment} className="space-y-6">
                            {/* Payment Type Selector */}
                            <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
                                {(['interest_only', 'mixed'] as const).map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => {
                                            setPaymentType(t);
                                            if (t === 'interest_only') {
                                                setPrincipalAmount('');
                                                setInterestAmount('');
                                            }
                                        }}
                                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${paymentType === t ? 'bg-white text-brand-accent shadow-sm' : 'text-gray-400'}`}
                                    >
                                        {t === 'interest_only' ? 'Solo Interés' : 'Personalizado'}
                                    </button>
                                ))}
                            </div>

                            {paymentType !== 'mixed' ? (
                                <div className="text-center">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2" htmlFor="payAmount">Monto a recibir ($)</label>
                                    <input
                                        id="payAmount"
                                        type="tel"
                                        className="w-full bg-transparent border-none text-5xl font-black text-brand-primary text-center focus:outline-none placeholder-gray-200"
                                        value={paymentAmount ? paymentAmount.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ''}
                                        onChange={(e) => setPaymentAmount(e.target.value.replace(/\D/g, ''))}
                                        required
                                        autoFocus
                                        placeholder="0"
                                    />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1" htmlFor=" princAmount">Abono Capital ($)</label>
                                            <input
                                                id="princAmount"
                                                type="tel"
                                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-accent font-black text-xl"
                                                value={principalAmount ? principalAmount.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ''}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    setPrincipalAmount(val);
                                                    const total = (parseInt(val || '0') + parseInt(interestAmount || '0')).toString();
                                                    setPaymentAmount(total);
                                                }}
                                                required
                                                placeholder="0"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1" htmlFor="intAmount">Abono Interés ($)</label>
                                            <input
                                                id="intAmount"
                                                type="tel"
                                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-black text-xl"
                                                value={interestAmount ? interestAmount.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ''}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    setInterestAmount(val);
                                                    const total = (parseInt(principalAmount || '0') + parseInt(val || '0')).toString();
                                                    setPaymentAmount(total);
                                                }}
                                                required
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                    <div className="text-center pt-2 border-t border-gray-50">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total a Recibir</p>
                                        <p className="text-3xl font-black text-brand-primary">{formatCurrency(parseInt(paymentAmount || '0'))}</p>
                                    </div>
                                </div>
                            )}

                            <div className="mt-3 flex justify-center">
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gray-50 rounded-full text-[10px] font-bold text-gray-500 uppercase border border-gray-100">
                                    <Smartphone size={12} className="text-brand-accent" />
                                    Saldo actual: {formatCurrency(selectedLoan.balance)}
                                </div>
                            </div>

                            {paymentType === 'interest_only' && (
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    {(() => {
                                        // Interest is now always calculated on the current balance
                                        const interesAmount = Math.round(selectedLoan.balance * selectedLoan.interest_rate);
                                        return (
                                            <button
                                                type="button"
                                                onClick={() => setPaymentAmount(interesAmount.toString())}
                                                className={`col-span-2 py-4 px-4 rounded-2xl border-2 text-xs font-black uppercase tracking-widest transition-all ${paymentAmount === interesAmount.toString() ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'}`}
                                            >
                                                Sugerido: {formatCurrency(interesAmount)} (Sólo Interés)
                                            </button>
                                        );
                                    })()}
                                </div>
                            )}

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
            {/* ═══ Modal: Plan de Pagos (Muro de Cuotas) ═══ */}
            {isPlanModalOpen && planLoan && (() => {
                const { total, pagadas, progreso, montoPagado, montoPendiente } = statsCuotas;
                const freqLabel = planLoan.payment_frequency === 'daily' ? 'diaria' : planLoan.payment_frequency === 'weekly' ? 'semanal' : planLoan.payment_frequency === 'biweekly' ? 'quincenal' : 'mensual';

                return (
                    <div className="fixed inset-0 z-[70] flex items-end justify-center px-0 pb-0 sm:p-4 font-sans">
                        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm" onClick={() => setIsPlanModalOpen(false)}></div>
                        <div className="relative w-full max-lg bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col overflow-hidden">
                            {/* Header */}
                            <div className="flex items-start justify-between px-6 pt-6 pb-3 flex-shrink-0">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
                                            <LayoutGrid size={14} className="text-indigo-600" />
                                        </div>
                                        <h2 className="text-lg font-black text-gray-900">Plan de Pagos</h2>
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                        {formatCurrency(planLoan.principal_amount)} · Cuota {freqLabel} · {total} cuotas
                                    </p>
                                </div>
                                <button onClick={() => setIsPlanModalOpen(false)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors flex-shrink-0">
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Progress Bar */}
                            <div className="px-6 pb-4 flex-shrink-0">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{pagadas} de {total} pagadas</span>
                                    <span className="text-[10px] font-black text-indigo-600">{progreso}%</span>
                                </div>
                                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{
                                            width: `${progreso}%`,
                                            background: progreso === 100 ? '#10b981' : 'linear-gradient(90deg, #6366f1, #8b5cf6)'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Installments Grid */}
                            <div className="overflow-y-auto no-scrollbar flex-1 px-6 pb-4">
                                {cargandoCuotas ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3">
                                        <Loader2 size={32} className="animate-spin text-indigo-500" />
                                        <p className="text-sm font-bold animate-pulse">Cargando plan...</p>
                                    </div>
                                ) : cuotas.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-10 text-center bg-gray-50/50 rounded-[2rem] border-2 border-dashed border-gray-100 px-8 mx-2">
                                        <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
                                            <Calendar size={32} className="text-indigo-200" />
                                        </div>

                                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-2">Plan no inicializado</h3>
                                        <p className="text-xs text-gray-400 font-medium mb-8 leading-relaxed max-w-[240px]">
                                            Para comenzar a cobrar, es necesario proyectar el cronograma de cuotas.
                                        </p>

                                        {(!planLoan.term_count || planLoan.term_count === 0) && (
                                            <div className="w-full max-w-xs mb-8 p-6 bg-white rounded-3xl shadow-sm border border-gray-100 animate-in zoom-in duration-300">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <Percent size={14} className="text-indigo-500" />
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                        Definir número de cuotas
                                                    </label>
                                                </div>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-black text-2xl text-center text-indigo-600 placeholder:text-gray-200 transition-all"
                                                    value={tempTermCount}
                                                    onChange={(e) => setTempTermCount(e.target.value)}
                                                    placeholder="0"
                                                    autoFocus
                                                />
                                                <div className="mt-4 flex items-start gap-2 text-left">
                                                    <AlertTriangle size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
                                                    <p className="text-[9px] text-gray-400 font-bold uppercase leading-tight">
                                                        El botón "Generar" se activará una vez ingreses el número de cuotas.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            disabled={(parseInt(tempTermCount) || 0) <= 0 && (!planLoan.term_count || planLoan.term_count === 0)}
                                            onClick={async () => {
                                                const nCuotas = planLoan.term_count > 0 ? planLoan.term_count : parseInt(tempTermCount);

                                                if (!nCuotas || nCuotas <= 0) {
                                                    alert("El número de cuotas debe ser mayor a 0");
                                                    return;
                                                }

                                                await generarCronograma({
                                                    prestamo_id: planLoan.id,
                                                    fecha_primer_vencimiento: planLoan.first_due_date || new Date().toISOString().split('T')[0],
                                                    frecuencia: planLoan.payment_frequency as any,
                                                    numero_cuotas: nCuotas,
                                                    monto_total: planLoan.total_expected
                                                });
                                            }}
                                            className={`group relative w-full h-16 rounded-2xl font-black text-sm uppercase tracking-widest transition-all overflow-hidden
                                                ${((parseInt(tempTermCount) || 0) > 0 || planLoan.term_count > 0)
                                                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 active:scale-95'
                                                    : 'bg-gray-100 text-gray-300 cursor-not-allowed grayscale'
                                                }`}
                                        >
                                            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                            <span className="relative flex items-center justify-center gap-2">
                                                {((parseInt(tempTermCount) || 0) > 0 || planLoan.term_count > 0) ? (
                                                    <><RotateCcw size={18} className="animate-in fade-in zoom-in" /> Generar Plan de Pagos</>
                                                ) : (
                                                    <><Shield size={18} className="opacity-50" /> Esperando Cuotas</>
                                                )}
                                            </span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
                                        {cuotas.map((inst: CuotaPlan) => {
                                            const isChecked = inst.estado === 'pagado';
                                            const isPartial = inst.estado === 'parcial';
                                            const instDate = new Date(inst.fecha_vencimiento);
                                            const isToday = instDate.toDateString() === new Date().toDateString();
                                            const isLate = inst.estado === 'vencido';

                                            return (
                                                <button
                                                    key={inst.id}
                                                    onClick={() => toggleEstadoCuota(inst.id, inst.estado)}
                                                    className={`relative flex flex-col items-center justify-center gap-1 rounded-2xl border-2 p-3 transition-all active:scale-95 select-none
                                                        ${isChecked
                                                            ? 'bg-emerald-50 border-emerald-400'
                                                            : isPartial
                                                                ? 'bg-orange-50 border-orange-400'
                                                                : isToday
                                                                    ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300/50'
                                                                    : isLate
                                                                        ? 'bg-red-50 border-red-300'
                                                                        : 'bg-gray-50 border-gray-100'
                                                        }`}
                                                >
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isChecked ? 'text-emerald-600' : isPartial ? 'text-orange-600' : isLate ? 'text-red-500' : isToday ? 'text-amber-600' : 'text-gray-400'
                                                        }`}>
                                                        #{inst.numero_cuota}
                                                    </span>

                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isChecked
                                                        ? 'bg-emerald-500 text-white'
                                                        : isPartial
                                                            ? 'bg-orange-500 text-white'
                                                            : isToday
                                                                ? 'bg-amber-400 text-white'
                                                                : isLate
                                                                    ? 'bg-red-100 text-red-500'
                                                                    : 'bg-white border-2 border-gray-200 text-gray-300'
                                                        }`}>
                                                        {isChecked ? (
                                                            <CheckCircle2 size={16} />
                                                        ) : isPartial ? (
                                                            <span className="text-[9px] font-black">1/2</span>
                                                        ) : isToday ? (
                                                            <span className="text-[9px] font-black">HOY</span>
                                                        ) : isLate ? (
                                                            <span className="text-[9px] font-black">!</span>
                                                        ) : (
                                                            <span className="text-[10px] font-black text-gray-300">○</span>
                                                        )}
                                                    </div>

                                                    <span className={`text-[9px] font-black ${isChecked ? 'text-emerald-700' : isPartial ? 'text-orange-700' : isLate ? 'text-red-600' : 'text-gray-600'
                                                        }`}>
                                                        {formatCurrency(inst.monto_cuota)}
                                                    </span>

                                                    <span className={`text-[8px] font-medium leading-none text-center ${isChecked ? 'text-emerald-500' : isPartial ? 'text-orange-500' : isLate ? 'text-red-400' : 'text-gray-400'
                                                        }`}>
                                                        {formatDate(inst.fecha_vencimiento)}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Summary Footer */}
                            {!cargandoCuotas && cuotas.length > 0 && (
                                <div className="px-6 py-4 flex-shrink-0 border-t border-gray-50 bg-gray-50/50 rounded-b-[2.5rem] sm:rounded-b-3xl">
                                    <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                                        <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm">
                                            <p className="text-[8px] font-black text-emerald-600 uppercase tracking-wide mb-0.5">Pagado</p>
                                            <p className="text-sm font-black text-emerald-700">{formatCurrency(montoPagado)}</p>
                                        </div>
                                        <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm">
                                            <p className="text-[8px] font-black text-amber-600 uppercase tracking-wide mb-0.5">Pendiente</p>
                                            <p className="text-sm font-black text-text-main">{formatCurrency(montoPendiente)}</p>
                                        </div>
                                        <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm">
                                            <p className="text-[8px] font-black text-indigo-600 uppercase tracking-wide mb-0.5">Total</p>
                                            <p className="text-sm font-black text-indigo-700">{formatCurrency(planLoan.total_expected)}</p>
                                        </div>
                                    </div>
                                    <p className="text-center text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-4 px-4 leading-tight">
                                        Toca una cuota para marcarla como pagada. Los cambios se guardan automáticamente.
                                    </p>
                                    <button onClick={() => setIsPlanModalOpen(false)} className="w-full h-14 bg-gray-900 hover:bg-black text-white rounded-2xl font-black text-sm active:scale-95 transition-all flex items-center justify-center gap-2">
                                        Finalizar Revisión
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}

