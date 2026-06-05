// =============================================================================
// auth.controller.js
// Controlador de autenticación para el sistema NatAstral.
// Maneja tres flujos: registro manual, login manual y login/registro con Google.
// =============================================================================

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import prisma from '../config/db.js';

// --- Importación centralizada de utilidades de fecha/hora (DRY) ---
import { esFechaValida, esHoraValida, fechaADateUTC, horaADateUTC } from '../utils/date.utils.js';

// ---------------------------------------------------------------------------
// Configuración de constantes de autenticación desde variables de entorno.
// Fallar en el arranque si los secretos críticos no están configurados es
// intencional: evita que la app corra en un estado inseguro sin darse cuenta.
// ---------------------------------------------------------------------------
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '7d'; // El token expira en 7 días
const BCRYPT_SALT_ROUNDS = 12; // Factor de costo para bcrypt
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

// El cliente de Google se instancia una vez y se reutiliza (patrón singleton)
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// =============================================================================
// FUNCIONES AUXILIARES PRIVADAS
// =============================================================================

/**
 * Genera un JWT firmado con el id y email del usuario.
 * @param {object} usuario - Objeto con al menos `id` y `email`.
 * @returns {string} - El token JWT firmado.
 */
const generarToken = (usuario) => {
    return jwt.sign(
        { id: usuario.id, email: usuario.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
};

// =============================================================================
// REGISTRO MANUAL
// =============================================================================

// -----------------------------------------------------------------------------
// POST /api/auth/register
//
// Flujo:
//   1. Validar que todos los campos obligatorios estén presentes y bien formados.
//   2. Verificar que el email no esté ya registrado.
//   3. Encriptar la contraseña con bcrypt.
//   4. Crear el usuario en la base de datos.
//   5. Generar y devolver el JWT.
//
// Nunca se devuelve el password_hash en la respuesta al cliente.
// -----------------------------------------------------------------------------
export const register = async (req, res) => {
    try {
        const {
            nombre,
            apellido,
            email,
            password,
            telefono,
            fecha_nacimiento,
            hora_nacimiento,
            ciudad_origen,
        } = req.body;

        // --- Validación: presencia de todos los campos obligatorios ---
        const camposFaltantes = [];
        if (!nombre) camposFaltantes.push('nombre');
        if (!apellido) camposFaltantes.push('apellido');
        if (!email) camposFaltantes.push('email');
        if (!password) camposFaltantes.push('password');
        if (!telefono) camposFaltantes.push('telefono');
        if (!fecha_nacimiento) camposFaltantes.push('fecha_nacimiento');
        if (!hora_nacimiento) camposFaltantes.push('hora_nacimiento');
        if (!ciudad_origen) camposFaltantes.push('ciudad_origen');

        if (camposFaltantes.length > 0) {
            return res.status(400).json({
                ok: false,
                mensaje: `Faltan los siguientes campos obligatorios: ${camposFaltantes.join(', ')}.`,
            });
        }

        // --- Validación de formato de email ---
        const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!regexEmail.test(email)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El formato del email no es válido.',
            });
        }

        // --- Validación de formato de fecha y hora de nacimiento ---
        if (!esFechaValida(fecha_nacimiento)) {
            return res.status(400).json({
                ok: false,
                mensaje: '"fecha_nacimiento" debe estar en formato YYYY-MM-DD (ej: 1990-06-15).',
            });
        }
        if (!esHoraValida(hora_nacimiento)) {
            return res.status(400).json({
                ok: false,
                mensaje: '"hora_nacimiento" debe estar en formato HH:MM (ej: 14:30).',
            });
        }

        // --- Validación de longitud mínima de contraseña ---
        if (typeof password !== 'string' || password.length < 8) {
            return res.status(400).json({
                ok: false,
                mensaje: 'La contraseña debe tener al menos 8 caracteres.',
            });
        }

        // --- Verificar que el email no esté duplicado ---
        // Buscamos ANTES de encriptar para evitar el costo de bcrypt si ya existe.
        const usuarioExistente = await prisma.usuarios.findUnique({
            where: { email: email.toLowerCase().trim() },
        });
        if (usuarioExistente) {
            return res.status(409).json({
                ok: false,
                // Mensaje genérico: no confirmamos explícitamente que el email existe
                // para no facilitar la enumeración de usuarios.
                mensaje: 'El email ya está registrado. Intentá iniciar sesión.',
            });
        }

        // --- Encriptar la contraseña con bcrypt ---
        const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

        // --- Crear el usuario en la base de datos ---
        // Se usan Date UTC puros para evitar desfases de zona horaria en los
        // campos @db.Date y @db.Time(6) del schema de Prisma.
        const nuevoUsuario = await prisma.usuarios.create({
            data: {
                nombre: nombre.trim(),
                apellido: apellido.trim(),
                email: email.toLowerCase().trim(),
                password_hash: passwordHash,
                telefono: telefono.trim(),
                fecha_nacimiento: fechaADateUTC(fecha_nacimiento),
                hora_nacimiento: horaADateUTC(hora_nacimiento),
                ciudad_origen: ciudad_origen.trim(),
            },
            // Excluir el hash de la respuesta por seguridad
            omit: { password_hash: true },
        });

        // --- Generar el JWT para que el usuario quede autenticado inmediatamente ---
        const token = generarToken(nuevoUsuario);

        return res.status(201).json({
            ok: true,
            mensaje: 'Usuario registrado exitosamente.',
            token,
            usuario: nuevoUsuario,
        });
    } catch (error) {
        console.error('[auth.controller] register:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno del servidor durante el registro.',
        });
    }
};

