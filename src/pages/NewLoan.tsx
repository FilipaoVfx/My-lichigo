import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClients } from '../hooks/useClients.ts';
import { useLoans } from '../hooks/useLoans.ts';
import { ArrowLeft, ArrowRight, Search, Loader2, CheckCircle2, ChevronRight, User } from 'lucide-react';

export default function NewLoan() {
    const { clients } = useClients();
    // useLoans expects a clientId for fetching, but for creation we can pass empty
    const { addLoan } = useLoans('');
    const navigate = useNavigate();

    // Step state
    const [step, setStep] = useState(1);

    // Form state
    const [selectedClientId, setSelectedClientId] = useState('');
    const [amount, setAmount] = useState('');
    const [interestRate, setInterestRate] = useState('10');
    const [frequency, setFrequency] = useState('monthly');
    const [duration, setDuration] = useState('');
    const [startDate] = useState(new Date().toISOString().split('T')[0]);

    // UI state
    const [saving, setSaving] = useState(false);
    const [isIdFocused, setIsIdFocused] = useState(false);

    const handleNext = () => {
        if (step === 1 && (!selectedClientId || !amount)) {
            alert('Por favor selecciona un cliente y el monto.');
            return;
        }
        setStep(prev => prev + 1);
    };

    const handleBack = () => {
        if (step === 1) {
            navigate(-1);
        } else {
            setStep(prev => prev - 1);
        }
    };

    const handleSubmit = async () => {
        setSaving(true);
        const { error } = await addLoan({
            client_id: selectedClientId,
            principal_amount: parseFloat(amount),
            interest_type: 'simple',
            interest_rate: parseFloat(interestRate) / 100, // Converting % to decimal if that's what's expected? Let's check useLoans calculation
            interest_rate_period: frequency as any,
            payment_frequency: frequency as any,
            term_count: duration ? parseInt(duration) : 1,
            disbursement_date: startDate,
            first_due_date: startDate, // Simple approach for now
            grace_days: 0,
            late_fee_type: 'none',
            late_fee_value: 0,
            notes: null
        });

        setSaving(false);
        if (!error) {
            navigate(`/clientes/${selectedClientId}`);
        } else {
            alert(`Error: ${error}`);
        }
    };

    // Calculate progress
    const progress = (step / 3) * 100;

    return (
        <div className="flex flex-col min-h-screen bg-gray-50 pb-24 font-sans text-gray-900">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-40 bg-white border-b border-gray-100 flex flex-col shadow-sm">
                <div className="flex items-center p-4 justify-between max-w-lg mx-auto w-full">
                    <button
                        onClick={handleBack}
                        className="flex w-10 h-10 items-center justify-center rounded-full hover:bg-gray-100 transition-colors active:scale-90"
                    >
                        <ArrowLeft size={24} className="text-gray-900" />
                    </button>
                    <h1 className="text-gray-900 text-lg font-black leading-tight flex-1 text-center">Nuevo Préstamo</h1>
                    <div className="w-10"></div>
                </div>

                {/* Progress Indicator */}
                <div className="px-4 pb-4 max-w-lg mx-auto w-full">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Paso {step} de 3</span>
                        <span className="text-brand-accent text-xs font-black">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 w-full bg-blue-50 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-brand-accent rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 max-w-lg mx-auto w-full">
                {step === 1 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <section className="pt-4">
                            <h2 className="text-2xl font-black text-gray-900 mb-2 leading-tight">Detalles iniciales</h2>
                            <p className="text-gray-400 text-sm font-medium">Buscamos al cliente y establecemos el capital a prestar.</p>
                        </section>

                        <div className="space-y-6">
                            {/* Select Client Field */}
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1" htmlFor="client-select">
                                    Seleccionar cliente
                                </label>
                                <div className={`relative transition-all duration-300 ${isIdFocused ? 'ring-2 ring-brand-accent ring-offset-2' : ''}`}>
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                                        <Search className={`h-5 w-5 transition-colors ${isIdFocused ? 'text-brand-accent' : 'text-gray-300'}`} />
                                    </span>
                                    <select
                                        id="client-select"
                                        value={selectedClientId}
                                        onFocus={() => setIsIdFocused(true)}
                                        onBlur={() => setIsIdFocused(false)}
                                        onChange={(e) => {
                                            setSelectedClientId(e.target.value);
                                        }}
                                        className="block w-full h-16 pl-12 pr-10 rounded-2xl bg-white border-none shadow-sm text-gray-900 font-bold focus:ring-0 transition-all appearance-none"
                                    >
                                        <option value="" disabled>Buscar o seleccionar cliente</option>
                                        {clients.map(client => (
                                            <option key={client.id} value={client.id}>
                                                {client.first_name} {client.last_name}
                                            </option>
                                        ))}
                                    </select>
                                    <span className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                                        <ChevronRight size={18} className="text-gray-300 rotate-90" />
                                    </span>
                                </div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider px-1">Tip: Los clientes aparecen por orden alfabético.</p>
                            </div>

                            {/* Principal Amount Field */}
                            <div className="flex flex-col gap-2 pt-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1" htmlFor="amount">
                                    Monto Principal
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <span className="text-gray-400 font-black text-xl group-focus-within:text-brand-accent transition-colors">$</span>
                                    </div>
                                    <input
                                        id="amount"
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="block w-full h-16 pl-10 pr-4 rounded-2xl border-none bg-white shadow-sm text-gray-900 font-black text-2xl placeholder:text-gray-200 focus:ring-2 focus:ring-brand-accent transition-all"
                                    />
                                </div>

                                {/* Quick Suggestion chips */}
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {['1000', '5000', '10000'].map(val => (
                                        <button
                                            key={val}
                                            onClick={() => setAmount(val)}
                                            className={`px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-wider transition-all ${amount === val ? 'bg-brand-accent border-brand-accent text-white shadow-md' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-300'}`}
                                        >
                                            ${parseInt(val).toLocaleString()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        <section className="pt-4">
                            <h2 className="text-2xl font-black text-gray-900 mb-2 leading-tight">Configurar Interés</h2>
                            <p className="text-gray-400 text-sm font-medium">Establece los términos de cobro y frecuencia.</p>
                        </section>

                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tasa de Interés (%)</label>
                                    <input
                                        type="number"
                                        value={interestRate}
                                        onChange={(e) => setInterestRate(e.target.value)}
                                        className="w-full h-14 px-4 bg-white border-none rounded-2xl shadow-sm font-black text-lg focus:ring-2 focus:ring-brand-accent"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Duración (Opcional)</label>
                                    <input
                                        type="number"
                                        value={duration}
                                        onChange={(e) => setDuration(e.target.value)}
                                        placeholder="1"
                                        className="w-full h-14 px-4 bg-white border-none rounded-2xl shadow-sm font-black text-lg focus:ring-2 focus:ring-brand-accent placeholder:text-gray-200"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Frecuencia de Pago</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['daily', 'weekly', 'monthly'].map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setFrequency(f)}
                                            className={`h-12 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${frequency === f ? 'bg-brand-accent border-brand-accent text-white' : 'bg-white border-gray-100 text-gray-400'}`}
                                        >
                                            {f === 'daily' ? 'Diario' : f === 'weekly' ? 'Semanal' : 'Mensual'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        <section className="pt-4">
                            <h2 className="text-2xl font-black text-gray-900 mb-2 leading-tight">Resumen Final</h2>
                            <p className="text-gray-400 text-sm font-medium">Verifica los datos antes de dar de alta el crédito.</p>
                        </section>

                        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 space-y-6">
                            <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
                                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400">
                                    <User size={28} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente Seleccionado</p>
                                    <h3 className="text-lg font-black text-gray-900">
                                        {clients.find(c => c.id === selectedClientId)?.first_name} {clients.find(c => c.id === selectedClientId)?.last_name}
                                    </h3>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-y-6">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Monto Principal</p>
                                    <p className="text-xl font-black text-brand-accent">${parseFloat(amount).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tasa de Interés</p>
                                    <p className="text-xl font-black text-gray-900">{interestRate}%</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Frecuencia</p>
                                    <p className="text-lg font-black text-gray-900 uppercase">
                                        {frequency === 'daily' ? 'Diario' : frequency === 'weekly' ? 'Semanal' : 'Mensual'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Cuotas/Meses</p>
                                    <p className="text-lg font-black text-gray-900">{duration || '1 (Mínimo)'}</p>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-50">
                                <div className="bg-green-50 rounded-2xl p-4 flex items-center gap-3">
                                    <CheckCircle2 size={24} className="text-green-500" />
                                    <p className="text-xs font-bold text-green-700">Crédito listo para ser procesado.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Sticky Bottom Actions */}
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
