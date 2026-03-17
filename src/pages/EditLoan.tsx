import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase.ts';
import { useLoans } from '../hooks/useLoans.ts';
import { usePaymentSchedule } from '../hooks/usePaymentSchedule.ts';
import { formatCurrency } from '../lib/format.ts';
import { ArrowLeft, Loader2, CheckCircle2, Percent, DollarSign, RotateCcw, Settings2, Zap } from 'lucide-react';
import type { Loan } from '../types/loan.ts';

// ─── Loan Calculator Engine ────────────────────────────────────────────────────
function calcLoanPreview({
    principal,
    ratePercent,
    termCount,
    interestType,
    roundTo,
}: {
    principal: number;
    ratePercent: number;
    termCount: number;
    interestType: 'simple' | 'flat' | 'custom';
    roundTo: number;
}) {
    // Interest type preserved for future logic differentiation if needed
    console.log(`Calculating for type: ${interestType}`);
    if (!principal || !ratePercent) return null;
    const effectiveTerms = termCount || 1;
    const rate = ratePercent / 100;
    const totalInterestRaw = principal * rate; // Period interest
    const totalExpected = principal;
    let cuota = totalExpected / effectiveTerms;

    if (roundTo > 1) {
        cuota = Math.ceil(cuota / roundTo) * roundTo;
    } else {
        cuota = Math.round(cuota);
    }

    return { totalExpected, cuota, totalInterest: totalInterestRaw };
}

