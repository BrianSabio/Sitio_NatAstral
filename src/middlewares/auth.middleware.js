// =============================================================================
// auth.middleware.js
// Middleware de autenticación basado en JWT.
// Verifica el token en el header `Authorization: Bearer <token>`,
// decodifica el payload y lo adjunta a `req.usuario` para los controladores.
// =============================================================================

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware que protege rutas privadas verificando el JWT.
 * Si el token es válido, adjunta el payload decodificado a `req.usuario`
 * y llama a `next()` para continuar con el controlador.
 * Si es inválido o está ausente, corta la cadena con un 401.
 */
const authMiddleware = (req, res, next) => {
    // --- Extraer el header Authorization ---
    const authHeader = req.headers['authorization'];

    // El header debe existir y tener el formato "Bearer <token>"
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            ok: false,
            mensaje: 'Acceso denegado. Se requiere un token de autenticación.',
        });
    }

    // Separamos "Bearer" del token en sí
    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            ok: false,
            mensaje: 'Acceso denegado. El token está vacío.',
        });
    }

    try {
        // jwt.verify lanza un error si el token está expirado, malformado
        // o si la firma no coincide con JWT_SECRET.
        const decoded = jwt.verify(token, JWT_SECRET);

        // Adjuntamos el payload (id, email) al objeto de la petición
        // para que los controladores puedan usarlo sin re-decodificar.
        req.usuario = decoded;

        next();
    } catch (error) {
        // Distinguimos el error de expiración para dar feedback claro al cliente
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                ok: false,
                mensaje: 'La sesión ha expirado. Por favor, iniciá sesión nuevamente.',
            });
        }

        return res.status(401).json({
            ok: false,
            mensaje: 'Token inválido. Acceso denegado.',
        });
    }
};

export default authMiddleware;
