// =============================================================================
// disponibilidad.controller.js
// Controlador para:
//   1. CRUD de la grilla de disponibilidad semanal (admin).
//   2. Algoritmo de cálculo de horarios libres para una fecha y duración dada.
// =============================================================================

import prisma from '../config/db.js';

// --- Importación centralizada de utilidades de fecha/hora (DRY) ---
import {
    esHoraValida,
    horaAMinutos,
    minutosAHora,
    extraerHora,
} from '../utils/date.utils.js';

// =============================================================================
// CRUD DE LA GRILLA DE DISPONIBILIDAD
// =============================================================================

// -----------------------------------------------------------------------------
// GET /api/disponibilidad
// Retorna todos los bloques de disponibilidad (activos e inactivos).
// El admin necesita ver la grilla completa para gestionarla.
// -----------------------------------------------------------------------------
export const obtenerDisponibilidad = async (req, res) => {
    try {
        const grilla = await prisma.disponibilidad.findMany({
            orderBy: [{ dia_semana: 'asc' }, { hora_inicio: 'asc' }],
        });

        return res.status(200).json({
            ok: true,
            data: grilla,
        });
    } catch (error) {
        console.error('[disponibilidad.controller] obtenerDisponibilidad:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno del servidor al obtener la grilla de disponibilidad.',
        });
    }
};

// -----------------------------------------------------------------------------
// POST /api/disponibilidad
// Crea un nuevo bloque horario en la grilla semanal.
// Reglas de negocio:
//   - `dia_semana` debe ser entero entre 0 (Dom) y 6 (Sab).
//   - `hora_inicio` y `hora_fin` deben estar en formato 'HH:MM'.
//   - `hora_fin` debe ser estrictamente posterior a `hora_inicio`.
// -----------------------------------------------------------------------------
export const crearDisponibilidad = async (req, res) => {
    try {
        const { dia_semana, hora_inicio, hora_fin } = req.body;

        // --- Validación de campos obligatorios ---
        if (dia_semana === undefined || !hora_inicio || !hora_fin) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Los campos "dia_semana", "hora_inicio" y "hora_fin" son obligatorios.',
            });
        }

        // --- Validación de dia_semana ---
        const diaNum = parseInt(dia_semana, 10);
        if (isNaN(diaNum) || diaNum < 0 || diaNum > 6) {
            return res.status(400).json({
                ok: false,
                mensaje: '"dia_semana" debe ser un entero entre 0 (Domingo) y 6 (Sábado).',
            });
        }

        // --- Validación de formato de horas ---
        if (!esHoraValida(hora_inicio)) {
            return res.status(400).json({
                ok: false,
                mensaje: '"hora_inicio" debe estar en formato HH:MM (ej: 09:00).',
            });
        }
        if (!esHoraValida(hora_fin)) {
            return res.status(400).json({
                ok: false,
                mensaje: '"hora_fin" debe estar en formato HH:MM (ej: 18:00).',
            });
        }

        // --- Validación de lógica temporal: fin debe ser posterior a inicio ---
        if (horaAMinutos(hora_fin) <= horaAMinutos(hora_inicio)) {
            return res.status(400).json({
                ok: false,
                mensaje: '"hora_fin" debe ser estrictamente posterior a "hora_inicio".',
            });
        }

        // Prisma espera un DateTime para campos @db.Time(6).
        // Construimos la fecha con base ISO 1970-01-01 para que el valor sea puro tiempo.
        const nuevoBloque = await prisma.disponibilidad.create({
            data: {
                dia_semana: diaNum,
                hora_inicio: new Date(`1970-01-01T${hora_inicio}:00.000Z`),
                hora_fin: new Date(`1970-01-01T${hora_fin}:00.000Z`),
                activo: true,
            },
        });

        return res.status(201).json({
            ok: true,
            mensaje: 'Bloque de disponibilidad creado exitosamente.',
            data: nuevoBloque,
        });
    } catch (error) {
        console.error('[disponibilidad.controller] crearDisponibilidad:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno del servidor al crear el bloque de disponibilidad.',
        });
    }
};

