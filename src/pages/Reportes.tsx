import { Download, PieChart, FileText } from 'lucide-react';

export default function Reportes() {
    return (
        <div className="container">
            <header className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                <h1 style={{ marginBottom: 0 }}>Reportes</h1>
                <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
                    <Download size={18} /> CSV
                </button>
            </header>

            <div className="grid grid-cols-2" style={{ marginBottom: '2rem' }}>
                <div className="surface flex flex-col items-center justify-center p-4">
                    <PieChart size={32} className="text-primary mb-2" />
                    <div style={{ fontWeight: 600 }}>Cartera</div>
                    <div className="text-muted" style={{ fontSize: '0.875rem' }}>$45,000</div>
                </div>
                <div className="surface flex flex-col items-center justify-center p-4">
                    <FileText size={32} className="text-danger mb-2" />
                    <div style={{ fontWeight: 600 }}>Vencido</div>
                    <div className="text-muted" style={{ fontSize: '0.875rem' }}>$3,200 (7%)</div>
                </div>
            </div>

            <div className="surface">
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Desempeño del Mes</h2>
                <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-base)', borderRadius: 'var(--radius-sm)' }}>
                    <span className="text-muted">Gráfico en construcción...</span>
                </div>
            </div>
        </div>
    );
}
