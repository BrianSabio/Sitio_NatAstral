// =============================================================================
// LandingPage.jsx — Componente Inteligente (Page)
// Página principal pública rediseñada en modo Dark Cósmico.
// =============================================================================

import { useState, useEffect } from 'react';
import Footer from '@/components/Footer';
import CatalogoGrid from '@/components/servicios/CatalogoGrid';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const LandingPage = () => {
  const navigate = useNavigate();
  const [servicios, setServicios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchServicios = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_URL}/api/servicios`);
        if (!response.ok) {
          throw new Error(`El servidor respondió con estado ${response.status}.`);
        }
        const json = await response.json();
        setServicios(json.data);
      } catch (err) {
        setError(
          err.message === 'Failed to fetch'
            ? 'No se pudo conectar con el servidor. Verifica tu conexión o vuelve más tarde.'
            : `Error al cargar los servicios: ${err.message}`
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchServicios();
  }, []);

  const handleReservar = (servicio) => {
    navigate('/agenda', { state: { servicio } });
  };

  const handleScrollToServices = () => {
    document.getElementById('servicios')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-purple-900 selection:text-white">

      {/* ════════════════════════════════════════════════════════════════════
          SECCIÓN HERO — Diseño de 2 columnas Dark Cósmico
      ════════════════════════════════════════════════════════════════════ */}
      <header className="relative w-full overflow-hidden bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 flex-1 flex items-center">

        {/* Efectos de fondo sutiles */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent pointer-events-none" />

        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[70vh] px-6 max-w-7xl mx-auto w-full py-12 lg:py-0">

          {/* Columna Izquierda: Mensaje y CTA */}
          <div className="flex flex-col items-start gap-6 z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/5 backdrop-blur-sm">
              <span className="text-yellow-500 text-xs font-semibold tracking-widest uppercase">
                Astrología Consciente
              </span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-white tracking-tight leading-[1.1]">
              Mira hacia <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
                Adentro
              </span>
            </h1>

            <p className="text-slate-400 text-base md:text-lg lg:text-xl font-light leading-relaxed max-w-lg">
              A través de la astrología y la Psicología Analítica de Jung, exploramos los arquetipos, la sombra, el ánima y el ánimus para favorecer el autoconocimiento y acompañar el proceso de individuación: el camino hacia una versión más consciente y auténtica de uno mismo.
            </p>

            <div className="flex flex-wrap items-center gap-4 mt-4">
              <Button
                onClick={handleScrollToServices}
                size="lg"
                className="bg-purple-700 hover:bg-purple-600 text-white shadow-lg shadow-purple-900/40 text-base px-8 h-12"
              >
                Ver Catálogo
              </Button>
            </div>
          </div>

          {/* Columna Derecha: Mandala */}
          <div className="relative flex justify-center items-center z-10 w-full">
            {/* Contenedor con efecto de resplandor (glow) flotante */}
            <div className="relative max-w-sm md:max-w-md w-full aspect-square animate-pulse" style={{ animationDuration: '4s' }}>
              <div className="absolute inset-0 bg-purple-600/20 blur-[80px] rounded-full" />
              <div className="absolute inset-4 bg-yellow-500/10 blur-[60px] rounded-full" />
              <img
                src="/imagen_NatAstral.jpg"
                alt="Nat Astral Mandala"
                className="relative z-10 w-full h-full object-contain rounded-full shadow-[0_0_40px_rgba(126,34,206,0.3)] border border-purple-900/30 drop-shadow-[0_0_15px_rgba(234,179,8,0.2)]"
              />
            </div>
          </div>

        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════════════
          SECCIÓN CATÁLOGO — Grid de servicios
      ════════════════════════════════════════════════════════════════════ */}
      <main id="servicios" className="w-full bg-slate-950 py-24 border-t border-purple-950/50">
        <div className="max-w-7xl mx-auto px-6">

          {/* Título de sección */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-white mb-4">
              Nuestros Servicios
            </h2>
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="h-px w-12 bg-yellow-500/40" />
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
              <div className="h-px w-12 bg-yellow-500/40" />
            </div>
            <p className="text-slate-300 text-lg leading-relaxed mt-4 max-w-2xl mx-auto">
              Cada sesión es una llave para entender tu propósito. Elige el abordaje que más resuene con tu momento actual.
            </p>
          </div>

          {/* ── Estado: Cargando ── */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-4 border-purple-900/20" />
                <div className="absolute inset-0 rounded-full border-4 border-t-yellow-500 animate-spin" />
              </div>
              <p className="text-slate-400 text-sm animate-pulse tracking-widest uppercase mt-2">
                Conectando...
              </p>
            </div>
          )}

          {/* ── Estado: Error ── */}
          {!isLoading && error && (
            <div className="max-w-md mx-auto">
              <div className="bg-slate-900 border border-red-900/50 rounded-2xl p-8 text-center shadow-lg">
                <h3 className="text-red-400 font-semibold mb-2 text-lg">
                  Interferencia Astral
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  {error}
                </p>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="border-red-900/50 text-red-300 hover:bg-red-900/20"
                >
                  Intentar Nuevamente
                </Button>
              </div>
            </div>
          )}

          {/* ── Estado: Datos cargados ── */}
          {!isLoading && !error && (
            <CatalogoGrid
              servicios={servicios}
              onReservar={handleReservar}
            />
          )}

        </div>
      </main>

      {/* ════════════════════════════════════════════════════════════════════
          SECCIÓN CONTACTO
      ════════════════════════════════════════════════════════════════════ */}
      <section id="contacto" className="w-full bg-cosmic-bg py-24 border-t border-purple-950/50">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-astral-gold mb-6">
            Contacto
          </h2>
          <p className="text-slate-300 text-lg leading-relaxed mb-8">
            ¿Tienes dudas sobre qué lectura elegir o necesitas una sesión personalizada?
            El universo siempre escucha. Escríbenos a través de nuestros canales y
            te guiaremos en tu viaje interno.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;
