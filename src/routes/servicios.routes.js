// =============================================================================
// servicios.routes.js
// Define los endpoints del recurso `servicios` y los delega al controlador.
// El router no contiene lógica de negocio, solo mapeo de rutas.
// =============================================================================

import { Router } from 'express';
import {
    obtenerServicios,
    obtenerServicioPorId,
    crearServicio,
    actualizarServicio,
    eliminarServicio,
} from '../controllers/servicios.controller.js';

const router = Router();

// GET    /api/servicios        → Lista todos los servicios activos
router.get('/', obtenerServicios);

// GET    /api/servicios/:id    → Obtiene un servicio activo por su ID
router.get('/:id', obtenerServicioPorId);

// POST   /api/servicios        → Crea un nuevo servicio
router.post('/', crearServicio);

// PUT    /api/servicios/:id    → Actualiza los datos de un servicio existente
router.put('/:id', actualizarServicio);

// DELETE /api/servicios/:id    → Soft delete: desactiva el servicio (activo = false)
router.delete('/:id', eliminarServicio);

export default router;
