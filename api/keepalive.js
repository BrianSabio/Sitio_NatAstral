import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.SUPABASE_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 1,
});

export default async function handler(req, res) {
    try {
        const result = await pool.query(
            'SELECT id FROM public.usuarios WHERE id = $1 LIMIT 1',
            [1]
        );

        return res.status(200).json({
            ok: true,
            found: result.rowCount > 0,
            row: result.rows[0] ?? null
        });
    } catch (error) {
        console.error('keepalive error:', error);

        return res.status(500).json({
            ok: false,
            error: error.message
        });
    }
}