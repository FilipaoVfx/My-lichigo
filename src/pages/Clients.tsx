import { useState } from 'react';
import { Plus, Search, User, X, Trash2, Smartphone, Loader2, ChevronRight, UserPlus, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useClients } from '../hooks/useClients.ts';
import type { Client } from '../types/client.ts';

export default function Clients() {
    const { clients, loading, error, addClient } = useClients();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [isIdFocused, setIsIdFocused] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form State
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [documentId, setDocumentId] = useState('');
    const [address, setAddress] = useState('');

    const filteredClients = clients.filter(client => {
        const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
        const phoneNum = client.phone || '';
        const term = searchTerm.toLowerCase();
        return fullName.includes(term) || phoneNum.includes(term);
    });

    const handleAddClient = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const { error } = await addClient({
            first_name: firstName,
            last_name: lastName,
            phone: phone || null,
            document_id: documentId || null,
            address: address || null,
            status: 'active',
            notes: null
        });

        setSaving(false);
        if (!error) {
            setIsModalOpen(false);
            setFirstName('');
            setLastName('');
            setPhone('');
            setDocumentId('');
            setAddress('');
        } else {
            alert(`Error: ${error}`);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-gray-50 pb-24 font-sans text-gray-900">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-4 flex flex-col gap-4 shadow-sm">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 leading-tight">Clientes</h1>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{clients.length} Total Registrados</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-brand-accent hover:bg-blue-700 text-white w-10 h-10 rounded-full shadow-lg shadow-blue-500/20 active:scale-90 transition-all flex items-center justify-center"
                    >
                        <Plus size={24} />
                    </button>
                </div>

                {/* Search Input */}
                <div className={`relative transition-all duration-300 ${isIdFocused ? 'ring-2 ring-brand-accent ring-offset-2' : ''}`}>
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search className={`h-5 w-5 transition-colors ${isIdFocused ? 'text-brand-accent' : 'text-gray-400'}`} />
                    </span>
                    <input
                        type="text"
                        placeholder="Buscar por nombre o teléfono..."
                        value={searchTerm}
                        onFocus={() => setIsIdFocused(true)}
                        onBlur={() => setIsIdFocused(false)}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-4 py-3 border-none rounded-2xl bg-gray-50 focus:bg-white text-sm font-medium transition-all focus:ring-0"
                    />
                </div>
            </header>

            <main className="p-4 flex-grow">
                {error && (
                    <div className="bg-red-50 text-red-700 p-4 rounded-2xl border border-red-100 mb-6 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                        <Trash2 size={20} />
                        <p className="text-sm font-bold">{error}</p>
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="animate-spin text-brand-accent mb-4" size={40} />
                        <p className="text-gray-400 font-medium italic">Sincronizando clientes...</p>
                    </div>
                ) : filteredClients.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-300 mb-6">
                            <User size={40} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Sin Resultados</h3>
                        <p className="text-sm text-gray-400 max-w-[200px] leading-relaxed">No encontramos clientes que coincidan con tu búsqueda.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredClients.map((client: Client) => (
                            <article
                                key={client.id}
                                onClick={() => navigate(`/clientes/${client.id}`)}
                                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 active:scale-[0.98] transition-all cursor-pointer group"
                            >
                                <div className="w-12 h-12 rounded-xl bg-gray-50 rotate-3 group-hover:rotate-0 transition-transform flex items-center justify-center text-gray-400 font-bold text-lg border border-gray-100">
                                    {client.first_name[0]}{client.last_name[0]}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-800 truncate">{client.first_name} {client.last_name}</h3>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <Smartphone size={10} className="text-gray-300" />
                                        <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase truncate">{client.phone || 'Sin teléfono'}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${client.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {client.status === 'active' ? 'Activo' : 'Inactivo'}
                                    </span>
                                    <ChevronRight size={18} className="text-gray-200 group-hover:text-brand-accent transition-colors" />
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </main>

            {/* Modal - New Client Bottom Sheet */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center px-0 pb-0">
                    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)}></div>
                    <div className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900">Nuevo Cliente</h2>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Completa los datos del prospecto</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleAddClient} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1" htmlFor="firstName">Nombres</label>
                                    <input
                                        id="firstName"
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        required
                                        className="w-full px-4 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-accent font-bold placeholder-gray-200"
                                        placeholder="Juan"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1" htmlFor="lastName">Apellidos</label>
                                    <input
                                        id="lastName"
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        required
                                        className="w-full px-4 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-accent font-bold placeholder-gray-200"
                                        placeholder="Pérez"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1" htmlFor="phone">Teléfono de contacto <span className="normal-case font-normal">(opcional)</span></label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300">
                                        <Smartphone size={16} />
                                    </span>
                                    <input
                                        id="phone"
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-accent font-bold placeholder-gray-200"
                                        placeholder="+1 234 567 8900"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1" htmlFor="documentId">Cédula / ID <span className="normal-case font-normal">(opcional)</span></label>
                                    <input
                                        id="documentId"
                                        type="text"
                                        value={documentId}
                                        onChange={(e) => setDocumentId(e.target.value)}
                                        className="w-full px-4 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-accent font-bold placeholder-gray-200"
                                        placeholder="12345678"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1" htmlFor="address">Dirección <span className="normal-case font-normal">(opcional)</span></label>
                                    <input
                                        id="address"
                                        type="text"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        className="w-full px-4 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-accent font-bold placeholder-gray-200"
                                        placeholder="Calle 123 #45-67"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex flex-col gap-3">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full bg-brand-accent hover:bg-blue-700 text-white h-16 rounded-2xl font-black shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-lg flex items-center justify-center gap-3"
                                >
                                    {saving ? (
                                        <Loader2 className="animate-spin" size={24} />
                                    ) : (
                                        <>
                                            <UserPlus size={24} />
                                            Crear
                                        </>
                                    )}
                                </button>
                                <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                                    <ShieldCheck size={12} />
                                    Datos Seguros
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
