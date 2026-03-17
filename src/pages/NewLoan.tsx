import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClients } from '../hooks/useClients.ts';
import { useLoans } from '../hooks/useLoans.ts';
import { formatCurrency } from '../lib/format.ts';
import { ArrowLeft, ArrowRight, Search, Loader2, CheckCircle2, ChevronRight, User, Settings2, Zap, Percent, DollarSign, Shield, AlertTriangle, RotateCcw } from 'lucide-react';

// ─── Loan Calculator Engine ────────────────────────────────────────────────────
function calcLoanPreview({
    principal,
    ratePercent,
    termCount,
    roundTo,
}: {
    principal: number;
    ratePercent: number;
    termCount: number;
    interestType: 'simple' | 'flat';
    roundTo: number;
}) {
    if (!principal || !ratePercent) return null;
    const effectiveTerms = termCount || 1;
    const rate = ratePercent / 100;
    const totalInterestRaw = principal * rate * effectiveTerms;
    let totalExpected = principal + totalInterestRaw;
    let cuota = totalExpected / effectiveTerms;

    if (roundTo > 1) {
        cuota = Math.ceil(cuota / roundTo) * roundTo;
        totalExpected = cuota * effectiveTerms;
    } else {
        cuota = Math.round(cuota);
        totalExpected = Math.round(totalExpected);
    }

    return { totalExpected, cuota, totalInterest: totalExpected - principal };
}

