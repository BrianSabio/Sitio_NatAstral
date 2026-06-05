// =============================================================================
// reservas.routes.js
// Endpoints del módulo de Reservas.
// TODAS las rutas están protegidas por authMiddleware:
// el usuario debe estar autenticado con un JWT válido para acceder.
// =============================================================================

import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { createReserva, getMisReservas } from '../controllers/reservas.controller.js';

const router = Router();

// Aplicamos el middleware a nivel de router para que proteja TODAS las rutas
// definidas en este archivo, sin tener que repetirlo en cada endpoint.
router.use(authMiddleware);

// POST /api/reservas          → Crea una nueva reserva (checkout)
router.post('/', createReserva);

// GET  /api/reservas/mis-reservas → Historial de reservas del usuario autenticado
router.get('/mis-reservas', getMisReservas);

export default router;
