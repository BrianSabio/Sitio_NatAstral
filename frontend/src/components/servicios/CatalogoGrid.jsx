// =============================================================================
// CatalogoGrid.jsx — Componente Presentacional
// Recibe el array de servicios y los distribuye. Ajustado para centrar si hay un solo servicio.
// =============================================================================

import ServicioCard from './ServicioCard';

/**
 * @param {object}   props
 * @param {Array}    props.servicios    - Array de objetos servicio.
 * @param {function} [props.onReservar] - Callback que se pasa a cada ServicioCard.
 */
const CatalogoGrid = ({ servicios, onReservar }) => {
  if (!servicios || servicios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-12 h-12 text-yellow-500/40"
          aria-hidden="true"
        >
          <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77 5.82 21.02 7 14.14 2 9.27l7.1-1.01L12 2z" />
        </svg>
        <p className="text-slate-300 text-lg">
          No hay servicios disponibles en este momento.
        </p>
        <p className="text-slate-500 text-sm">
          Vuelve pronto — el universo está preparando algo para ti.
        </p>
      </div>
    );
  }

  // Si solo hay un servicio, usamos flex centrado para que no quede huérfano a la izquierda
  if (servicios.length === 1) {
    return (
      <div className="flex justify-center" role="list" aria-label="Catálogo de servicios">
        <div className="w-full max-w-md" role="listitem">
          <ServicioCard servicio={servicios[0]} onReservar={onReservar} />
        </div>
      </div>
    );
  }

  // Comportamiento normal en grilla
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
      role="list"
      aria-label="Catálogo de servicios"
    >
      {servicios.map((servicio) => (
        <div key={servicio.id} role="listitem">
          <ServicioCard
            servicio={servicio}
            onReservar={onReservar}
          />
        </div>
      ))}
    </div>
  );
};

export default CatalogoGrid;
