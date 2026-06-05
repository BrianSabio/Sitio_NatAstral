// =============================================================================
// ServicioCard.jsx — Componente Presentacional
// Rediseñado para la temática Dark Cósmico.
// =============================================================================

const ServicioCard = ({ servicio, onReservar }) => {
  const { nombre, descripcion, duracion_minutos, precio } = servicio;

  const precioFormateado = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(parseFloat(precio));

  const formatearDuracion = (minutos) => {
    if (minutos < 60) return `${minutos} min`;
    const horas = Math.floor(minutos / 60);
    const restantes = minutos % 60;
    return restantes > 0 ? `${horas} h ${restantes} min` : `${horas} h`;
  };

  const handleReservar = () => {
    if (onReservar) {
      onReservar(servicio);
    } else {
      console.log('[ServicioCard] Reservar turno para:', nombre);
    }
  };

  return (
    <article
      className="
        bg-slate-900/60 backdrop-blur-sm
        border border-purple-950
        border-t-4 border-t-purple-900/30
        rounded-2xl shadow-lg shadow-purple-900/10
        flex flex-col h-full
        transition-all duration-300
        hover:shadow-2xl hover:shadow-purple-900/20 hover:-translate-y-1 hover:border-t-yellow-500 hover:border-x-purple-800/50 hover:border-b-purple-800/50
        overflow-hidden
      "
    >
      {/* ── Cuerpo de la tarjeta ── */}
      <div className="p-6 flex flex-col flex-1 gap-4">

        {/* Nombre del servicio */}
        <h2 className="text-slate-100 text-xl font-bold leading-tight tracking-tight">
          {nombre}
        </h2>

        {/* Descripción */}
        <p className="text-slate-400 text-sm leading-relaxed flex-1">
          {descripcion || 'Consulta por este servicio para más información.'}
        </p>

        {/* Metadatos: duración y precio */}
        <div className="flex items-center justify-between pt-4 border-t border-purple-900/30">
          {/* Duración */}
          <div className="flex items-center gap-1.5 text-slate-300 text-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4 text-yellow-500"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>{formatearDuracion(duracion_minutos)}</span>
          </div>

          {/* Precio */}
          <span className="text-yellow-500 text-lg font-bold">
            {precioFormateado}
          </span>
        </div>
      </div>

      {/* ── Footer: CTA ── */}
      <div className="px-6 pb-6 mt-auto">
        <button
          onClick={handleReservar}
          className="
            w-full py-3 px-4
            bg-purple-700 text-white
            rounded-xl font-semibold text-sm
            tracking-wide uppercase
            transition-all duration-200
            hover:bg-purple-600 hover:shadow-[0_0_15px_rgba(126,34,206,0.5)]
            active:scale-95
            focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900
          "
          aria-label={`Reservar turno para ${nombre}`}
        >
          Reservar Turno
        </button>
      </div>
    </article>
  );
};

export default ServicioCard;
