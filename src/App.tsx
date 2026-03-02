import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Navigation from './components/Navigation.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Clients from './pages/Clients.tsx';
import NewLoan from './pages/NewLoan.tsx';
import Cobranza from './pages/Cobranza.tsx';
import Reportes from './pages/Reportes.tsx';
import ClientDetail from './pages/ClientDetail.tsx';
import Settings from './pages/Settings.tsx';
import Login from './pages/Login.tsx';
import { useAuth } from './hooks/useAuth.ts';
import './index.css';

// Componente para proteger las rutas privadas
const PrivateRoute = ({ isAuthenticated }: { isAuthenticated: boolean }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si está autenticado, renderiza las vistas y la barra de navegación inferior
  return (
    <>
      <div className="page-content bg-[var(--background)] min-h-screen transition-colors duration-300">
        <Outlet />
      </div>
      <Navigation />
    </>
  );
};

function App() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p className="text-muted">Conectando...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas Públicas */}
        <Route
          path="/login"
          element={session ? <Navigate to="/" replace /> : <Login />}
        />

        {/* Rutas Privadas / Protegidas */}
        <Route element={<PrivateRoute isAuthenticated={!!session} />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clientes" element={<Clients />} />
          <Route path="/clientes/:id" element={<ClientDetail />} />
          <Route path="/cobranza" element={<Cobranza />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/nuevo-prestamo" element={<NewLoan />} />
          <Route path="/ajustes" element={<Settings />} />
        </Route>

        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