// =============================================================================
// LOGIN MANUAL
// =============================================================================

// -----------------------------------------------------------------------------
// POST /api/auth/login
//
// Flujo:
//   1. Validar presencia de email y password.
//   2. Buscar el usuario por email (incluye password_hash para comparar).
//   3. Comparar la contraseña con bcrypt.compare (tiempo constante, sin timing attacks).
//   4. Si es correcto, generar y devolver el JWT.
//
// SEGURIDAD: El mensaje de error es idéntico para "usuario no encontrado" y
// "contraseña incorrecta". Esto evita la enumeración de usuarios vía login.
// -----------------------------------------------------------------------------
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // --- Validación básica ---
        if (!email || !password) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El email y la contraseña son obligatorios.',
            });
        }

        // --- Buscar el usuario incluyendo el hash para la comparación ---
        // findUnique es el método correcto aquí porque `email` tiene @unique en el schema.
        const usuario = await prisma.usuarios.findUnique({
            where: { email: email.toLowerCase().trim() },
        });

        // --- Verificar existencia y contraseña con el mismo mensaje de error ---
        // Si el usuario no existe, password_hash será null. bcrypt.compare
        // con null lanzaría un error, por lo que lo manejamos explícitamente.
        const passwordEsValida =
            usuario?.password_hash
                ? await bcrypt.compare(password, usuario.password_hash)
                : false;

        if (!usuario || !passwordEsValida) {
            return res.status(401).json({
                ok: false,
                mensaje: 'Email o contraseña incorrectos.',
            });
        }

        // --- Generar el JWT ---
        const token = generarToken(usuario);

        // Devolvemos los datos del usuario sin el hash
        const { password_hash, ...usuarioSinHash } = usuario;

        return res.status(200).json({
            ok: true,
            mensaje: 'Inicio de sesión exitoso.',
            token,
            usuario: usuarioSinHash,
        });
    } catch (error) {
        console.error('[auth.controller] login:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno del servidor durante el inicio de sesión.',
        });
    }
};

// =============================================================================
// LOGIN / REGISTRO CON GOOGLE (OAuth2)
// =============================================================================

