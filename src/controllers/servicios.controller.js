// =============================================================================
// servicios.controller.js
// Controlador CRUD para el modelo `servicios`.
// Implementa soft delete: el DELETE no elimina la fila, solo desactiva el registro.
// =============================================================================

import prisma from '../config/db.js';

// -----------------------------------------------------------------------------
// GET /api/servicios
// Retorna únicamente los servicios con `activo = true`.
// Los inactivos se ocultan al cliente porque ya no están disponibles para reservar.
// -----------------------------------------------------------------------------
export const obtenerServicios = async (req, res) => {
    try {
        const servicios = await prisma.servicios.findMany({
            where: { activo: true },
            orderBy: { id: 'asc' },
        });

        return res.status(200).json({
            ok: true,
            data: servicios,
        });
    } catch (error) {
        console.error('[servicios.controller] obtenerServicios:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno del servidor al obtener los servicios.',
        });
    }
};

// -----------------------------------------------------------------------------
// GET /api/servicios/:id
// Busca un servicio por su ID. Retorna 404 si no existe o si fue desactivado.
// Un servicio inactivo se trata como "inexistente" para los clientes.
// -----------------------------------------------------------------------------
export const obtenerServicioPorId = async (req, res) => {
    try {
        // Validar que el parámetro :id sea un entero positivo válido
        const id = parseInt(req.params.id, 10);
        if (isNaN(id) || id <= 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El parámetro "id" debe ser un número entero positivo.',
            });
        }

        const servicio = await prisma.servicios.findFirst({
            where: { id, activo: true },
        });

        // Si no se encontró (no existe o está inactivo), retornamos 404
        if (!servicio) {
            return res.status(404).json({
                ok: false,
                mensaje: `No se encontró un servicio activo con id ${id}.`,
            });
        }

        return res.status(200).json({
            ok: true,
            data: servicio,
        });
    } catch (error) {
        console.error('[servicios.controller] obtenerServicioPorId:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno del servidor al obtener el servicio.',
        });
    }
};

// -----------------------------------------------------------------------------
// POST /api/servicios
// Crea un nuevo servicio. Valida que todos los campos obligatorios estén presentes
// y que precio y duracion_minutos sean valores numéricos positivos.
// -----------------------------------------------------------------------------
export const crearServicio = async (req, res) => {
    try {
        const { nombre, descripcion, precio, duracion_minutos } = req.body;

        // --- Validación de campos obligatorios ---
        if (!nombre || precio === undefined || duracion_minutos === undefined) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Los campos "nombre", "precio" y "duracion_minutos" son obligatorios.',
            });
        }

        // --- Validación de tipo y rango para `nombre` ---
        if (typeof nombre !== 'string' || nombre.trim().length === 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El campo "nombre" debe ser una cadena de texto no vacía.',
            });
        }

        // --- Validación de tipo y rango para `precio` ---
        const precioNum = parseFloat(precio);
        if (isNaN(precioNum) || precioNum < 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El campo "precio" debe ser un número decimal mayor o igual a 0.',
            });
        }

        // --- Validación de tipo y rango para `duracion_minutos` ---
        const duracionNum = parseInt(duracion_minutos, 10);
        if (isNaN(duracionNum) || duracionNum <= 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El campo "duracion_minutos" debe ser un número entero positivo.',
            });
        }

        const nuevoServicio = await prisma.servicios.create({
            data: {
                nombre: nombre.trim(),
                descripcion: descripcion?.trim() ?? null, // descripcion es opcional
                precio: precioNum,
                duracion_minutos: duracionNum,
                // `activo` se inicializa en `true` por defecto según el schema
            },
        });

        return res.status(201).json({
            ok: true,
            mensaje: 'Servicio creado exitosamente.',
            data: nuevoServicio,
        });
    } catch (error) {
        console.error('[servicios.controller] crearServicio:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno del servidor al crear el servicio.',
        });
    }
};

