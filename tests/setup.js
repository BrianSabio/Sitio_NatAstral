// =============================================================================
// setup.js — Configuración global de Jest para la suite de tests de NatAstral.
//
// Responsabilidades:
//   - Cargar variables de entorno antes de que cualquier test importe módulos.
//   - Exportar la instancia de la app Express para Supertest.
//   - Manejar el cierre limpio de conexiones después de la suite.
//
// IMPORTANTE: Este archivo NO levanta el servidor en un puerto (app.listen).
// Supertest se conecta directamente a la instancia de Express sin necesidad
// de un servidor HTTP real, lo que hace los tests más rápidos y determinísticos.
// =============================================================================

import 'dotenv/config';

// ---------------------------------------------------------------------------
// Exportación de la app Express para Supertest
// ---------------------------------------------------------------------------
// Necesitamos importar la app SIN que ejecute app.listen().
// Para esto, refactorizamos index.js para exportar la app.
// Si no es posible, Supertest puede recibir directamente la instancia.
//
// Nota: la app se importa dinámicamente en cada archivo de test para evitar
// problemas de estado compartido entre suites.
// ---------------------------------------------------------------------------

/**
 * Timeout global extendido para tests que interactúan con la base de datos.
 * Las operaciones en Supabase pueden tomar más tiempo que en una DB local.
 */
export const TEST_TIMEOUT = 15000;

/**
 * URL base de la API para los tests.
 * Usa el mismo .env del backend para conectarse al servidor real.
 */
export const API_BASE_URL = `http://localhost:${process.env.PORT || 3000}`;