// -----------------------------------------------------------------------------
// PUT /api/disponibilidad/:id
// Actualiza parcialmente un bloque de la grilla. Solo se modifican
// los campos que lleguen en el body.
// -----------------------------------------------------------------------------
export const actualizarDisponibilidad = async (req, res) => {
    try {
        // --- Validar :id ---
        const id = parseInt(req.params.id, 10);
        if (isNaN(id) || id <= 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El parámetro "id" debe ser un número entero positivo.',
            });
        }

        // Verificar existencia del bloque
        const bloqueExistente = await prisma.disponibilidad.findUnique({ where: { id } });
        if (!bloqueExistente) {
            return res.status(404).json({
                ok: false,
                mensaje: `No se encontró un bloque de disponibilidad con id ${id}.`,
            });
        }

        const { dia_semana, hora_inicio, hora_fin, activo } = req.body;
        const datosAActualizar = {};

        if (dia_semana !== undefined) {
            const diaNum = parseInt(dia_semana, 10);
            if (isNaN(diaNum) || diaNum < 0 || diaNum > 6) {
                return res.status(400).json({
                    ok: false,
                    mensaje: '"dia_semana" debe ser un entero entre 0 (Domingo) y 6 (Sábado).',
                });
            }
            datosAActualizar.dia_semana = diaNum;
        }

        if (hora_inicio !== undefined) {
            if (!esHoraValida(hora_inicio)) {
                return res.status(400).json({
                    ok: false,
                    mensaje: '"hora_inicio" debe estar en formato HH:MM (ej: 09:00).',
                });
            }
            datosAActualizar.hora_inicio = new Date(`1970-01-01T${hora_inicio}:00.000Z`);
        }

        if (hora_fin !== undefined) {
            if (!esHoraValida(hora_fin)) {
                return res.status(400).json({
                    ok: false,
                    mensaje: '"hora_fin" debe estar en formato HH:MM (ej: 18:00).',
                });
            }
            datosAActualizar.hora_fin = new Date(`1970-01-01T${hora_fin}:00.000Z`);
        }

        // Validar coherencia de horas DESPUÉS de aplicar los cambios posibles
        // Se toma el valor nuevo si llegó, o el existente si no cambió.
        const inicioFinal = datosAActualizar.hora_inicio ?? bloqueExistente.hora_inicio;
        const finFinal = datosAActualizar.hora_fin ?? bloqueExistente.hora_fin;
        if (finFinal <= inicioFinal) {
            return res.status(400).json({
                ok: false,
                mensaje: '"hora_fin" debe ser estrictamente posterior a "hora_inicio".',
            });
        }

        if (activo !== undefined) {
            if (typeof activo !== 'boolean') {
                return res.status(400).json({
                    ok: false,
                    mensaje: '"activo" debe ser un booleano (true o false).',
                });
            }
            datosAActualizar.activo = activo;
        }

        if (Object.keys(datosAActualizar).length === 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Debes enviar al menos un campo para actualizar.',
            });
        }

        const bloqueActualizado = await prisma.disponibilidad.update({
            where: { id },
            data: datosAActualizar,
        });

        return res.status(200).json({
            ok: true,
            mensaje: 'Bloque de disponibilidad actualizado exitosamente.',
            data: bloqueActualizado,
        });
    } catch (error) {
        console.error('[disponibilidad.controller] actualizarDisponibilidad:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno del servidor al actualizar el bloque de disponibilidad.',
        });
    }
};

// -----------------------------------------------------------------------------
// DELETE /api/disponibilidad/:id  →  Hard delete
// A diferencia de Servicios, la grilla de disponibilidad no tiene relaciones
// con otras tablas (detalle_reserva, etc.), por lo que es seguro eliminar
// la fila directamente sin riesgo de romper la integridad referencial.
// -----------------------------------------------------------------------------
export const eliminarDisponibilidad = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id) || id <= 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El parámetro "id" debe ser un número entero positivo.',
            });
        }

        const bloqueExistente = await prisma.disponibilidad.findUnique({ where: { id } });
        if (!bloqueExistente) {
            return res.status(404).json({
                ok: false,
                mensaje: `No se encontró un bloque de disponibilidad con id ${id}.`,
            });
        }

        await prisma.disponibilidad.delete({ where: { id } });

        return res.status(200).json({
            ok: true,
            mensaje: `Bloque de disponibilidad con id ${id} eliminado exitosamente.`,
        });
    } catch (error) {
        console.error('[disponibilidad.controller] eliminarDisponibilidad:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno del servidor al eliminar el bloque de disponibilidad.',
        });
    }
};

// =============================================================================
// ALGORITMO DE HORARIOS LIBRES
// =============================================================================

