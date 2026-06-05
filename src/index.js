// =============================================================================
// index.js  —  Punto de entrada de la aplicación NatAstral API
// Configura Express, middlewares globales y monta todos los enrutadores.
// =============================================================================

import 'dotenv/config';
import express from 'express';
import cors from 'cors';

// --- Importación de enrutadores ---
import serviciosRouter from './routes/servicios.routes.js';
import disponibilidadRouter from './routes/disponibilidad.routes.js';
import authRouter from './routes/auth.routes.js';
import reservasRouter from './routes/reservas.routes.js';

// ---------------------------------------------------------------------------
// Inicialización de la aplicación Express
// ---------------------------------------------------------------------------
const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// Middlewares globales
// ---------------------------------------------------------------------------

// Habilita CORS para permitir peticiones desde el frontend
app.use(cors());

// Parsea el body de las peticiones como JSON
app.use(express.json());

// ---------------------------------------------------------------------------
// Montaje de rutas
// ---------------------------------------------------------------------------

// Ruta de salud: permite verificar rápidamente que el servidor está en pie
app.get('/', (req, res) => {
    res.status(200).json({
        ok: true,
        mensaje: 'NatAstral API en línea 🌙',
    });
});

// Módulo de Servicios
app.use('/api/servicios', serviciosRouter);

// Módulo de Disponibilidad y Agenda
app.use('/api/disponibilidad', disponibilidadRouter);

// Módulo de Autenticación
app.use('/api/auth', authRouter);

// Módulo de Reservas y Checkout
app.use('/api/reservas', reservasRouter);

// ---------------------------------------------------------------------------
// Middleware de manejo de rutas no encontradas (404)
// Debe ir DESPUÉS de todos los routers definidos.
// ---------------------------------------------------------------------------
app.use((req, res) => {
    res.status(404).json({
        ok: false,
        mensaje: `La ruta ${req.method} ${req.originalUrl} no existe en esta API.`,
    });
});

// ---------------------------------------------------------------------------
// Inicio del servidor
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
    console.log(`🚀 Servidor NatAstral escuchando en http://localhost:${PORT}`);
});
