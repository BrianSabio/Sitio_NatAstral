// =============================================================================
// reservas.controller.js
// Controlador para el flujo de Checkout y consulta de reservas.
//
// Flujo principal de createReserva:
//   1. Validar inputs.
//   2. Consultar servicios y calcular duración + total.
//   3. Calcular hora_fin.
//   4. Transacción Prisma: insertar reserva + detalle_reserva.
//   5. Responder 201 al cliente INMEDIATAMENTE.
//   6. Post-respuesta (fire-and-forget): enviar notificación WhatsApp + Calendar.
// =============================================================================

import { google } from 'googleapis';
import prisma from '../config/db.js';

// --- Importación centralizada de utilidades de fecha/hora (DRY) ---
import {
    esFechaValida,
    esHoraValida,
    horaAMinutos,
    minutosAHora,
    fechaADateUTC,
    horaADateUTC,
} from '../utils/date.utils.js';

// =============================================================================
// FUNCIONES DE NOTIFICACIÓN (ASÍNCRONAS - FIRE AND FORGET)
// Se ejecutan DESPUÉS de responder al cliente. Sus fallos no afectan la reserva.
// =============================================================================

/**
 * Envía una notificación por WhatsApp usando la API de CallMeBot.
 * CallMeBot funciona con una simple petición GET con query params.
 * Documentación: https://www.callmebot.com/blog/free-api-whatsapp-messages/
 *
 * @param {object} reserva - Datos de la reserva creada.
 * @param {object} usuario - Datos del usuario que reservó.
 * @param {Array}  servicios - Lista de servicios reservados.
 */
