// =============================================================================
// reservas.test.js — Tests de caja negra para el módulo de Reservas.
//
// Mapeo a Clases de Equivalencia (CE):
//   CE-R01 → Reserva exitosa con datos válidos y token
//   CE-R02 → Reserva sin token de autenticación
//   CE-R03 → Reserva con token inválido/expirado
//   CE-R04 → Reserva con servicios_ids vacío o no array
//   CE-R05 → Reserva con ID de servicio inexistente
//   CE-R06 → Reserva con fecha_turno formato inválido
//   CE-R07 → Reserva con hora_inicio formato inválido
//   CE-R08 → Reserva que excede medianoche por duración
//   CE-R09 → Reserva con body completamente vacío
//   CE-R10 → Consulta de reservas con token válido (con datos)
//   CE-R11 → Consulta de reservas con token válido (sin datos previos)
//   CE-R12 → Consulta de reservas sin token
//
// Los tests se ejecutan contra el servidor corriendo en localhost.
// Requiere: `npm run dev` activo + base de datos accesible + servicios activos.
// =============================================================================

import { describe, test, expect, beforeAll } from '@jest/globals';
import { API_BASE_URL, TEST_TIMEOUT } from './setup.js';
import {
    registrarYObtenerToken,
    obtenerServiciosActivos,
    generarReservaValida,
} from './helpers/test.helpers.js';

// Estado compartido entre tests
let authToken = null;
let serviciosActivos = [];

// ─────────────────────────────────────────────────────────────────────────────
// SETUP: Obtener token y servicios ANTES de correr la suite
// ─────────────────────────────────────────────────────────────────────────────
beforeAll(async () => {
    // Registrar un usuario fresco y obtener su JWT
    const { token } = await registrarYObtenerToken();
    authToken = token;

    // Obtener los servicios activos de la DB para generar payloads reales
    serviciosActivos = await obtenerServiciosActivos();
}, TEST_TIMEOUT);