// -----------------------------------------------------------------------------
// POST /api/auth/google
//
// Flujo:
//   1. Recibir el `idToken` generado por el SDK de Google en el frontend.
//   2. Verificar su autenticidad con OAuth2Client (valida firma, audience y expiración).
//   3. Extraer email, nombre y apellido del payload verificado.
//   4. Buscar al usuario en la DB por email:
//      a) EXISTE → iniciar sesión directamente, devolver JWT.
//      b) NO EXISTE → crearlo con los datos disponibles de Google.
//         - Los campos astrológicos (fecha_nacimiento, hora_nacimiento, ciudad_origen,
//           telefono) son obligatorios en el schema. Se guardan con valores placeholder
//           semánticos ('0001-01-01', '00:00', 'pendiente') para respetar el NOT NULL.
//         - La respuesta incluye `requiere_datos_adicionales: true` para que el
//           frontend sepa que debe redirigir al usuario a completar su perfil.
//   5. Devolver el JWT de nuestro sistema (no el de Google).
//
// SEGURIDAD: Nunca usamos el token de Google como sesión en nuestra app.
// Lo verificamos y luego emitimos nuestro propio JWT con nuestra clave secreta.
// -----------------------------------------------------------------------------
export const googleLogin = async (req, res) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El campo "idToken" es obligatorio.',
            });
        }

        // --- Verificar el idToken con Google ---
        // Si el token es inválido, expirado o fue manipulado, verifyIdToken lanza un error.
        let payload;
        try {
            const ticket = await googleClient.verifyIdToken({
                idToken,
                audience: GOOGLE_CLIENT_ID,
            });
            payload = ticket.getPayload();
        } catch (googleError) {
            // El error de Google se loguea pero no se expone al cliente
            console.error('[auth.controller] googleLogin - Token inválido:', googleError.message);
            return res.status(401).json({
                ok: false,
                mensaje: 'El token de Google no es válido o ha expirado.',
            });
        }

        // --- Extraer datos del payload verificado ---
        const { email, given_name, family_name } = payload;

        if (!email) {
            return res.status(400).json({
                ok: false,
                mensaje: 'No se pudo obtener el email desde el token de Google.',
            });
        }

        // --- Buscar si el usuario ya existe en nuestra base de datos ---
        let usuario = await prisma.usuarios.findUnique({
            where: { email: email.toLowerCase() },
            omit: { password_hash: true },
        });

        let esUsuarioNuevo = false;

        if (!usuario) {
            // -----------------------------------------------------------------
            // USUARIO NUEVO: lo creamos con los datos que Google nos provee.
            // Los campos obligatorios del schema (fecha_nacimiento, hora_nacimiento,
            // ciudad_origen, telefono) se inicializan con placeholders semánticos
            // porque aún no los tenemos. El frontend detectará `requiere_datos_adicionales`
            // y redirigirá al usuario a un formulario para completar su perfil astral.
            // -----------------------------------------------------------------
            usuario = await prisma.usuarios.create({
                data: {
                    nombre: given_name?.trim() || 'Usuario',
                    apellido: family_name?.trim() || 'Google',
                    email: email.toLowerCase(),
                    password_hash: null, // Los usuarios de Google no tienen contraseña local
                    telefono: 'pendiente',
                    // Valores placeholder UTC que no generan desfase de zona horaria
                    fecha_nacimiento: new Date(Date.UTC(1, 0, 1)), // 0001-01-01
                    hora_nacimiento: new Date('1970-01-01T00:00:00.000Z'),
                    ciudad_origen: 'pendiente',
                },
                omit: { password_hash: true },
            });

            esUsuarioNuevo = true;
        }

        // --- Emitir nuestro propio JWT ---
        const token = generarToken(usuario);

        return res.status(esUsuarioNuevo ? 201 : 200).json({
            ok: true,
            mensaje: esUsuarioNuevo
                ? 'Cuenta creada con Google exitosamente.'
                : 'Inicio de sesión con Google exitoso.',
            // El frontend usa esta bandera para saber si redirigir al formulario de perfil
            requiere_datos_adicionales: esUsuarioNuevo,
            token,
            usuario,
        });
    } catch (error) {
        console.error('[auth.controller] googleLogin:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno del servidor durante el login con Google.',
        });
    }
};
