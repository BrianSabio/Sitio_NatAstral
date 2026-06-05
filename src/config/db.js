// =============================================================================
// db.js  —  Configuración del cliente de Prisma para Prisma v7+
//
// CAMBIO ARQUITECTÓNICO en Prisma v7:
// La versión 7 eliminó el engine Rust y ahora requiere un "driver adapter" JS
// nativo. Para PostgreSQL se usa `@prisma/adapter-pg`. El cliente ya NO acepta
// `datasourceUrl` ni `datasources` directamente; la URL se pasa al adapter.
// =============================================================================

import { PrismaClient } from '../generated/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';

// El adapter PrismaPg toma la DATABASE_URL del .env y gestiona el pool de conexiones
const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});

// Patrón singleton: reutiliza la instancia de Prisma en entornos de desarrollo
// con hot-reload (nodemon) para evitar abrir múltiples conexiones a la DB.
const prisma = global.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
    global.prisma = prisma;
}

export default prisma;