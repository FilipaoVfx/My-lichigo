import { useEffect, useState } from 'react';
import { useHistory, type ActivityEntry } from '../hooks/useHistory.ts';
import { useClients } from '../hooks/useClients.ts';
import { formatCurrency, formatDate } from '../lib/format.ts';
import { 
    Clock, 
    StickyNote, 
    Search, 
    User, 
    ChevronRight,
    ArrowUpRight,
    Calendar,
    ArrowDownLeft,
    Loader2,
    Filter,
    X,
    ChevronDown
} from 'lucide-react';

export default function History() {
    const { activities, loading, fetchHistory } = useHistory();
    const { clients } = useClients();
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    const selectedClient = clients.find(c => c.id === selectedClientId);

    useEffect(() => {
        fetchHistory({ client_id: selectedClientId });
    }, [fetchHistory, selectedClientId]);

    const filteredActivities = activities.filter(a => 
        a.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.content?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getActivityIcon = (type: ActivityEntry['type']) => {
        switch (type) {
            case 'payment':
                return <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><ArrowDownLeft size={20} /></div>;
            case 'interest_payment':
                return <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><ArrowUpRight size={20} /></div>;
            case 'partial_payment':
                return <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center"><ArrowDownLeft size={20} /></div>;
            case 'note':
                return <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center"><StickyNote size={20} /></div>;
            default:
                return <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center"><Clock size={20} /></div>;
        }
    };

    const getActivityTitle = (activity: ActivityEntry) => {
        switch (activity.type) {
            case 'payment':
                return 'Pago de Cuota';
            case 'interest_payment':
                return 'Abono de Interés';
            case 'partial_payment':
                return 'Abono Parcial';
            case 'note':
                return 'Nota registrada';
            default:
                return 'Actividad';
        }
    };

    return (
        <div className="container pb-24">
            <header className="mb-8">
                <h1 className="text-3xl font-black text-gray-900 mb-1">Historial</h1>
                <p className="text-gray-400 font-medium">Bitácora de actividades y movimientos</p>
            </header>

            {/* Filters Section */}
            <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-100 mb-8 flex flex-col gap-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 relative group">
                        <div className={`flex items-center gap-3 px-4 py-3 pb-2 rounded-2xl transition-all duration-300 ${isSearchFocused ? 'bg-white ring-2 ring-brand-accent/20' : 'bg-gray-50 hover:bg-gray-100'}`}>
                            <Search className={`${isSearchFocused ? 'text-brand-accent' : 'text-gray-400'}`} size={18} />
                            <div className="flex-1 flex flex-col min-w-0">
                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Buscar</span>
                                <input 
                                    type="text" 
                                    placeholder="Movimiento o cliente..." 
                                    className="w-full bg-transparent border-none p-0 focus:ring-0 font-bold text-gray-700 placeholder-gray-200"
                                    value={searchTerm}
                                    onFocus={() => setIsSearchFocused(true)}
                                    onBlur={() => setIsSearchFocused(false)}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="p-1 hover:bg-gray-200 rounded-full text-gray-400">
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="relative">
                        <div className="flex items-center gap-2 px-4 py-3 pb-2 rounded-2xl bg-indigo-50 border border-indigo-100 cursor-pointer hover:bg-indigo-100 transition-all group">
                            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                                <Filter size={16} />
                            </div>
                            <div className="flex flex-col pr-6">
                                <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Filtrar por Cliente</span>
                                <span className="text-sm font-black text-indigo-700 truncate max-w-[120px]">
                                    {selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name}` : 'Todos'}
                                </span>
                            </div>
                            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-300 group-hover:text-indigo-600 transition-colors" />
                            
                            {/* Native Picker Backdrop */}
                            <select
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                value={selectedClientId}
                                onChange={(e) => setSelectedClientId(e.target.value)}
                            >
                                <option value="">Todos los clientes</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Quick Shortcuts (Optional) */}
                {selectedClientId && (
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter">Filtro Activo:</span>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-brand-accent/10 border border-brand-accent/20 rounded-full text-[10px] font-black text-brand-accent uppercase">
                            {selectedClient?.first_name}
                            <button onClick={() => setSelectedClientId('')}>
                                <X size={10} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Timeline */}
            <div className="space-y-6 relative">
                {/* Vertical Line */}
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-100 ml-px"></div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-12">
                        <Loader2 className="animate-spin text-brand-accent" size={32} />
                        <p className="text-gray-400 mt-4 font-medium">Cargando bitácora...</p>
                    </div>
                ) : filteredActivities.length === 0 ? (
                    <div className="text-center py-20 bg-surface rounded-3xl border border-dashed border-gray-200">
                        <Clock className="mx-auto text-gray-200 mb-4" size={48} />
                        <p className="text-gray-400 font-medium font-medium">No se encontraron actividades</p>
                    </div>
                ) : (
                    filteredActivities.map((activity, index) => (
                        <div key={activity.id} className="relative flex gap-4 animate-in fade-in slide-in-from-left duration-300" style={{ animationDelay: `${index * 50}ms` }}>
                            {/* Icon container with shadow and background to cover the line */}
                            <div className="relative z-10 p-0.5 bg-background">
                                {getActivityIcon(activity.type)}
                            </div>

                            <div className="flex-1 bg-surface rounded-2xl p-5 shadow-sm border border-border-main hover:shadow-md transition-all group cursor-pointer">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-bold text-gray-900 group-hover:text-brand-accent transition-colors">{getActivityTitle(activity)}</h3>
                                        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                                            <Calendar size={10} />
                                            {formatDate(activity.date)}
                                        </div>
                                    </div>
                                    {activity.amount && (
                                        <div className="text-right">
                                            <p className="text-lg font-black text-emerald-600">{formatCurrency(activity.amount)}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-50">
                                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                                        <User size={12} />
                                    </div>
                                    <span className="text-xs font-bold text-gray-600">{activity.client_name}</span>
                                    {activity.content && (
                                        <p className="text-xs text-gray-400 italic ml-2 border-l pl-2 border-gray-100 overflow-hidden text-ellipsis whitespace-nowrap max-w-[150px]">
                                            "{activity.content}"
                                        </p>
                                    )}
                                    <ChevronRight size={14} className="ml-auto text-gray-300" />
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