export default function NewLoan() {
    const { clients } = useClients();
    const { addLoan } = useLoans('');
    const navigate = useNavigate();

    const [step, setStep] = useState(1);

    // Simple fields
    const [selectedClientId, setSelectedClientId] = useState('');
    const [amount, setAmount] = useState('');
    const [interestRate, setInterestRate] = useState('10');
    const [frequency, setFrequency] = useState('monthly');
    const [duration, setDuration] = useState('');
    const [startDate] = useState(new Date().toISOString().split('T')[0]);

    // Advanced fields
    const [advancedMode, setAdvancedMode] = useState(false);
    const [interestType, setInterestType] = useState<'simple' | 'flat'>('simple');
    const [graceDays, setGraceDays] = useState('0');
    const [lateFeeType, setLateFeeType] = useState<'none' | 'fixed' | 'percent'>('none');
    const [lateFeeValue, setLateFeeValue] = useState('0');
    const [roundTo, setRoundTo] = useState<0 | 50 | 100>(0);
    const [loanNotes, setLoanNotes] = useState('');

    // UI state
    const [saving, setSaving] = useState(false);
    const [isIdFocused, setIsIdFocused] = useState(false);

    const loanPreview = useMemo(() => calcLoanPreview({
        principal: parseFloat(amount) || 0,
        ratePercent: parseFloat(interestRate) || 0,
        termCount: parseInt(duration) || 0,
        interestType,
        roundTo: roundTo || 1,
    }), [amount, interestRate, duration, interestType, roundTo]);

    const handleNext = () => {
        if (step === 1 && (!selectedClientId || !amount)) {
            alert('Por favor selecciona un cliente y el monto.');
            return;
        }
        setStep(prev => prev + 1);
    };

    const handleBack = () => {
        if (step === 1) { navigate(-1); }
        else { setStep(prev => prev - 1); }
    };

    const handleSubmit = async () => {
        setSaving(true);
        const { error } = await addLoan({
            client_id: selectedClientId,
            principal_amount: parseFloat(amount),
            interest_type: interestType,
            interest_rate: parseFloat(interestRate) / 100,
            interest_rate_period: frequency as any,
            payment_frequency: frequency as any,
            term_count: duration ? parseInt(duration) : 0,
            disbursement_date: startDate,
            first_due_date: startDate,
            grace_days: parseInt(graceDays) || 0,
            late_fee_type: lateFeeType,
            late_fee_value: parseFloat(lateFeeValue) || 0,
            notes: loanNotes || null,
        });

        setSaving(false);
        if (!error) {
            navigate(`/clientes/${selectedClientId}`);
        } else {
            alert(`Error: ${error}`);
        }
    };

    const progress = (step / 3) * 100;

    return (
        <div className="flex flex-col min-h-screen bg-gray-50 pb-24 font-sans text-gray-900">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white border-b border-gray-100 flex flex-col shadow-sm">
                <div className="flex items-center p-4 justify-between max-w-lg mx-auto w-full">
                    <button onClick={handleBack} className="flex w-10 h-10 items-center justify-center rounded-full hover:bg-gray-100 transition-colors active:scale-90">
                        <ArrowLeft size={24} className="text-gray-900" />
                    </button>
                    <h1 className="text-gray-900 text-lg font-black leading-tight flex-1 text-center">Nuevo Préstamo</h1>
                    <div className="w-10"></div>
                </div>
                <div className="px-4 pb-4 max-w-lg mx-auto w-full">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Paso {step} de 3</span>
                        <span className="text-brand-accent text-xs font-black">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 w-full bg-blue-50 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-accent rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            </header>

            <main className="flex-grow p-4 max-w-lg mx-auto w-full">
                {/* ── STEP 1 ── */}
                {step === 1 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <section className="pt-4">
                            <h2 className="text-2xl font-black text-gray-900 mb-2 leading-tight">Detalles iniciales</h2>
                            <p className="text-gray-400 text-sm font-medium">Selecciona el cliente y el capital a prestar.</p>
                        </section>

                        <div className="space-y-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1" htmlFor="client-select">Seleccionar cliente</label>
                                <div className={`relative transition-all duration-300 ${isIdFocused ? 'ring-2 ring-brand-accent ring-offset-2' : ''}`}>
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                                        <Search className={`h-5 w-5 transition-colors ${isIdFocused ? 'text-brand-accent' : 'text-gray-300'}`} />
                                    </span>
                                    <select
                                        id="client-select"
                                        value={selectedClientId}
                                        onFocus={() => setIsIdFocused(true)}
                                        onBlur={() => setIsIdFocused(false)}
                                        onChange={(e) => setSelectedClientId(e.target.value)}
                                        className="block w-full h-16 pl-12 pr-10 rounded-2xl bg-white border-none shadow-sm text-gray-900 font-bold focus:ring-0 transition-all appearance-none"
                                    >
                                        <option value="" disabled>Buscar o seleccionar cliente</option>
                                        {clients.map(client => (
                                            <option key={client.id} value={client.id}>{client.first_name} {client.last_name}</option>
                                        ))}
                                    </select>
                                    <span className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                                        <ChevronRight size={18} className="text-gray-300 rotate-90" />
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 pt-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1" htmlFor="nl-amount">Monto Principal</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <span className="text-gray-400 font-black text-xl group-focus-within:text-brand-accent transition-colors">$</span>
                                    </div>
                                    <input id="nl-amount" type="tel" value={amount ? amount.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ''} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} placeholder="0"
                                        className="block w-full h-16 pl-10 pr-4 rounded-2xl border-none bg-white shadow-sm text-gray-900 font-black text-2xl placeholder:text-gray-200 focus:ring-2 focus:ring-brand-accent transition-all" />
                                </div>
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {['50000', '100000', '200000', '500000'].map(val => (
                                        <button key={val} onClick={() => setAmount(val)}
                                            className={`px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-wider transition-all ${amount === val ? 'bg-brand-accent border-brand-accent text-white shadow-md' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-300'}`}>
                                            ${(parseInt(val) / 1000).toFixed(0)}k
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── STEP 2 ── */}
                {step === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                        <section className="pt-4">
                            <h2 className="text-2xl font-black text-gray-900 mb-2 leading-tight">Configurar Interés</h2>
                            <p className="text-gray-400 text-sm font-medium">Establece los términos de cobro y frecuencia.</p>
                        </section>

                        {/* Mode Toggle */}
                        <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
                            <button type="button" onClick={() => setAdvancedMode(false)}
                                className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${!advancedMode ? 'bg-white text-brand-accent shadow-sm' : 'text-gray-400'}`}>
                                <Zap size={14} /> Modo Simple
                            </button>
                            <button type="button" onClick={() => setAdvancedMode(true)}
                                className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${advancedMode ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-400'}`}>
                                <Settings2 size={14} /> Avanzado
                            </button>
                        </div>

                        <div className="space-y-5">
                            {/* Rate + Term */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">Tasa (%)</label>
                                    <input type="number" value={interestRate} onChange={(e) => setInterestRate(e.target.value)}
                                        className="w-full h-14 px-4 bg-white border-none rounded-2xl shadow-sm font-black text-lg focus:ring-2 focus:ring-brand-accent" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">Cuotas (Opcional)</label>
                                    <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="1"
                                        className="w-full h-14 px-4 bg-white border-none rounded-2xl shadow-sm font-black text-lg focus:ring-2 focus:ring-brand-accent placeholder:text-gray-200" />
                                </div>
                            </div>

                            {/* Frequency */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">Frecuencia de Pago</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {['daily', 'weekly', 'biweekly', 'monthly'].map(f => (
                                        <button key={f} onClick={() => setFrequency(f)}
                                            className={`h-12 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all ${frequency === f ? 'bg-brand-accent border-brand-accent text-white' : 'bg-white border-gray-100 text-gray-400'}`}>
                                            {f === 'daily' ? 'Diario' : f === 'weekly' ? 'Semanal' : f === 'biweekly' ? 'Quincenal' : 'Mensual'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Advanced */}
                            {advancedMode && (
                                <div className="space-y-5 pt-3 border-t border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <Shield size={13} className="text-purple-500" />
                                        <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Parámetros Avanzados</p>
                                    </div>

                                    {/* Interest Type */}
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-2">Tipo de Interés</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button type="button" onClick={() => setInterestType('simple')}
                                                className={`h-16 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 transition-all ${interestType === 'simple' ? 'border-brand-accent bg-blue-50' : 'border-gray-100 bg-white'}`}>
                                                <Percent size={16} className={interestType === 'simple' ? 'text-brand-accent' : 'text-gray-300'} />
                                                <span className={`text-[10px] font-black uppercase ${interestType === 'simple' ? 'text-brand-accent' : 'text-gray-400'}`}>Simple</span>
                                                <span className="text-[8px] text-gray-400">sobre el saldo</span>
                                            </button>
                                            <button type="button" onClick={() => setInterestType('flat')}
                                                className={`h-16 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 transition-all ${interestType === 'flat' ? 'border-orange-400 bg-orange-50' : 'border-gray-100 bg-white'}`}>
                                                <DollarSign size={16} className={interestType === 'flat' ? 'text-orange-500' : 'text-gray-300'} />
                                                <span className={`text-[10px] font-black uppercase ${interestType === 'flat' ? 'text-orange-500' : 'text-gray-400'}`}>Flat</span>
                                                <span className="text-[8px] text-gray-400">sobre el capital</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Grace Days */}
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 block">Días de Gracia <span className="normal-case font-medium">(antes de cobrar mora)</span></label>
                                        <div className="flex gap-2 items-center">
                                            <input type="number" min="0" max="30" value={graceDays} onChange={(e) => setGraceDays(e.target.value)}
                                                className="w-20 px-3 py-3 bg-white border-none rounded-2xl shadow-sm font-bold text-center focus:ring-2 focus:ring-purple-400" />
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
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 block">Cargo por Mora</label>
                                        <div className="grid grid-cols-3 gap-2 mb-3">
                                            {(['none', 'fixed', 'percent'] as const).map(t => (
                                                <button key={t} type="button" onClick={() => setLateFeeType(t)}
                                                    className={`h-10 rounded-xl border text-[9px] font-black uppercase transition-all ${lateFeeType === t ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-gray-100 text-gray-400'}`}>
                                                    {t === 'none' ? 'Sin cargo' : t === 'fixed' ? 'Fijo ($)' : 'Porcentaje'}
                                                </button>
                                            ))}
                                        </div>
                                        {lateFeeType !== 'none' && (
                                            <>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{lateFeeType === 'fixed' ? '$' : '%'}</span>
                                                    <input type="number" min="0" step="0.01" value={lateFeeValue} onChange={(e) => setLateFeeValue(e.target.value)}
                                                        placeholder={lateFeeType === 'fixed' ? 'Ej: 5000' : 'Ej: 2'}
                                                        className="w-full pl-9 pr-4 py-3 bg-white border-none rounded-2xl shadow-sm font-bold focus:ring-2 focus:ring-red-400" />
                                                </div>
                                                <p className="text-[9px] text-gray-400 font-medium mt-1.5 ml-1 flex items-center gap-1">
                                                    <AlertTriangle size={10} className="text-amber-400" />
                                                    {lateFeeType === 'fixed' ? 'Monto fijo por período en mora' : 'Se aplica sobre la cuota vencida'}
                                                </p>
                                            </>
                                        )}
                                    </div>

                                    {/* Rounding */}
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 block">Redondeo de Cuota</label>
                                        <div className="flex gap-2">
                                            {([0, 50, 100] as const).map(r => (
                                                <button key={r} type="button" onClick={() => setRoundTo(r)}
                                                    className={`flex-1 h-10 rounded-xl border text-[10px] font-black transition-all ${roundTo === r ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-100 text-gray-400'}`}>
                                                    {r === 0 ? 'Sin redondeo' : `Al $${r}`}
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-[9px] text-gray-400 font-medium mt-1.5 ml-1">Redondea la cuota hacia arriba. Ideal para cobros en efectivo.</p>
                                    </div>

                                    {/* Notes */}
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1 block">Notas <span className="normal-case font-medium">(opcional)</span></label>
                                        <textarea className="w-full bg-white border-none rounded-2xl shadow-sm p-4 text-sm font-medium text-gray-700 placeholder-gray-300 focus:ring-2 focus:ring-purple-400 resize-none" rows={2} value={loanNotes} onChange={(e) => setLoanNotes(e.target.value)} placeholder="Garantías, condiciones especiales..." />
                                    </div>
                                </div>
                            )}

                            {/* Live Preview */}
                            {loanPreview ? (
                                <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white">
                                    <div className="flex items-center gap-2 mb-3">
                                        <RotateCcw size={11} className="text-blue-200" />
                                        <p className="text-[9px] font-black uppercase tracking-widest text-blue-200">Vista Previa en Tiempo Real</p>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 text-center">
                                        <div>
                                            <p className="text-[8px] text-blue-200 font-black uppercase mb-0.5">Cuota</p>
                                            <p className="text-base font-black">{formatCurrency(loanPreview.cuota)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] text-blue-200 font-black uppercase mb-0.5">Interés Total</p>
                                            <p className="text-base font-black">{formatCurrency(loanPreview.totalInterest)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] text-blue-200 font-black uppercase mb-0.5">Total a Cobrar</p>
                                            <p className="text-base font-black">{formatCurrency(loanPreview.totalExpected)}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 p-4 text-center">
                                    <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Completa tasa y cuotas para ver la proyección</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── STEP 3 ── */}
                {step === 3 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        <section className="pt-4">
                            <h2 className="text-2xl font-black text-gray-900 mb-2 leading-tight">Resumen Final</h2>
                            <p className="text-gray-400 text-sm font-medium">Verifica los datos antes de crear el crédito.</p>
                        </section>

                        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 space-y-6">
                            <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
                                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400">
                                    <User size={28} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</p>
                                    <h3 className="text-lg font-black text-gray-900">
                                        {clients.find(c => c.id === selectedClientId)?.first_name} {clients.find(c => c.id === selectedClientId)?.last_name}
                                    </h3>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-y-5">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Principal</p>
                                    <p className="text-xl font-black text-brand-accent">{formatCurrency(parseFloat(amount))}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tasa</p>
                                    <p className="text-xl font-black text-gray-900">{interestRate}%</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Frecuencia</p>
                                    <p className="text-lg font-black text-gray-900 uppercase">
                                        {frequency === 'daily' ? 'Diario' : frequency === 'weekly' ? 'Semanal' : frequency === 'biweekly' ? 'Quincenal' : 'Mensual'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Cuotas</p>
                                    <p className="text-lg font-black text-gray-900">{duration || '1'}</p>
                                </div>
                                {advancedMode && (
                                    <>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tipo Interés</p>
                                            <p className="text-sm font-black text-gray-700 uppercase">
                                                {interestType === 'simple' ? 'Simple' : 'Flat'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Días de Gracia</p>
                                            <p className="text-sm font-black text-gray-700">{graceDays}d</p>
                                        </div>
                                        {lateFeeType !== 'none' && (
                                            <div className="col-span-2">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Mora</p>
                                                <p className="text-sm font-black text-red-600">
                                                    {lateFeeType === 'fixed' ? '$' : ''}{lateFeeValue}{lateFeeType === 'percent' ? '%' : ''} ({lateFeeType === 'fixed' ? 'Fijo' : 'Porcentual'})
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {loanPreview && (
                                <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white">
                                    <div className="flex items-center gap-2 mb-3">
                                        <RotateCcw size={11} className="text-blue-200" />
                                        <p className="text-[9px] font-black uppercase tracking-widest text-blue-200">Proyección de Cobro</p>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 text-center">
                                        <div>
                                            <p className="text-[8px] text-blue-200 font-black uppercase mb-0.5">Por Cuota</p>
                                            <p className="text-lg font-black">{formatCurrency(loanPreview.cuota)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] text-blue-200 font-black uppercase mb-0.5">Interés</p>
                                            <p className="text-lg font-black">{formatCurrency(loanPreview.totalInterest)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] text-blue-200 font-black uppercase mb-0.5">Total</p>
                                            <p className="text-lg font-black">{formatCurrency(loanPreview.totalExpected)}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="pt-2 border-t border-gray-50">
                                <div className="bg-green-50 rounded-2xl p-4 flex items-center gap-3">
                                    <CheckCircle2 size={24} className="text-green-500" />
                                    <p className="text-xs font-bold text-green-700">Crédito listo para ser procesado.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="sticky bottom-0 bg-white/80 backdrop-blur-md border-t border-gray-100 p-4 z-40 safe-bottom">
                <div className="max-w-lg mx-auto w-full">
                    <button
                        onClick={step === 3 ? handleSubmit : handleNext}
                        disabled={saving}
                        className="w-full h-16 bg-brand-accent hover:bg-blue-700 text-white font-black rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-lg"
                    >
                        {saving ? (
                            <Loader2 className="animate-spin" size={24} />
                        ) : (
                            <>
                                <span>{step === 3 ? 'Finalizar y Crear' : 'Siguiente Paso'}</span>
                                {step < 3 && <ArrowRight size={24} />}
                            </>
                        )}
                    </button>
                </div>
            </footer>
        </div>
    );
}
