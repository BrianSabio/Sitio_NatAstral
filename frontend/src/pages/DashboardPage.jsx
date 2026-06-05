// =============================================================================
// DashboardPage.jsx
// Vista privada protegida. Muestra el historial de reservas del usuario.
// Estilo Dark Mode Cósmico estricto.
// =============================================================================

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, History, Star, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const DashboardPage = () => {
  const { usuario, token } = useAuth();
  
  const [proximasReservas, setProximasReservas] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReservas = async () => {
      try {
        const response = await fetch(`${API_URL}/api/reservas/mis-reservas`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const json = await response.json();
        
        if (!response.ok) {
          throw new Error(json.mensaje || 'Error al obtener las reservas.');
        }

        const ahora = new Date();
        const proximas = [];
        const pasadas = [];

        // Función para extraer la hora 'HH:MM'
        const extraerHora = (horaIsoString) => {
          if (!horaIsoString) return '';
          // Prisma devuelve "1970-01-01T14:00:00.000Z" (UTC).
          const date = new Date(horaIsoString);
          return `${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`;
        };

        // Función para formatear fecha 'YYYY-MM-DD' a algo legible
        const formatearFecha = (fechaIsoString) => {
          if (!fechaIsoString) return '';
          const [anio, mes, dia] = fechaIsoString.split('T')[0].split('-');
          return `${dia}/${mes}/${anio}`;
        };

        json.data.forEach((reserva) => {
          const horaInicioFormateada = extraerHora(reserva.hora_inicio);
          const fechaFormateada = formatearFecha(reserva.fecha_turno);
          
          // Extraer nombres de servicios de la relación
          const nombresServicios = reserva.detalle_reserva
            ?.map(detalle => detalle.servicios?.nombre)
            .join(' + ') || 'Servicio Astrológico';

          const itemFormateado = {
            id: `#RES-${reserva.id}`,
            servicio: nombresServicios,
            fecha: fechaFormateada,
            hora: horaInicioFormateada,
            estado: reserva.estado,
          };

          // Construir fecha completa para comparar con `ahora`
          // Utilizamos la fecha en formato string y la hora extraída
          const [dia, mes, anio] = fechaFormateada.split('/');
          const fechaReserva = new Date(`${anio}-${mes}-${dia}T${horaInicioFormateada}:00`);

          // Si la fecha de la reserva es mayor a la actual y no está cancelada, es próxima.
          if (fechaReserva > ahora && reserva.estado !== 'Cancelada') {
            proximas.push(itemFormateado);
          } else {
            pasadas.push(itemFormateado);
          }
        });

        setProximasReservas(proximas);
        setHistorial(pasadas);
      } catch (err) {
        console.error('Error fetching reservas:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReservas();
  }, [token]);

  return (
    <div className="min-h-screen bg-cosmic-bg text-slate-100 py-12 px-4 selection:bg-astral-purple selection:text-white">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Encabezado de Bienvenida */}
        <div className="flex items-center gap-4 border-b border-astral-purple/30 pb-6">
          <div className="p-4 bg-astral-purple/20 rounded-full border border-astral-purple/40 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
            <Star className="w-8 h-8 text-astral-gold animate-[spin_6s_linear_infinite]" />
          </div>
          <div>
            <h1 className="text-astral-gold text-3xl font-bold font-serif tracking-wide">
              {usuario?.nombre ? `Hola, ${usuario.nombre}` : 'Bienvenid@'}
            </h1>
            <p className="text-slate-400 mt-1">
              Este es tu espacio personal. Aquí puedes gestionar y revisar tus consultas astrológicas.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/50 text-red-200 p-4 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p>{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-astral-gold text-lg animate-pulse flex flex-col items-center gap-3">
              <Star className="w-8 h-8 animate-spin" />
              <span>Sincronizando con el universo...</span>
            </div>
          </div>
        ) : (
          <>
            {/* Próximas Reservas */}
            <section>
              <div className="flex items-center gap-2 mb-6">
                <Calendar className="text-astral-purple-light w-6 h-6" />
                <h2 className="text-2xl font-semibold text-slate-200">Próximas Reservas</h2>
              </div>
              
              <div className="grid gap-4">
                {proximasReservas.length > 0 ? (
                  proximasReservas.map((reserva) => (
                    <Card key={reserva.id} className="bg-cosmic-card border border-astral-purple/40 shadow-lg shadow-astral-purple/10 backdrop-blur-md hover:border-astral-purple-light transition-colors">
                      <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-sm text-slate-400 font-mono">{reserva.id}</p>
                          <h3 className="text-xl font-bold text-slate-200">{reserva.servicio}</h3>
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-10">
                          <div>
                            <p className="text-sm text-slate-400">Fecha y Hora</p>
                            <p className="font-medium text-slate-200">{reserva.fecha} - {reserva.hora}</p>
                          </div>
                          <div className="flex items-center">
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/10 text-astral-gold border border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.1)]">
                              {reserva.estado}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card className="bg-cosmic-bg border border-astral-purple/20 border-dashed">
                    <CardContent className="p-8 text-center">
                      <p className="text-slate-500 italic">No tienes reservas próximas en el horizonte.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </section>

            {/* Historial de Consultas */}
            <section>
              <div className="flex items-center gap-2 mb-6">
                <History className="text-astral-purple-light w-6 h-6" />
                <h2 className="text-2xl font-semibold text-slate-200">Historial de Consultas</h2>
              </div>
              
              <Card className="bg-cosmic-card border border-astral-purple/40 shadow-lg shadow-astral-purple/10 backdrop-blur-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-astral-purple/20 border-b border-astral-purple/30">
                        <th className="p-4 text-slate-300 font-medium whitespace-nowrap">Reserva ID</th>
                        <th className="p-4 text-slate-300 font-medium">Servicio</th>
                        <th className="p-4 text-slate-300 font-medium whitespace-nowrap">Fecha y Hora</th>
                        <th className="p-4 text-slate-300 font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-astral-purple/20">
                      {historial.length > 0 ? (
                        historial.map((item) => (
                          <tr key={item.id} className="hover:bg-astral-purple/10 transition-colors">
                            <td className="p-4 text-slate-400 font-mono text-sm">{item.id}</td>
                            <td className="p-4 font-medium text-slate-200">{item.servicio}</td>
                            <td className="p-4 text-slate-300 whitespace-nowrap">{item.fecha} - {item.hora}</td>
                            <td className="p-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                                item.estado === 'Completada' 
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : item.estado === 'Cancelada'
                                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                    : 'bg-slate-500/10 text-slate-300 border-slate-500/20'
                              }`}>
                                {item.estado}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="p-8 text-slate-500 italic text-center">
                            Aún no hay registros en tu historial cósmico.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </section>
          </>
        )}

      </div>
    </div>
  );
};

export default DashboardPage;
