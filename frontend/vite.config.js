import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

// En ESM no existe __dirname nativo; se reconstruye a partir de import.meta.url
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Tailwind CSS v4 se integra como plugin de Vite (ya no requiere postcss.config.js)
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // El alias '@' apunta a 'src/' para importaciones absolutas limpias.
      // Requisito obligatorio para que Shadcn UI funcione correctamente.
      '@': path.resolve(__dirname, './src'),
    },
  },
});