// -----------------------------------------------------------------------------
// PUT /api/servicios/:id
// Actualiza los datos de un servicio existente y activo.
// Solo se actualizan los campos que llegan en el body (actualización parcial).
// -----------------------------------------------------------------------------
export const actualizarServicio = async (req, res) => {
    try {
        // --- Validar :id ---
        const id = parseInt(req.params.id, 10);
        if (isNaN(id) || id <= 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El parámetro "id" debe ser un número entero positivo.',
            });
        }

        // Verificar que el servicio exista y esté activo antes de intentar modificarlo
        const servicioExistente = await prisma.servicios.findFirst({
            where: { id, activo: true },
        });

        if (!servicioExistente) {
            return res.status(404).json({
                ok: false,
                mensaje: `No se encontró un servicio activo con id ${id}.`,
            });
        }

        // --- Construir el objeto de datos solo con los campos que vienen en el body ---
        // Esto permite actualizaciones parciales (PATCH-like behavior en PUT)
        const datosAActualizar = {};
        const { nombre, descripcion, precio, duracion_minutos } = req.body;

        if (nombre !== undefined) {
            if (typeof nombre !== 'string' || nombre.trim().length === 0) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El campo "nombre" debe ser una cadena de texto no vacía.',
                });
            }
            datosAActualizar.nombre = nombre.trim();
        }

        if (descripcion !== undefined) {
            // `descripcion` puede enviarse explícitamente como null para borrarla
            datosAActualizar.descripcion = descripcion?.trim() ?? null;
        }

        if (precio !== undefined) {
            const precioNum = parseFloat(precio);
            if (isNaN(precioNum) || precioNum < 0) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El campo "precio" debe ser un número decimal mayor o igual a 0.',
                });
            }
            datosAActualizar.precio = precioNum;
        }

        if (duracion_minutos !== undefined) {
            const duracionNum = parseInt(duracion_minutos, 10);
            if (isNaN(duracionNum) || duracionNum <= 0) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El campo "duracion_minutos" debe ser un número entero positivo.',
                });
            }
            datosAActualizar.duracion_minutos = duracionNum;
        }

        // Si el body llegó vacío no hay nada que actualizar
        if (Object.keys(datosAActualizar).length === 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Debes enviar al menos un campo para actualizar.',
            });
        }

        const servicioActualizado = await prisma.servicios.update({
            where: { id },
            data: datosAActualizar,
        });

        return res.status(200).json({
            ok: true,
            mensaje: 'Servicio actualizado exitosamente.',
            data: servicioActualizado,
        });
    } catch (error) {
        console.error('[servicios.controller] actualizarServicio:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno del servidor al actualizar el servicio.',
        });
    }
};

// -----------------------------------------------------------------------------
// DELETE /api/servicios/:id  →  SOFT DELETE
// No elimina la fila. Actualiza `activo` a `false` para preservar la integridad
// referencial con `detalle_reserva`, que registra el historial de reservas pasadas.
// -----------------------------------------------------------------------------
export const eliminarServicio = async (req, res) => {
    try {
        // --- Validar :id ---
        const id = parseInt(req.params.id, 10);
        if (isNaN(id) || id <= 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El parámetro "id" debe ser un número entero positivo.',
            });
        }

        // Verificar que el servicio exista y esté activo
        const servicioExistente = await prisma.servicios.findFirst({
            where: { id, activo: true },
        });

        if (!servicioExistente) {
            return res.status(404).json({
                ok: false,
                mensaje: `No se encontró un servicio activo con id ${id}. Es posible que ya haya sido desactivado.`,
            });
        }

        // Soft delete: marcamos el servicio como inactivo en lugar de eliminarlo.
        // Esto preserva la integridad del historial de reservas en `detalle_reserva`.
        await prisma.servicios.update({
            where: { id },
            data: { activo: false },
        });

        return res.status(200).json({
            ok: true,
            mensaje: `Servicio con id ${id} desactivado exitosamente.`,
        });
    } catch (error) {
        console.error('[servicios.controller] eliminarServicio:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno del servidor al desactivar el servicio.',
        });
    }
};