describe('Módulo de Reservas (/api/reservas)', () => {

    // =========================================================================
    // CREAR RESERVA — POST /api/reservas
    // =========================================================================
    describe('POST /api/reservas', () => {

        // CE-R01: Clase Válida — Todos los campos correctos + token válido
        test('CE-R01: debe crear una reserva con datos válidos y devolver 201', async () => {
            const primerServicio = serviciosActivos[0];
            const payload = generarReservaValida([primerServicio.id]);

            const response = await fetch(`${API_BASE_URL}/api/reservas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data.ok).toBe(true);
            expect(data.data).toBeDefined();
            expect(data.data.id).toBeDefined();
            expect(data.data.fecha_turno).toBe(payload.fecha_turno);
            expect(data.data.hora_inicio).toBe(payload.hora_inicio);
            expect(data.data.estado).toBe('Pendiente');
            expect(data.data.servicios).toHaveLength(1);
        }, TEST_TIMEOUT);

        // CE-R02: Clase Inválida — Sin token de autenticación
        test('CE-R02: debe rechazar la reserva sin token (401)', async () => {
            const primerServicio = serviciosActivos[0];
            const payload = generarReservaValida([primerServicio.id]);

            const response = await fetch(`${API_BASE_URL}/api/reservas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Sin header Authorization
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.ok).toBe(false);
            expect(data.mensaje).toMatch(/token|acceso denegado/i);
        }, TEST_TIMEOUT);

        // CE-R03: Clase Inválida — Token malformado/inválido
        test('CE-R03: debe rechazar la reserva con token inválido (401)', async () => {
            const primerServicio = serviciosActivos[0];
            const payload = generarReservaValida([primerServicio.id]);

            const response = await fetch(`${API_BASE_URL}/api/reservas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer token_completamente_falso_e_invalido',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.ok).toBe(false);
            expect(data.mensaje).toMatch(/token|inválido/i);
        }, TEST_TIMEOUT);

        // CE-R04: Clase Inválida — servicios_ids vacío
        test('CE-R04: debe rechazar si servicios_ids es un array vacío', async () => {
            const payload = generarReservaValida([]);
            payload.servicios_ids = []; // Array vacío

            const response = await fetch(`${API_BASE_URL}/api/reservas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.ok).toBe(false);
            expect(data.mensaje).toMatch(/servicios_ids/i);
        }, TEST_TIMEOUT);

        // CE-R05: Clase Inválida — ID de servicio inexistente
        test('CE-R05: debe rechazar si un servicio_id no existe en la DB', async () => {
            // Usamos un ID absurdamente alto que no debería existir
            const payload = generarReservaValida([999999]);

            const response = await fetch(`${API_BASE_URL}/api/reservas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            expect(response.status).toBe(404);
            expect(data.ok).toBe(false);
            expect(data.mensaje).toMatch(/no existen|inactivos/i);
        }, TEST_TIMEOUT);

        // CE-R06: Clase Inválida — fecha_turno con formato incorrecto
        test('CE-R06: debe rechazar si fecha_turno no es YYYY-MM-DD', async () => {
            const primerServicio = serviciosActivos[0];
            const payload = {
                servicios_ids: [primerServicio.id],
                fecha_turno: '25-12-2025', // Formato DD-MM-YYYY incorrecto
                hora_inicio: '10:00',
            };

            const response = await fetch(`${API_BASE_URL}/api/reservas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.ok).toBe(false);
            expect(data.mensaje).toMatch(/fecha_turno|YYYY-MM-DD/i);
        }, TEST_TIMEOUT);

        // CE-R07: Clase Inválida — hora_inicio con formato incorrecto
        test('CE-R07: debe rechazar si hora_inicio no es HH:MM', async () => {
            const primerServicio = serviciosActivos[0];
            const payload = {
                servicios_ids: [primerServicio.id],
                fecha_turno: '2026-12-25',
                hora_inicio: '10am', // Formato incorrecto
            };

            const response = await fetch(`${API_BASE_URL}/api/reservas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.ok).toBe(false);
            expect(data.mensaje).toMatch(/hora_inicio|HH:MM/i);
        }, TEST_TIMEOUT);

        // CE-R08: Clase Inválida — Duración que excede medianoche
        test('CE-R08: debe rechazar si la reserva excede la medianoche', async () => {
            const primerServicio = serviciosActivos[0];
            // Hora de inicio muy tarde para que la duración del servicio exceda las 24:00
            const payload = {
                servicios_ids: [primerServicio.id],
                fecha_turno: '2026-12-25',
                hora_inicio: '23:50', // Si el servicio dura más de 10 min, excederá
            };

            const response = await fetch(`${API_BASE_URL}/api/reservas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            // Solo validamos si el servicio tiene duración > 10 min
            if (primerServicio.duracion_minutos > 10) {
                expect(response.status).toBe(400);
                expect(data.ok).toBe(false);
                expect(data.mensaje).toMatch(/medianoche|excede/i);
            } else {
                // Si el servicio dura <= 10 min, podría caber. Aceptamos 201 o 400.
                expect([201, 400]).toContain(response.status);
            }
        }, TEST_TIMEOUT);

        // CE-R09: Clase Inválida — Body completamente vacío
        test('CE-R09: debe rechazar si el body está vacío', async () => {
            const response = await fetch(`${API_BASE_URL}/api/reservas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify({}),
            });

            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.ok).toBe(false);
            expect(data.mensaje).toMatch(/obligatorio/i);
        }, TEST_TIMEOUT);
    });

    // =========================================================================
    // HISTORIAL — GET /api/reservas/mis-reservas
    // =========================================================================
    describe('GET /api/reservas/mis-reservas', () => {

        // CE-R10: Clase Válida — Token válido, usuario con reservas previas
        // (CE-R01 ya creó al menos una reserva para este usuario)
        test('CE-R10: debe devolver las reservas del usuario autenticado', async () => {
            const response = await fetch(`${API_BASE_URL}/api/reservas/mis-reservas`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                },
            });

            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.ok).toBe(true);
            expect(data.total).toBeGreaterThanOrEqual(1); // Al menos la de CE-R01
            expect(Array.isArray(data.data)).toBe(true);
            // Verificar que cada reserva tiene detalle_reserva anidado
            expect(data.data[0].detalle_reserva).toBeDefined();
        }, TEST_TIMEOUT);

        // CE-R11: Clase Válida (borde) — Token válido, usuario sin reservas
        test('CE-R11: debe devolver array vacío si el usuario no tiene reservas', async () => {
            // Registramos un usuario NUEVO que nunca ha reservado
            const { token: tokenSinReservas } = await registrarYObtenerToken();

            const response = await fetch(`${API_BASE_URL}/api/reservas/mis-reservas`, {
                headers: {
                    'Authorization': `Bearer ${tokenSinReservas}`,
                },
            });

            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.ok).toBe(true);
            expect(data.total).toBe(0);
            expect(data.data).toEqual([]);
        }, TEST_TIMEOUT);

        // CE-R12: Clase Inválida — Sin token de autenticación
        test('CE-R12: debe rechazar consulta sin token (401)', async () => {
            const response = await fetch(`${API_BASE_URL}/api/reservas/mis-reservas`);

            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.ok).toBe(false);
            expect(data.mensaje).toMatch(/token|acceso denegado/i);
        }, TEST_TIMEOUT);
    });
});
