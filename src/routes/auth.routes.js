// =============================================================================
// auth.routes.js
// Define los endpoints de autenticación y los delega al controlador.
// El router no contiene lógica; solo mapea rutas a funciones.
// =============================================================================

import { Router } from 'express';
import { register, login, googleLogin } from '../controllers/auth.controller.js';

const router = Router();

// POST /api/auth/register  → Registro manual con todos los datos del usuario
router.post('/register', register);

// POST /api/auth/login     → Login manual: devuelve JWT si las credenciales son válidas
router.post('/login', login);

// POST /api/auth/google    → Login/Registro con Google OAuth2: recibe idToken del frontend
router.post('/google', googleLogin);

export default router;