export default function EditLoan() {
    const { id: loanId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { updateLoan } = useLoans('');
    const { generarCronograma, borrarCronograma } = usePaymentSchedule(loanId || '');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [loan, setLoan] = useState<Loan | null>(null);

    // Form states
    const [amount, setAmount] = useState('');
    const [interestRate, setInterestRate] = useState('10');
    const [frequency, setFrequency] = useState('monthly');
    const [duration, setDuration] = useState('');
    const [startDate, setStartDate] = useState('');
    const [firstDueDate, setFirstDueDate] = useState('');
    
    const [advancedMode, setAdvancedMode] = useState(false);
    const [interestType, setInterestType] = useState<'simple' | 'flat' | 'custom'>('simple');
    const [graceDays, setGraceDays] = useState('0');
    const [lateFeeType, setLateFeeType] = useState<'none' | 'fixed' | 'percent'>('none');
    const [lateFeeValue, setLateFeeValue] = useState('0');
    const [roundTo, setRoundTo] = useState<0 | 50 | 100>(0);
    const [loanNotes, setLoanNotes] = useState('');

    useEffect(() => {
        async function fetchLoan() {
            if (!loanId) return;
            const { data, error } = await supabase
                .from('loans')
                .select('*')
                .eq('id', loanId)
                .single();

            if (!error && data) {
                const l = data as Loan;
                setLoan(l);
                setAmount(l.principal_amount.toString());
                setInterestRate((l.interest_rate * 100).toString());
                setFrequency(l.payment_frequency);
                setDuration(l.term_count.toString());
                setStartDate(l.disbursement_date);
                setFirstDueDate(l.first_due_date || l.disbursement_date);
                setInterestType(l.interest_type);
                setGraceDays(l.grace_days.toString());
                setLateFeeType(l.late_fee_type);
                setLateFeeValue(l.late_fee_value.toString());
                setLoanNotes(l.notes || '');
                // Simple logic to detect "advanced" if some values are non-default
                if (l.interest_type === 'flat' || l.grace_days > 0 || l.late_fee_type !== 'none') {
                    setAdvancedMode(true);
                }
            }
            setLoading(false);
        }
        fetchLoan();
    }, [loanId]);

    const loanPreview = useMemo(() => calcLoanPreview({
        principal: parseFloat(amount) || 0,
        ratePercent: parseFloat(interestRate) || 0,
        termCount: parseInt(duration) || 0,
        interestType,
        roundTo: roundTo || 1,
    }), [amount, interestRate, duration, interestType, roundTo]);

    const handleUpdate = async () => {
        if (!loan || !loanId) return;
        setSaving(true);

        const newPrincipal = parseFloat(amount);
        const newInterestRate = parseFloat(interestRate) / 100;
        const newTerms = duration ? parseInt(duration) : 0;
        // User requested: capital immutable, interest dynamic.
        const newTotalExpected = newPrincipal;

        // Determine if schedule needs regeneration
        const needsRegeneration = 
            newPrincipal !== loan.principal_amount ||
            newInterestRate !== loan.interest_rate ||
            newTerms !== loan.term_count ||
            frequency !== loan.payment_frequency ||
            firstDueDate !== loan.first_due_date;

        if (needsRegeneration && loan.total_paid > 0) {
            const confirm = window.confirm("Este préstamo ya tiene pagos registrados. Si cambias el monto o el plazo, el cronograma se sobrescribirá. ¿Estás seguro?");
            if (!confirm) {
                setSaving(false);
                return;
            }
        }

        const { error } = await updateLoan(loanId, {
            principal_amount: newPrincipal,
            interest_rate: newInterestRate,
            interest_type: interestType,
            interest_rate_period: frequency as any,
            payment_frequency: frequency as any,
            term_count: newTerms,
            disbursement_date: startDate,
            first_due_date: firstDueDate,
            grace_days: parseInt(graceDays) || 0,
            late_fee_type: lateFeeType,
            late_fee_value: parseFloat(lateFeeValue) || 0,
            notes: loanNotes || null,
            total_expected: newTotalExpected,
            balance: newTotalExpected - loan.total_paid,
        });

        if (!error) {
            if (needsRegeneration && newTerms > 0) {
                await borrarCronograma();
                await generarCronograma({
                    prestamo_id: loanId,
                    fecha_primer_vencimiento: firstDueDate,
                    frecuencia: frequency as any,
                    numero_cuotas: newTerms,
                    monto_total: newTotalExpected
                });
            }
            navigate(`/clientes/${loan.client_id}`);
        } else {
            alert(`Error al actualizar préstamo: ${error}`);
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
                <Loader2 className="animate-spin text-brand-accent" size={40} />
            </div>
        );
    }

    if (!loan) return <div className="p-8 text-center">Préstamo no encontrado</div>;

    return (
        <div className="flex flex-col min-h-screen bg-gray-50 pb-24 font-sans text-gray-900">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white border-b border-gray-100 flex flex-col shadow-sm">
                <div className="flex items-center p-4 justify-between max-w-lg mx-auto w-full">
                    <button onClick={() => navigate(-1)} className="flex w-10 h-10 items-center justify-center rounded-full hover:bg-gray-100 transition-colors active:scale-90">
                        <ArrowLeft size={24} className="text-gray-900" />
                    </button>
                    <h1 className="text-gray-900 text-lg font-black leading-tight flex-1 text-center">Editar Préstamo</h1>
                    <div className="w-10"></div>
                </div>
            </header>

            <main className="flex-grow p-4 max-w-lg mx-auto w-full space-y-6">
                <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6">
                    {/* Amount */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Monto Principal</label>
                        <div className="relative group">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 font-black text-xl">$</span>
                            <input type="tel" value={amount ? amount.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ''} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} 
                                className="block w-full h-16 pl-10 pr-4 rounded-2xl border-none bg-gray-50 text-gray-900 font-black text-2xl focus:ring-2 focus:ring-brand-accent transition-all" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tasa (%)</label>
                            <input type="number" value={interestRate} onChange={(e) => setInterestRate(e.target.value)}
                                className="w-full h-14 px-4 bg-gray-50 border-none rounded-2xl font-black text-lg focus:ring-2 focus:ring-brand-accent" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cuotas</label>
                            <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)}
                                className="w-full h-14 px-4 bg-gray-50 border-none rounded-2xl font-black text-lg focus:ring-2 focus:ring-brand-accent" />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Frecuencia</label>
                        <div className="grid grid-cols-4 gap-2">
                            {['daily', 'weekly', 'biweekly', 'monthly'].map(f => (
                                <button key={f} onClick={() => setFrequency(f)}
                                    className={`h-11 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all ${frequency === f ? 'bg-brand-accent border-brand-accent text-white' : 'bg-white border-gray-100 text-gray-400'}`}>
                                    {f === 'daily' ? 'Diario' : f === 'weekly' ? 'Semanal' : f === 'biweekly' ? 'Quincenal' : 'Mensual'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Desembolso</label>
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                                className="w-full h-14 px-4 bg-gray-50 border-none rounded-2xl font-bold text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">1er Pago</label>
                            <input type="date" value={firstDueDate} onChange={(e) => setFirstDueDate(e.target.value)}
                                className="w-full h-14 px-4 bg-gray-50 border-none rounded-2xl font-bold text-sm" />
                        </div>
                    </div>

                    {/* Mode Toggle */}
                    <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
                        <button type="button" onClick={() => setAdvancedMode(false)}
                            className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${!advancedMode ? 'bg-white text-brand-accent shadow-sm' : 'text-gray-400'}`}>
                            <Zap size={14} /> Simple
                        </button>
                        <button type="button" onClick={() => setAdvancedMode(true)}
                            className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${advancedMode ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-400'}`}>
                            <Settings2 size={14} /> Avanzado
                        </button>
                    </div>

                    {advancedMode && (
                        <div className="space-y-5 pt-3 border-t border-gray-100">
                             {/* Interest Type */}
                             <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-2">Tipo de Interés</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button type="button" onClick={() => setInterestType('simple')}
                                        className={`h-16 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 transition-all ${interestType === 'simple' ? 'border-brand-accent bg-blue-50' : 'border-gray-100 bg-white'}`}>
                                        <Percent size={16} className={interestType === 'simple' ? 'text-brand-accent' : 'text-gray-300'} />
                                        <span className={`text-[10px] font-black uppercase ${interestType === 'simple' ? 'text-brand-accent' : 'text-gray-400'}`}>Simple</span>
                                    </button>
                                    <button type="button" onClick={() => setInterestType('flat')}
                                        className={`h-16 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 transition-all ${interestType === 'flat' ? 'border-orange-400 bg-orange-50' : 'border-gray-100 bg-white'}`}>
                                        <DollarSign size={16} className={interestType === 'flat' ? 'text-orange-500' : 'text-gray-300'} />
                                        <span className={`text-[10px] font-black uppercase ${interestType === 'flat' ? 'text-orange-500' : 'text-gray-400'}`}>Flat</span>
                                    </button>
                                </div>
                            </div>

                            {/* Grace Days */}
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 block">Días de Gracia</label>
                                <input type="number" value={graceDays} onChange={(e) => setGraceDays(e.target.value)}
                                    className="w-full h-14 px-4 bg-gray-50 border-none rounded-2xl shadow-sm font-bold focus:ring-2 focus:ring-purple-400" />
                            </div>

                            {/* Late Fee */}
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 block">Mora</label>
                                <div className="grid grid-cols-3 gap-2 mb-3">
                                    {(['none', 'fixed', 'percent'] as const).map(t => (
                                        <button key={t} type="button" onClick={() => setLateFeeType(t)}
                                            className={`h-10 rounded-xl border text-[9px] font-black uppercase transition-all ${lateFeeType === t ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-gray-100 text-gray-400'}`}>
                                            {t === 'none' ? 'Sin cargo' : t === 'fixed' ? 'Fijo' : 'Porcentual'}
                                        </button>
                                    ))}
                                </div>
                                {lateFeeType !== 'none' && (
                                    <input type="number" value={lateFeeValue} onChange={(e) => setLateFeeValue(e.target.value)}
                                        className="w-full h-14 px-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-red-400" />
                                )}
                            </div>

                            {/* Rounding */}
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 block">Redondeo</label>
                                <div className="flex gap-2">
                                    {([0, 50, 100] as const).map(r => (
                                        <button key={r} type="button" onClick={() => setRoundTo(r)}
                                            className={`flex-1 h-10 rounded-xl border text-[10px] font-black transition-all ${roundTo === r ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-100 text-gray-400'}`}>
                                            {r === 0 ? 'Sin redondeo' : `Al $${r}`}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1 block">Notas</label>
                                <textarea className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-medium resize-none" rows={2} value={loanNotes} onChange={(e) => setLoanNotes(e.target.value)} />
                            </div>
                        </div>
                    )}

                    {/* Preview */}
                    {loanPreview && (
                        <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white">
                            <div className="flex items-center gap-2 mb-3">
                                <RotateCcw size={11} className="text-blue-200" />
                                <p className="text-[9px] font-black uppercase tracking-widest text-blue-200">Nueva Proyección</p>
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-center">
                                <div><p className="text-[8px] text-blue-200 uppercase mb-0.5">Cuota Principal</p><p className="text-sm font-black">{formatCurrency(loanPreview.cuota)}</p></div>
                                <div><p className="text-[8px] text-blue-200 uppercase mb-0.5">Interés Cuota</p><p className="text-sm font-black">{formatCurrency(loanPreview.totalInterest)}</p></div>
                                <div><p className="text-[8px] text-blue-200 uppercase mb-0.5">Saldo Capital</p><p className="text-sm font-black">{formatCurrency(loanPreview.totalExpected)}</p></div>
                            </div>
                        </div>
                    )}
                </section>
            </main>

            <footer className="sticky bottom-0 bg-white border-t border-gray-100 p-4 z-40 safe-bottom">
                <div className="max-w-lg mx-auto w-full">
                    <button onClick={handleUpdate} disabled={saving}
                        className="w-full h-16 bg-brand-accent text-white font-black rounded-2xl flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all text-lg">
                        {saving ? <Loader2 className="animate-spin" size={24} /> : <><CheckCircle2 size={24} /> Guardar Cambios</>}
                    </button>
                </div>
            </footer>
        </div>
    );
}
