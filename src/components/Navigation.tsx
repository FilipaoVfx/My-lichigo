import { NavLink } from 'react-router-dom';
import { Home, Users, Wallet, BarChart3, Settings } from 'lucide-react';

export default function Navigation() {
    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-[var(--surface)] border-t border-[var(--border)] flex justify-around items-center px-2 py-3 z-50 shadow-[0_-1px_10px_rgba(0,0,0,0.05)] safe-bottom transition-colors duration-300">
            {/* Nav Item: Inicio */}
            <NavLink
                to="/"
                className={({ isActive }) =>
                    `flex flex-col items-center gap-1 px-3 transition-colors ${isActive ? 'text-brand-accent' : 'text-gray-400 hover:text-brand-accent'}`
                }
            >
                {({ isActive }) => (
                    <>
                        <Home size={24} className={`transition-transform ${isActive ? 'scale-110' : ''}`} />
                        <span className={`text-[10px] tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>Inicio</span>
                    </>
                )}
            </NavLink>

            {/* Nav Item: Cobros */}
            <NavLink
                to="/cobranza" // Map Cobranza to Cobros
                className={({ isActive }) =>
                    `flex flex-col items-center gap-1 px-3 transition-colors ${isActive ? 'text-brand-primary' : 'text-gray-400 hover:text-brand-primary'}`
                }
            >
                {({ isActive }) => (
                    <>
                        <Wallet size={24} className={`transition-transform ${isActive ? 'scale-110' : ''}`} />
                        <span className={`text-[10px] tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>Cobros</span>
                    </>
                )}
            </NavLink>

            {/* Nav Item: Clientes */}
            <NavLink
                to="/clientes"
                className={({ isActive }) =>
                    `flex flex-col items-center gap-1 px-3 transition-colors ${isActive ? 'text-gray-800' : 'text-gray-400 hover:text-gray-800'}`
                }
            >
                {({ isActive }) => (
                    <>
                        <Users size={24} className={`transition-transform ${isActive ? 'scale-110' : ''}`} />
                        <span className={`text-[10px] tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>Clientes</span>
                    </>
                )}
            </NavLink>

            {/* Nav Item: Reportes */}
            <NavLink
                to="/reportes"
                className={({ isActive }) =>
                    `flex flex-col items-center gap-1 px-3 transition-colors ${isActive ? 'text-gray-800' : 'text-gray-400 hover:text-gray-800'}`
                }
            >
                {({ isActive }) => (
                    <>
                        <BarChart3 size={24} className={`transition-transform ${isActive ? 'scale-110' : ''}`} />
                        <span className={`text-[10px] tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>Reportes</span>
                    </>
                )}
            </NavLink>

            {/* Nav Item: Ajustes */}
            <NavLink
                to="/ajustes"
                className={({ isActive }) =>
                    `flex flex-col items-center gap-1 px-3 transition-colors ${isActive ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400 hover:text-gray-800 dark:hover:text-gray-100'}`
                }
            >
                {({ isActive }) => (
                    <>
                        <Settings size={24} className={`transition-transform ${isActive ? 'scale-110' : ''}`} />
                        <span className={`text-[10px] tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>Ajustes</span>
                    </>
                )}
            </NavLink>
        </nav>
    );
}

