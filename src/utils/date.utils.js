// =============================================================================
// date.utils.js  —  Utilidades centralizadas para manejo de fechas y horas.
//
// Estas funciones estaban duplicadas en auth.controller, reservas.controller
// y disponibilidad.controller. Se extraen aquí para cumplir el principio DRY.
// =============================================================================

/**
 * Valida que un string tenga formato de fecha 'YYYY-MM-DD'.
 * Verifica estructura sintáctica, no existencia real del día.
 * @param {string} fecha - El string a validar.
 * @returns {boolean}
 */
export const esFechaValida = (fecha) => {
    if (typeof fecha !== 'string') return false;
    return /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(fecha);
};

/**
 * Valida que un string tenga formato de hora 'HH:MM' (24 horas).
 * @param {string} hora - El string a validar.
 * @returns {boolean}
 */
export const esHoraValida = (hora) => {
    if (typeof hora !== 'string') return false;
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(hora);
};

/**
 * Convierte un string 'HH:MM' a minutos totales desde medianoche.
 * Facilita la comparación aritmética entre horas.
 * @param {string} hora - String en formato 'HH:MM'.
 * @returns {number} - Minutos totales desde las 00:00.
 */
export const horaAMinutos = (hora) => {
    const [hh, mm] = hora.split(':').map(Number);
    return hh * 60 + mm;
};

/**
 * Convierte un número de minutos totales a string 'HH:MM'.
 * @param {number} minutos - Total de minutos desde las 00:00.
 * @returns {string} - Hora en formato 'HH:MM'.
 */
export const minutosAHora = (minutos) => {
    const hh = Math.floor(minutos / 60).toString().padStart(2, '0');
    const mm = (minutos % 60).toString().padStart(2, '0');
    return `${hh}:${mm}`;
};

/**
 * Construye un Date UTC "puro" para campos @db.Date de Prisma.
 * Evita desfases de zona horaria: '1990-06-15' siempre se guarda como
 * 1990-06-15 en la DB, sin importar la TZ del servidor.
 * @param {string} fechaStr - Fecha en formato 'YYYY-MM-DD'.
 * @returns {Date}
 */
export const fechaADateUTC = (fechaStr) => {
    const [anio, mes, dia] = fechaStr.split('-').map(Number);
    return new Date(Date.UTC(anio, mes - 1, dia));
};

/**
 * Construye un Date UTC "puro" para campos @db.Time(6) de Prisma.
 * Usa la fecha base 1970-01-01 como convención para valores TIME.
 * @param {string} horaStr - Hora en formato 'HH:MM'.
 * @returns {Date}
 */
export const horaADateUTC = (horaStr) => {
    return new Date(`1970-01-01T${horaStr}:00.000Z`);
};

/**
 * Extrae la hora 'HH:MM' de un objeto DateTime de Prisma/PostgreSQL.
 * Prisma devuelve los campos `@db.Time` como objetos Date con la fecha base
 * siendo 1970-01-01. Usamos UTC para evitar desfases de zona horaria.
 * @param {Date} fechaHora - Objeto Date retornado por Prisma para un campo Time.
 * @returns {string} - Hora en formato 'HH:MM'.
 */
export const extraerHora = (fechaHora) => {
    const hh = fechaHora.getUTCHours().toString().padStart(2, '0');
    const mm = fechaHora.getUTCMinutes().toString().padStart(2, '0');
    return `${hh}:${mm}`;
};