const enviarNotificacionWhatsApp = async (reserva, usuario, servicios) => {
    const phone = process.env.CALLMEBOT_PHONE;
    const apiKey = process.env.CALLMEBOT_APIKEY;

    // Si las credenciales no están configuradas, se omite sin lanzar error
    if (!phone || phone === 'CAMBIAR_POR_TU_NUMERO' || !apiKey || apiKey === 'CAMBIAR_POR_TU_APIKEY') {
        console.log('[reservas] CallMeBot no configurado. Notificación WhatsApp omitida.');
        return;
    }

    const nombresServicios = servicios.map((s) => s.nombre).join(', ');
    const mensaje = [
        `✨ *Nueva Reserva NatAstral* ✨`,
        `👤 Cliente: ${usuario.nombre} ${usuario.apellido}`,
        `📅 Fecha: ${reserva.fecha_turno}`,
        `🕐 Horario: ${reserva.hora_inicio} - ${reserva.hora_fin}`,
        `🌙 Servicios: ${nombresServicios}`,
        `💰 Total: $${reserva.total_pagar}`,
    ].join('%0A'); // %0A es el salto de línea URL-encoded para CallMeBot

    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${mensaje}&apikey=${apiKey}`;

    try {
        // fetch es nativo en Node.js >= 18. No se necesita ningún paquete externo.
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`[reservas] CallMeBot respondió con status: ${response.status}`);
        } else {
            console.log('[reservas] Notificación WhatsApp enviada correctamente.');
        }
    } catch (error) {
        // El fallo de la notificación no debe interrumpir ningún flujo del sistema.
        console.error('[reservas] Error al enviar notificación WhatsApp:', error.message);
    }
};

/**
 * Inserta un evento en Google Calendar usando una Service Account.
 *
 * ESTADO: MOCKEADA / PREPARADA PARA ACTIVACIÓN.
 * Para activarla en producción:
 *   1. Crear un proyecto en Google Cloud Console.
 *   2. Habilitar la Google Calendar API.
 *   3. Crear una Service Account y descargar las credenciales JSON.
 *   4. Compartir el calendario de NatAstral con el email de la Service Account.
 *   5. Completar las variables GOOGLE_CALENDAR_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL
 *      y GOOGLE_PRIVATE_KEY en el archivo .env.
 *   6. Descomentar el bloque de `await calendar.events.insert(...)`.
 *
 * @param {object} reserva - Datos de la reserva creada.
 * @param {object} usuario - Datos del usuario que reservó.
 * @param {Array}  servicios - Lista de servicios reservados.
 */
const insertarEventoCalendar = async (reserva, usuario, servicios) => {
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;

    // Verificar que las credenciales reales estén configuradas
    if (
        !calendarId || calendarId.includes('CAMBIAR') ||
        !serviceAccountEmail || serviceAccountEmail.includes('CAMBIAR') ||
        !privateKey || privateKey.includes('CAMBIAR')
    ) {
        console.log('[reservas] Google Calendar no configurado. Evento omitido.');
        return;
    }

    try {
        // Autenticación con Service Account (JWT de Google, no el nuestro)
        const auth = new google.auth.JWT({
            email: serviceAccountEmail,
            // Las claves en .env tienen \n como texto literal; se deben convertir
            key: privateKey.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/calendar'],
        });

        const calendar = google.calendar({ version: 'v3', auth });

        const nombresServicios = servicios.map((s) => s.nombre).join(' + ');

        // Construir timestamps ISO 8601 completos para la API de Google Calendar.
        // La fecha de reserva se combina con la hora de inicio/fin.
        const inicioISO = `${reserva.fecha_turno}T${reserva.hora_inicio}:00`;
        const finISO = `${reserva.fecha_turno}T${reserva.hora_fin}:00`;

        const evento = {
            summary: `🌙 NatAstral — ${nombresServicios}`,
            description: `Reserva para ${usuario.nombre} ${usuario.apellido} (${usuario.email})\nTotal: $${reserva.total_pagar}`,
            start: { dateTime: inicioISO, timeZone: 'America/Argentina/Buenos_Aires' },
            end: { dateTime: finISO, timeZone: 'America/Argentina/Buenos_Aires' },
            attendees: [{ email: usuario.email }],
        };

        // --- BLOQUE ACTIVO: descomentar cuando las credenciales estén configuradas ---
        // const resultado = await calendar.events.insert({
        //     calendarId,
        //     resource: evento,
        //     sendUpdates: 'all', // Envía invitación por email al cliente
        // });
        // console.log('[reservas] Evento creado en Calendar:', resultado.data.htmlLink);

        // --- MOCK TEMPORAL: simula el evento sin llamar a la API ---
        console.log('[reservas] [MOCK] Evento de Calendar preparado:', JSON.stringify(evento, null, 2));
    } catch (error) {
        console.error('[reservas] Error al crear evento en Google Calendar:', error.message);
    }
};

// =============================================================================
// CREAR RESERVA (CHECKOUT)
// =============================================================================

// -----------------------------------------------------------------------------
// POST /api/reservas
// Protegido por authMiddleware (req.usuario contiene id y email del JWT).
//
// Flujo completo:
//   1. Validar body: servicios_ids (array), fecha_turno, hora_inicio.
//   2. Consultar los servicios en DB y verificar que todos existen y están activos.
//   3. Calcular duración total y total_pagar sumando los servicios.
//   4. Calcular hora_fin = hora_inicio + duración total.
//   5. Transacción Prisma: crear cabecera `reservas` + filas en `detalle_reserva`.
//   6. Responder 201 al cliente.
//   7. Post-respuesta: disparar notificaciones de forma asíncrona (fire-and-forget).
// -----------------------------------------------------------------------------
export const createReserva = async (req, res) => {
    try {
        const { servicios_ids, fecha_turno, hora_inicio } = req.body;
        // El usuario autenticado lo provee el authMiddleware desde el JWT
        const usuario_id = req.usuario.id;

        // --- Validación: presencia de campos obligatorios ---
        if (!servicios_ids || !fecha_turno || !hora_inicio) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Los campos "servicios_ids", "fecha_turno" y "hora_inicio" son obligatorios.',
            });
        }

        // --- Validación: servicios_ids debe ser un array no vacío de enteros positivos ---
        if (!Array.isArray(servicios_ids) || servicios_ids.length === 0) {
            return res.status(400).json({
                ok: false,
                mensaje: '"servicios_ids" debe ser un array con al menos un ID de servicio.',
            });
        }

        const idsNumericos = servicios_ids.map((id) => parseInt(id, 10));
        if (idsNumericos.some((id) => isNaN(id) || id <= 0)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Todos los elementos de "servicios_ids" deben ser enteros positivos.',
            });
        }

        // --- Validación: formato de fecha y hora ---
        if (!esFechaValida(fecha_turno)) {
            return res.status(400).json({
                ok: false,
                mensaje: '"fecha_turno" debe estar en formato YYYY-MM-DD.',
            });
        }
        if (!esHoraValida(hora_inicio)) {
            return res.status(400).json({
                ok: false,
                mensaje: '"hora_inicio" debe estar en formato HH:MM.',
            });
        }

        // --- Consultar los servicios en la base de datos ---
        const serviciosEnDB = await prisma.servicios.findMany({
            where: {
                id: { in: idsNumericos },
                activo: true,
            },
        });

        // Verificar que todos los IDs solicitados corresponden a servicios activos
        if (serviciosEnDB.length !== idsNumericos.length) {
            const idsEncontrados = serviciosEnDB.map((s) => s.id);
            const idsFaltantes = idsNumericos.filter((id) => !idsEncontrados.includes(id));
            return res.status(404).json({
                ok: false,
                mensaje: `Los siguientes servicios no existen o están inactivos: ${idsFaltantes.join(', ')}.`,
            });
        }

        // --- Calcular duración total (minutos) y total_pagar ---
        // Usamos `reduce` para acumular en una sola pasada sobre el array.
        const { duracionTotal, totalPagar } = serviciosEnDB.reduce(
            (acumulador, servicio) => ({
                duracionTotal: acumulador.duracionTotal + servicio.duracion_minutos,
                // El precio viene como Decimal de Prisma (string/BigDecimal).
                // Parseamos a float para la suma y lo redondeamos a 2 decimales al final.
                totalPagar: acumulador.totalPagar + parseFloat(servicio.precio),
            }),
            { duracionTotal: 0, totalPagar: 0 }
        );

        // --- Calcular hora_fin = hora_inicio + duración total ---
        const inicioEnMinutos = horaAMinutos(hora_inicio);
        const finEnMinutos = inicioEnMinutos + duracionTotal;

        // Validar que la hora_fin no supere la medianoche (1440 min = 24 hs)
        if (finEnMinutos > 1440) {
            return res.status(400).json({
                ok: false,
                mensaje: `Con los servicios seleccionados (${duracionTotal} min), la reserva excede la medianoche. Elige un horario más temprano.`,
            });
        }

        const hora_fin = minutosAHora(finEnMinutos);

        // -------------------------------------------------------------------------
        // TRANSACCIÓN PRISMA
        // Garantiza atomicidad: si falla la inserción de cualquier fila en
        // detalle_reserva, se hace rollback completo y no queda una reserva
        // huérfana sin sus servicios asociados.
        //
        // PREVENCIÓN DE RESERVAS DUPLICADAS (RACE CONDITION):
        // Antes de insertar, verificamos dentro de la transacción si existe
        // alguna reserva no cancelada que se superponga con el rango horario
        // solicitado. Esto evita que dos usuarios reserven el mismo slot
        // simultáneamente (el segundo recibirá un 409 Conflict).
        // -------------------------------------------------------------------------
        const reservaCreada = await prisma.$transaction(async (tx) => {
            // 0. Verificar colisión de horarios dentro de la transacción
            //    Hay colisión si: hora_inicio_existente < hora_fin_nueva
            //                  AND hora_fin_existente > hora_inicio_nueva
            const conflicto = await tx.reservas.findFirst({
                where: {
                    fecha_turno: fechaADateUTC(fecha_turno),
                    estado: { not: 'Cancelada' },
                    hora_inicio: { lt: horaADateUTC(hora_fin) },
                    hora_fin: { gt: horaADateUTC(hora_inicio) },
                },
            });

            if (conflicto) {
                // Lanzamos un error para que la transacción haga rollback.
                // El catch externo captura este error y responde al cliente.
                const error = new Error('El horario seleccionado ya no está disponible. Otro usuario reservó este turno.');
                error.statusCode = 409;
                throw error;
            }

            // 1. Insertar la cabecera de la reserva
            const reserva = await tx.reservas.create({
                data: {
                    usuario_id,
                    fecha_turno: fechaADateUTC(fecha_turno),
                    hora_inicio: horaADateUTC(hora_inicio),
                    hora_fin: horaADateUTC(hora_fin),
                    total_pagar: totalPagar,
                    // `estado` se inicializa como 'Pendiente' por el default del schema
                },
            });

            // 2. Insertar una fila en detalle_reserva por cada servicio.
            // `precio_congelado` captura el precio en el momento de la compra,
            // protegiéndose de cambios futuros en el precio del servicio.
            await tx.detalle_reserva.createMany({
                data: serviciosEnDB.map((servicio) => ({
                    reserva_id: reserva.id,
                    servicio_id: servicio.id,
                    precio_congelado: parseFloat(servicio.precio),
                })),
            });

            return reserva;
        });

        // -------------------------------------------------------------------------
        // RESPONDER AL CLIENTE INMEDIATAMENTE (201 Created)
        // Las notificaciones se ejecutan de forma asíncrona DESPUÉS de este punto.
        // El cliente no espera a que las notificaciones terminen.
        // -------------------------------------------------------------------------

        // Obtener datos del usuario para los mensajes de notificación
        const usuario = await prisma.usuarios.findUnique({
            where: { id: usuario_id },
            select: { nombre: true, apellido: true, email: true },
        });

        // Construir el objeto de reserva con horas legibles para las notificaciones
        const reservaParaNotificacion = {
            ...reservaCreada,
            fecha_turno,
            hora_inicio,
            hora_fin,
        };

        res.status(201).json({
            ok: true,
            mensaje: 'Reserva creada exitosamente.',
            data: {
                id: reservaCreada.id,
                fecha_turno,
                hora_inicio,
                hora_fin,
                duracion_total_minutos: duracionTotal,
                total_pagar: totalPagar.toFixed(2),
                estado: 'Pendiente',
                servicios: serviciosEnDB.map((s) => ({ id: s.id, nombre: s.nombre })),
            },
        });

        // -------------------------------------------------------------------------
        // NOTIFICACIONES POST-RESPUESTA (FIRE AND FORGET)
        // Se ejecutan en background. Sus promesas NO son awaited intencionalmente
        // para no bloquear ni hacer depender al cliente de servicios externos.
        // -------------------------------------------------------------------------
        enviarNotificacionWhatsApp(reservaParaNotificacion, usuario, serviciosEnDB);
        insertarEventoCalendar(reservaParaNotificacion, usuario, serviciosEnDB);
    } catch (error) {
        // Si el error tiene statusCode personalizado (ej: 409 por conflicto de horario),
        // lo usamos directamente. Si no, es un error interno inesperado (500).
        const statusCode = error.statusCode || 500;
        const mensaje = error.statusCode
            ? error.message
            : 'Error interno del servidor al crear la reserva.';

        // Solo logueamos como error los 500 inesperados, no los 409 de negocio
        if (!error.statusCode) {
            console.error('[reservas.controller] createReserva:', error);
        }

        return res.status(statusCode).json({
            ok: false,
            mensaje,
        });
    }
};

// =============================================================================
// OBTENER HISTORIAL DE RESERVAS DEL USUARIO AUTENTICADO
// =============================================================================

// -----------------------------------------------------------------------------
// GET /api/reservas/mis-reservas
// Protegido por authMiddleware. El id del usuario se extrae del JWT.
// Retorna el historial completo con los servicios de cada reserva usando `include`.
// -----------------------------------------------------------------------------
export const getMisReservas = async (req, res) => {
    try {
        const usuario_id = req.usuario.id;

        const reservas = await prisma.reservas.findMany({
            where: { usuario_id },
            orderBy: { fecha_turno: 'desc' },
            include: {
                // Incluimos el detalle con el servicio anidado para tener toda
                // la info en una sola consulta (evita el problema N+1).
                detalle_reserva: {
                    include: {
                        servicios: {
                            select: {
                                id: true,
                                nombre: true,
                                descripcion: true,
                                duracion_minutos: true,
                            },
                        },
                    },
                },
            },
        });

        return res.status(200).json({
            ok: true,
            total: reservas.length,
            data: reservas,
        });
    } catch (error) {
        console.error('[reservas.controller] getMisReservas:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno del servidor al obtener las reservas.',
        });
    }
};
