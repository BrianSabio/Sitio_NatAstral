// =============================================================================
// disponibilidad.routes.js
// Mapea los endpoints del recurso `disponibilidad` a sus controladores.
// IMPORTANTE: La ruta GET '/libres' debe definirse ANTES de GET '/:id' para que
// Express no interprete el string 'libres' como un parámetro dinámico :id.
// =============================================================================

import { Router } from 'express';
import {
    obtenerDisponibilidad,
    crearDisponibilidad,
    actualizarDisponibilidad,
    eliminarDisponibilidad,
    getHorariosLibres,
} from '../controllers/disponibilidad.controller.js';

const router = Router();

// GET  /api/disponibilidad/libres?fecha=YYYY-MM-DD&duracion=90
// → Calcula los horarios disponibles para una fecha y duración dadas.
// ⚠️  Debe ir ANTES que cualquier ruta con parámetro dinámico.
router.get('/libres', getHorariosLibres);

// GET  /api/disponibilidad
// → Lista todos los bloques de la grilla semanal.
router.get('/', obtenerDisponibilidad);

// POST /api/disponibilidad
// → Crea un nuevo bloque horario en la grilla.
router.post('/', crearDisponibilidad);

// PUT  /api/disponibilidad/:id
// → Actualiza parcialmente un bloque de la grilla.
router.put('/:id', actualizarDisponibilidad);

// DELETE /api/disponibilidad/:id
// → Elimina permanentemente un bloque de la grilla.
router.delete('/:id', eliminarDisponibilidad);

export default router;
