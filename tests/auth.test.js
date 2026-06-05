// =============================================================================
// auth.test.js — Tests de caja negra para el módulo de Autenticación.
//
// Mapeo a Clases de Equivalencia (CE):
//   CE-A01 → Registro exitoso con todos los campos válidos
//   CE-A02 → Registro con campos obligatorios faltantes
//   CE-A03 → Registro con email formato inválido
//   CE-A04 → Registro con password < 8 caracteres
//   CE-A05 → Registro con email duplicado (conflicto)
//   CE-A06 → Registro con fecha_nacimiento formato inválido
//   CE-A07 → Registro con hora_nacimiento formato inválido
//   CE-A08 → Login exitoso con credenciales correctas
//   CE-A09 → Login con email no registrado
//   CE-A10 → Login con contraseña incorrecta
//   CE-A11 → Login con body vacío
//
// Los tests se ejecutan contra el servidor corriendo en localhost.
// Requiere: `npm run dev` activo + base de datos accesible.
// =============================================================================

import { describe, test, expect, beforeAll } from '@jest/globals';
import { API_BASE_URL, TEST_TIMEOUT } from './setup.js';
import { generarUsuarioValido, generarUsuarioSinCampo } from './helpers/test.helpers.js';

// Almacena las credenciales del usuario registrado en CE-A01
// para reutilizarlas en los tests de login (CE-A08 a CE-A10).
let usuarioRegistrado = null;

describe('Módulo de Autenticación (/api/auth)', () => {

    // =========================================================================
    // REGISTRO — POST /api/auth/register
    // =========================================================================
    describe('POST /api/auth/register', () => {

        // CE-A01: Clase Válida — Todos los campos correctos, email no registrado
        test('CE-A01: debe registrar un usuario con datos válidos y devolver JWT', async () => {
            const payload = generarUsuarioValido();

            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data.ok).toBe(true);
            expect(data.token).toBeDefined();
            expect(typeof data.token).toBe('string');
            expect(data.usuario).toBeDefined();
            expect(data.usuario.email).toBe(payload.email);
            // El password_hash NUNCA debe aparecer en la respuesta
            expect(data.usuario.password_hash).toBeUndefined();

            // Guardar para los tests de login
            usuarioRegistrado = { email: payload.email, password: payload.password };
        }, TEST_TIMEOUT);

        // CE-A02: Clase Inválida — Falta campo obligatorio (email)
        test('CE-A02: debe rechazar registro si falta el campo "email"', async () => {
            const payload = generarUsuarioSinCampo('email');

            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.ok).toBe(false);
            expect(data.mensaje).toContain('email');
        }, TEST_TIMEOUT);

        // CE-A03: Clase Inválida — Email con formato incorrecto
        test('CE-A03: debe rechazar registro si el email tiene formato inválido', async () => {
            const payload = generarUsuarioValido();
            payload.email = 'correo-invalido-sin-arroba';

            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.ok).toBe(false);
            expect(data.mensaje).toMatch(/email/i);
        }, TEST_TIMEOUT);

        // CE-A04: Clase Inválida — Password menor a 8 caracteres
        test('CE-A04: debe rechazar registro si la contraseña tiene menos de 8 caracteres', async () => {
            const payload = generarUsuarioValido();
            payload.password = '1234567'; // 7 caracteres

            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.ok).toBe(false);
            expect(data.mensaje).toMatch(/contraseña|8 caracteres/i);
        }, TEST_TIMEOUT);

        // CE-A05: Clase Inválida — Email ya registrado (duplicado)
        test('CE-A05: debe rechazar registro si el email ya está registrado', async () => {
            // Primero registramos un usuario
            const payload = generarUsuarioValido();
            await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            // Intentamos registrarlo de nuevo con el mismo email
            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            expect(response.status).toBe(409);
            expect(data.ok).toBe(false);
            expect(data.mensaje).toMatch(/ya está registrado/i);
        }, TEST_TIMEOUT);

        // CE-A06: Clase Inválida — Fecha de nacimiento en formato incorrecto
        test('CE-A06: debe rechazar registro si fecha_nacimiento no es YYYY-MM-DD', async () => {
            const payload = generarUsuarioValido();
            payload.fecha_nacimiento = '15/06/1990'; // Formato DD/MM/YYYY incorrecto

            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.ok).toBe(false);
            expect(data.mensaje).toMatch(/fecha_nacimiento|YYYY-MM-DD/i);
        }, TEST_TIMEOUT);

        // CE-A07: Clase Inválida — Hora de nacimiento en formato incorrecto
        test('CE-A07: debe rechazar registro si hora_nacimiento no es HH:MM', async () => {
            const payload = generarUsuarioValido();
            payload.hora_nacimiento = '2:30pm'; // Formato AM/PM incorrecto

            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.ok).toBe(false);
            expect(data.mensaje).toMatch(/hora_nacimiento|HH:MM/i);
        }, TEST_TIMEOUT);
    });

    // =========================================================================
    // LOGIN — POST /api/auth/login
    // =========================================================================
    describe('POST /api/auth/login', () => {

        // CE-A08: Clase Válida — Credenciales correctas
        test('CE-A08: debe iniciar sesión con credenciales válidas y devolver JWT', async () => {
            // Asegurarnos de que el usuario existe (CE-A01 debió crearlo)
            expect(usuarioRegistrado).not.toBeNull();

            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: usuarioRegistrado.email,
                    password: usuarioRegistrado.password,
                }),
            });

            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.ok).toBe(true);
            expect(data.token).toBeDefined();
            expect(typeof data.token).toBe('string');
            expect(data.usuario).toBeDefined();
            // Verificar que no se filtra el hash
            expect(data.usuario.password_hash).toBeUndefined();
        }, TEST_TIMEOUT);

        // CE-A09: Clase Inválida — Email no registrado
        test('CE-A09: debe rechazar login con email no registrado', async () => {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: `inexistente_${Date.now()}@natastral.test`,
                    password: 'Password123!',
                }),
            });

            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.ok).toBe(false);
            // Debe dar un mensaje genérico (no revelar si el email existe)
            expect(data.mensaje).toMatch(/email o contraseña/i);
        }, TEST_TIMEOUT);

        // CE-A10: Clase Inválida — Contraseña incorrecta
        test('CE-A10: debe rechazar login con contraseña incorrecta', async () => {
            expect(usuarioRegistrado).not.toBeNull();

            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: usuarioRegistrado.email,
                    password: 'ContraseñaIncorrecta99!',
                }),
            });

            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.ok).toBe(false);
            // Mismo mensaje que CE-A09 (evitar enumeración de usuarios)
            expect(data.mensaje).toMatch(/email o contraseña/i);
        }, TEST_TIMEOUT);

        // CE-A11: Clase Inválida — Body vacío (sin email ni password)
        test('CE-A11: debe rechazar login si el body está vacío', async () => {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });

            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.ok).toBe(false);
            expect(data.mensaje).toMatch(/obligatorio/i);
        }, TEST_TIMEOUT);
    });
});