// -----------------------------------------------------------------------------
// GET /api/disponibilidad/libres?fecha=YYYY-MM-DD&duracion=90
//
// Algoritmo:
//   1. Validar query params: `fecha` en formato YYYY-MM-DD y `duracion` > 0.
//   2. Determinar el día de la semana (0-6) de la fecha recibida.
//   3. Obtener los bloques activos de `disponibilidad` para ese día.
//   4. Obtener las reservas existentes (no canceladas) para esa fecha.
//   5. Para cada bloque de disponibilidad, generar slots contiguos de
//      `duracion` minutos y filtrar los que colisionen con alguna reserva.
//   6. Retornar el array de strings 'HH:MM' con los horarios de inicio libres.
// -----------------------------------------------------------------------------
export const getHorariosLibres = async (req, res) => {
    try {
        const { fecha, duracion } = req.query;

        // --- Validación: ambos parámetros son obligatorios ---
        if (!fecha || !duracion) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Los query params "fecha" (YYYY-MM-DD) y "duracion" (minutos) son obligatorios.',
            });
        }

        // --- Validación: formato de fecha YYYY-MM-DD ---
        const regexFecha = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
        if (!regexFecha.test(fecha)) {
            return res.status(400).json({
                ok: false,
                mensaje: '"fecha" debe estar en formato YYYY-MM-DD (ej: 2025-12-25).',
            });
        }

        // --- Validación: duracion debe ser entero positivo ---
        const duracionMin = parseInt(duracion, 10);
        if (isNaN(duracionMin) || duracionMin <= 0) {
            return res.status(400).json({
                ok: false,
                mensaje: '"duracion" debe ser un número entero de minutos mayor a 0.',
            });
        }

        // -------------------------------------------------------------------------
        // PASO 1: Determinar el día de la semana de la fecha solicitada.
        // Se parsea la fecha como UTC para evitar que la zona horaria del servidor
        // desplace el día (ej: 2025-12-25T00:00 en UTC-3 sería 2025-12-24 en UTC).
        // -------------------------------------------------------------------------
        const [anio, mes, dia] = fecha.split('-').map(Number);
        const fechaUTC = new Date(Date.UTC(anio, mes - 1, dia));
        const diaDeLaSemana = fechaUTC.getUTCDay(); // 0 = Domingo, 6 = Sábado

        // -------------------------------------------------------------------------
        // PASO 2: Obtener los bloques de disponibilidad activos para ese día.
        // -------------------------------------------------------------------------
        const bloquesDelDia = await prisma.disponibilidad.findMany({
            where: { dia_semana: diaDeLaSemana, activo: true },
            orderBy: { hora_inicio: 'asc' },
        });

        // Si no hay bloques configurados para ese día, no hay turnos posibles
        if (bloquesDelDia.length === 0) {
            return res.status(200).json({
                ok: true,
                fecha,
                dia_semana: diaDeLaSemana,
                duracion_minutos: duracionMin,
                horarios_libres: [],
            });
        }

        // -------------------------------------------------------------------------
        // PASO 3: Obtener las reservas confirmadas/pendientes para esa fecha.
        // Filtramos las 'Cancelada' porque ese tiempo volvió a quedar disponible.
        // -------------------------------------------------------------------------
        const inicioDelDia = new Date(`${fecha}T00:00:00.000Z`);
        const finDelDia = new Date(`${fecha}T23:59:59.999Z`);

        const reservasDelDia = await prisma.reservas.findMany({
            where: {
                fecha_turno: {
                    gte: inicioDelDia,
                    lte: finDelDia,
                },
                estado: { not: 'Cancelada' },
            },
            select: {
                hora_inicio: true,
                hora_fin: true,
            },
        });

        // Convertir las reservas a rangos de minutos para comparación aritmética
        const ocupados = reservasDelDia.map((reserva) => ({
            inicio: horaAMinutos(extraerHora(reserva.hora_inicio)),
            fin: horaAMinutos(extraerHora(reserva.hora_fin)),
        }));

        // -------------------------------------------------------------------------
        // PASO 4: Para cada bloque de disponibilidad, generar slots contiguos de
        // `duracionMin` minutos y filtrar los que colisionen con reservas activas.
        // -------------------------------------------------------------------------
        const horariosLibres = [];

        for (const bloque of bloquesDelDia) {
            const inicioBloque = horaAMinutos(extraerHora(bloque.hora_inicio));
            const finBloque = horaAMinutos(extraerHora(bloque.hora_fin));

            // Recorremos el bloque en pasos de `duracionMin` minutos
            let cursorInicio = inicioBloque;

            while (cursorInicio + duracionMin <= finBloque) {
                const cursorFin = cursorInicio + duracionMin;

                // Verificar si este slot colisiona con alguna reserva existente.
                // Hay colisión si el slot propuesto se superpone con una reserva:
                //   slot_inicio < reserva_fin  AND  slot_fin > reserva_inicio
                const hayColision = ocupados.some(
                    (reserva) => cursorInicio < reserva.fin && cursorFin > reserva.inicio
                );

                if (!hayColision) {
                    horariosLibres.push(minutosAHora(cursorInicio));
                }

                // Avanzamos al siguiente slot contiguo
                cursorInicio = cursorFin;
            }
        }

        return res.status(200).json({
            ok: true,
            fecha,
            dia_semana: diaDeLaSemana,
            duracion_minutos: duracionMin,
            horarios_libres: horariosLibres,
        });
    } catch (error) {
        console.error('[disponibilidad.controller] getHorariosLibres:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno del servidor al calcular los horarios libres.',
        });
    }
};
