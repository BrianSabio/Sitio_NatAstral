// =============================================================================
// AgendaPage.jsx
// Flujo crítico protegido. Orquesta la selección de fecha, hora y confirmación.
// Se conecta a /api/disponibilidad/libres y /api/reservas.
// =============================================================================

import { useState, useEffect } from 'react';
import { useLocation, Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, CalendarCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const AgendaPage = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const servicio = state?.servicio;
  const { token } = useAuth();

  const [dias, setDias] = useState([]);
  const [horasLibres, setHorasLibres] = useState([]);
  const [diaSeleccionado, setDiaSeleccionado] = useState('');
  const [horaSeleccionada, setHoraSeleccionada] = useState('');
  
  const [isLoadingHoras, setIsLoadingHoras] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Redirigir al inicio si se ingresa sin un servicio seleccionado
  if (!servicio) {
    return <Navigate to="/" replace />;
  }

  // Generar los próximos 7 días al montar el componente
  useEffect(() => {
    const generarDias = () => {
      const hoy = new Date();
      const diasGenerados = [];
      const nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

      for (let i = 1; i <= 7; i++) {
        const fecha = new Date(hoy);
        fecha.setDate(hoy.getDate() + i);
        
        // Formato YYYY-MM-DD para la API
        const yyyy = fecha.getFullYear();
        const mm = String(fecha.getMonth() + 1).padStart(2, '0');
        const dd = String(fecha.getDate()).padStart(2, '0');
        const fechaAPI = `${yyyy}-${mm}-${dd}`;
        
        // Formato visual "16 Oct"
        const fechaCorta = `${fecha.getDate()} ${meses[fecha.getMonth()]}`;
        const nombreDia = nombresDias[fecha.getDay()];

        diasGenerados.push({
          fechaAPI,
          fechaCorta,
          nombreDia
        });
      }
      setDias(diasGenerados);
      setDiaSeleccionado(diasGenerados[0].fechaAPI);
    };

    generarDias();
  }, []);

  // Fetch de disponibilidad cuando cambia el día seleccionado
  useEffect(() => {
    if (!diaSeleccionado) return;

    const fetchDisponibilidad = async () => {
      setIsLoadingHoras(true);
      setHoraSeleccionada('');
      setError(null);
      
      try {
        const response = await fetch(`${API_URL}/api/disponibilidad/libres?fecha=${diaSeleccionado}&duracion=${servicio.duracion_minutos}`);
        if (!response.ok) throw new Error('Error al obtener la disponibilidad');
        
        const json = await response.json();
        if (json.ok) {
          setHorasLibres(json.horarios_libres || []);
        } else {
          throw new Error(json.mensaje || 'Error desconocido');
        }
      } catch (err) {
        console.error(err);
        setError('No pudimos cargar los horarios. Intenta de nuevo.');
        setHorasLibres([]);
      } finally {
        setIsLoadingHoras(false);
      }
    };

    fetchDisponibilidad();
  }, [diaSeleccionado, servicio.duracion_minutos]);

  // Formateador de moneda para Chile (CLP)
  const formatPrecio = (precio) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(precio);
  };

  const handleConfirmarReserva = async () => {
    if (!horaSeleccionada) {
      setError('Por favor selecciona una hora disponible.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        servicios_ids: [servicio.id],
        fecha_turno: diaSeleccionado,
        hora_inicio: horaSeleccionada,
      };

      const response = await fetch(`${API_URL}/api/reservas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.mensaje || 'Hubo un error al confirmar la reserva.');
      }

      // Éxito: Mostrar estado visual y navegar luego de un delay
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 2500);

    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-cosmic-bg text-slate-100 py-12 px-4 selection:bg-astral-purple selection:text-white">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-astral-gold text-4xl font-bold text-center font-serif tracking-wide mb-10">
          Agenda tu Turno
        </h1>

        {error && (
          <div className="mb-6 p-4 bg-red-950/50 border border-red-900/50 text-red-300 rounded-lg text-center max-w-2xl mx-auto flex items-center justify-center gap-2">
            <span>{error}</span>
          </div>
        )}

        {isSuccess && (
          <div className="mb-6 p-4 bg-emerald-950/50 border border-emerald-900/50 text-emerald-300 rounded-lg text-center max-w-2xl mx-auto flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.2)] animate-in fade-in slide-in-from-top-4 duration-500">
            <CalendarCheck className="w-5 h-5 text-emerald-400" />
            <span>¡Reserva confirmada con éxito! El universo te espera. Redirigiendo...</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Lado Izquierdo: Selección de Fecha y Hora */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Fechas */}
            <Card className="bg-cosmic-card border border-astral-purple/40 shadow-lg shadow-astral-purple/10 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-xl font-semibold flex items-center gap-2 text-slate-200">
                  <Calendar className="text-astral-purple-light" />
                  Selecciona una Fecha
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  {dias.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => setDiaSeleccionado(item.fechaAPI)}
                      className={`py-4 flex flex-col items-center justify-center rounded-lg border transition-all duration-300 ${
                        diaSeleccionado === item.fechaAPI
                          ? 'border-astral-gold bg-astral-purple/40 text-astral-gold shadow-[0_0_15px_rgba(234,179,8,0.2)]'
                          : 'border-astral-purple/30 bg-cosmic-bg text-slate-400 hover:border-astral-purple-light hover:text-slate-200'
                      }`}
                    >
                      <span className="text-sm uppercase tracking-wider">{item.nombreDia}</span>
                      <span className="text-lg font-bold">{item.fechaCorta}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Horas */}
            <Card className="bg-cosmic-card border border-astral-purple/40 shadow-lg shadow-astral-purple/10 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-xl font-semibold flex items-center gap-2 text-slate-200">
                  <Clock className="text-astral-purple-light" />
                  Horarios Disponibles
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingHoras ? (
                  <div className="text-center py-6 text-slate-400 animate-pulse">
                    Consultando al universo...
                  </div>
                ) : horasLibres.length > 0 ? (
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                    {horasLibres.map((hora, idx) => (
                      <button
                        key={idx}
                        onClick={() => setHoraSeleccionada(hora)}
                        className={`py-3 rounded-lg border font-medium transition-all duration-300 ${
                          horaSeleccionada === hora
                            ? 'border-astral-gold bg-astral-purple/40 text-astral-gold shadow-[0_0_10px_rgba(234,179,8,0.2)]'
                            : 'border-astral-purple/30 bg-cosmic-bg text-slate-400 hover:border-astral-purple-light hover:text-slate-200'
                        }`}
                      >
                        {hora}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-500">
                    No hay horarios libres para este día. Intenta con otra fecha.
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Lado Derecho: Resumen / Checkout */}
          <div className="lg:col-span-1">
            <Card className="bg-cosmic-card border border-astral-purple/40 shadow-xl shadow-astral-purple/20 backdrop-blur-md sticky top-24">
              <CardHeader className="border-b border-astral-purple/30 pb-6">
                <CardTitle className="text-2xl font-bold font-serif text-astral-gold">
                  Resumen de Reserva
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-slate-400 text-sm">Servicio</p>
                      <p className="font-semibold text-lg text-slate-200">{servicio.nombre}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    <div>
                      <p className="text-slate-400 text-sm">Fecha</p>
                      <p className="font-medium text-slate-200">
                        {dias.find(d => d.fechaAPI === diaSeleccionado)?.fechaCorta || '-'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 text-sm">Hora</p>
                      <p className="font-medium text-slate-200">{horaSeleccionada || '-'}</p>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <div>
                      <p className="text-slate-400 text-sm">Duración</p>
                      <p className="font-medium text-slate-200">{servicio.duracion_minutos} min</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-astral-purple/30 pt-6">
                  <div className="flex justify-between items-center mb-6">
                    <p className="text-lg text-slate-300">Total a pagar</p>
                    <p className="text-2xl font-bold text-astral-gold">{formatPrecio(servicio.precio)}</p>
                  </div>

                  <Button 
                    onClick={handleConfirmarReserva}
                    disabled={!horaSeleccionada || isSubmitting || isSuccess}
                    className={`w-full font-bold py-6 text-lg flex items-center gap-2 transition-all duration-300 ${
                      isSuccess 
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                        : 'bg-astral-gold hover:bg-yellow-400 text-slate-900 shadow-lg shadow-astral-gold/20 disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                  >
                    <CalendarCheck className={`w-5 h-5 ${isSuccess ? 'animate-bounce' : ''}`} />
                    {isSuccess 
                      ? '¡Reserva Confirmada!' 
                      : isSubmitting 
                        ? 'Confirmando...' 
                        : 'Confirmar Reserva'}
                  </Button>
                  <p className="text-xs text-center text-slate-500 mt-4">
                    Al confirmar, aceptas nuestras políticas de cancelación.
                  </p>
                </div>

              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AgendaPage;
