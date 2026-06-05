// =============================================================================
// test.helpers.js — Utilidades reutilizables para la suite de tests.
//
// Contiene:
//   - Datos semilla (fixtures) para los tests de autenticación y reservas.
//   - Funciones factory para generar payloads válidos e inválidos.
//   - Helper de autenticación para obtener un JWT válido en tests protegidos.
//
// FILOSOFÍA: Cada test debe ser independiente y repetible. Los helpers
// generan datos con sufijos únicos (timestamp) para evitar colisiones
// cuando se ejecutan contra una base de datos real.
// =============================================================================

import { API_BASE_URL } from '../setup.js';

// ---------------------------------------------------------------------------
// DATOS SEMILLA — Usuarios de test
// ---------------------------------------------------------------------------

/**
 * Genera un payload de registro válido con email único.
 * El sufijo de timestamp evita colisiones con usuarios existentes en la DB.
 * @returns {object} - Payload listo para POST /api/auth/register
 */
export const generarUsuarioValido = () => {
    const sufijo = Date.now();
    return {
        nombre: 'Test',
        apellido: 'QA',
        email: `test_qa_${sufijo}@natastral.test`,
        password: 'Password123!',
        telefono: '1155667788',
        fecha_nacimiento: '1990-06-15',
        hora_nacimiento: '14:30',
        ciudad_origen: 'Buenos Aires, Argentina',
    };
};

/**
 * Genera un payload de registro con un campo faltante específico.
 * @param {string} campoAOmitir - Nombre del campo a excluir del payload.
 * @returns {object}
 */
export const generarUsuarioSinCampo = (campoAOmitir) => {
    const usuario = generarUsuarioValido();
    delete usuario[campoAOmitir];
    return usuario;
};

// ---------------------------------------------------------------------------
// DATOS SEMILLA — Reservas
// ---------------------------------------------------------------------------

/**
 * Genera un payload de reserva válido.
 * Nota: requiere que existan servicios activos en la DB con IDs reales.
 * @param {number[]} serviciosIds - Array de IDs de servicios existentes.
 * @param {string}   [fecha]      - Fecha en formato YYYY-MM-DD. Default: mañana.
 * @param {string}   [hora]       - Hora en formato HH:MM. Default: '10:00'.
 * @returns {object}
 */
export const generarReservaValida = (serviciosIds, fecha, hora) => {
    // Si no se pasa fecha, usamos mañana para evitar conflictos con hoy
    if (!fecha) {
        const maniana = new Date();
        maniana.setDate(maniana.getDate() + 1);
        const yyyy = maniana.getFullYear();
        const mm = String(maniana.getMonth() + 1).padStart(2, '0');
        const dd = String(maniana.getDate()).padStart(2, '0');
        fecha = `${yyyy}-${mm}-${dd}`;
    }

    return {
        servicios_ids: serviciosIds,
        fecha_turno: fecha,
        hora_inicio: hora || '10:00',
    };
};

// ---------------------------------------------------------------------------
// HELPER DE AUTENTICACIÓN
// ---------------------------------------------------------------------------

/**
 * Registra un usuario nuevo y devuelve el token JWT.
 * Útil para los tests de endpoints protegidos (reservas, dashboard).
 * @returns {Promise<{token: string, usuario: object, datosRegistro: object}>}
 */
export const registrarYObtenerToken = async () => {
    const datosRegistro = generarUsuarioValido();

    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosRegistro),
    });

    const data = await response.json();

    if (!response.ok || !data.token) {
        throw new Error(`No se pudo registrar el usuario de test: ${data.mensaje || 'Error desconocido'}`);
    }

    return {
        token: data.token,
        usuario: data.usuario,
        datosRegistro,
    };
};

/**
 * Obtiene los IDs de servicios activos desde la API.
 * Necesario para generar payloads de reserva con IDs reales.
 * @returns {Promise<number[]>} - Array con los IDs de los servicios activos.
 */
export const obtenerServiciosActivos = async () => {
    const response = await fetch(`${API_BASE_URL}/api/servicios`);
    const data = await response.json();

    if (!data.ok || !data.data || data.data.length === 0) {
        throw new Error('No hay servicios activos en la DB. Los tests de reservas requieren al menos 1 servicio.');
    }

    return data.data;
};
