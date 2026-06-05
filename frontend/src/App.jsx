// =============================================================================
// App.jsx — Enrutador raíz de NatAstral
//
// Estructura:
//   AuthProvider  → Provee el estado de autenticación global a toda la app.
//   BrowserRouter → Habilita el enrutamiento basado en la URL del navegador.
//   Routes        → Contenedor de todas las rutas de la aplicación.
//     /           → LandingPage    (pública)
//     /login      → LoginPage      (pública; redirige al inicio si ya está logueado)
//     /register   → RegisterPage   (pública)
//     /agenda     → AgendaPage     (protegida — requiere autenticación)
//     /dashboard  → DashboardPage  (protegida — requiere autenticación)
// =============================================================================

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';

// --- Páginas ---
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import AgendaPage from '@/pages/AgendaPage';
import DashboardPage from '@/pages/DashboardPage';

// =============================================================================
// ProtectedRoute
// Wrapper genérico para bloquear rutas privadas.
// Si no hay token en el AuthContext, redirige al Login.
// Se implementa aquí junto al router para centralizar la lógica de navegación.
// =============================================================================
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { token, isLoading } = useAuth();

  // Durante la carga inicial (restauración de sesión desde localStorage),
  // no renderizamos nada para evitar un flash de redirección al login.
  if (isLoading) {
    return (
      <div className="min-h-screen bg-cosmic-bg flex items-center justify-center">
        <div className="text-astral-gold text-lg animate-pulse">Cargando...</div>
      </div>
    );
  }

  // Si no hay token activo, redirigir al login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// =============================================================================
// App — Componente raíz
// =============================================================================
const App = () => {
  return (
    // AuthProvider envuelve TODO el árbol para que cualquier componente
    // pueda consumir el contexto sin prop drilling.
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          {/* ── Rutas Públicas ── */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* ── Rutas Protegidas ── */}
          <Route
            path="/agenda"
            element={
              <ProtectedRoute>
                <AgendaPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Ruta comodín: redirige cualquier URL desconocida a la landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
