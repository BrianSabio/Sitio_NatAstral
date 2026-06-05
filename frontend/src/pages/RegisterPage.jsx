// =============================================================================
// RegisterPage.jsx
// Página de registro extendido en modo Dark Cósmico. Utiliza componentes de
// Shadcn UI adaptados al estilo y se conecta con auth.service.js.
// =============================================================================

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/auth.service';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    telefono: '',
    fecha_nacimiento: '',
    hora_nacimiento: '',
    ciudad_origen: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    // Validar hora_nacimiento formato HH:MM
    const horaRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!horaRegex.test(formData.hora_nacimiento)) {
      return 'La hora de nacimiento debe estar en formato HH:MM (ej. 14:30).';
    }
    
    // Validar fecha_nacimiento formato YYYY-MM-DD
    const fechaRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
    if (!fechaRegex.test(formData.fecha_nacimiento)) {
      return 'La fecha de nacimiento debe estar en formato YYYY-MM-DD.';
    }

    if (formData.password.length < 8) {
      return 'La contraseña debe tener al menos 8 caracteres.';
    }

    return null; // Sin errores
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.register(formData);
      // El backend devuelve el JWT y el usuario en response.token y response.usuario
      register(response.token, response.usuario);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cosmic-bg text-slate-100 flex items-center justify-center p-4 selection:bg-astral-purple selection:text-white">
      <Card className="w-full max-w-2xl shadow-lg shadow-astral-purple/10 border border-astral-purple/40 bg-cosmic-card backdrop-blur-md">
        <CardHeader className="text-center">
          <CardTitle className="text-astral-gold text-3xl font-bold font-serif tracking-wide">Crear Cuenta</CardTitle>
          <CardDescription className="text-slate-400">
            Completa tus datos natales para descubrir lo que los astros tienen para ti.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Errores del formulario/servidor */}
            {error && (
              <div className="p-3 bg-red-950/50 border border-red-900/50 text-red-300 rounded-lg text-sm text-center">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre" className="text-slate-300">Nombre</Label>
                <Input id="nombre" name="nombre" value={formData.nombre} onChange={handleChange} required placeholder="Sol" className="bg-cosmic-bg border-astral-purple/30 text-slate-100 focus-visible:ring-astral-purple-light" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apellido" className="text-slate-300">Apellido</Label>
                <Input id="apellido" name="apellido" value={formData.apellido} onChange={handleChange} required placeholder="Pérez" className="bg-cosmic-bg border-astral-purple/30 text-slate-100 focus-visible:ring-astral-purple-light" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">Email</Label>
                <Input id="email" type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="sol@ejemplo.com" className="bg-cosmic-bg border-astral-purple/30 text-slate-100 focus-visible:ring-astral-purple-light" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono" className="text-slate-300">Teléfono</Label>
                <Input id="telefono" type="tel" name="telefono" value={formData.telefono} onChange={handleChange} required placeholder="1122334455" className="bg-cosmic-bg border-astral-purple/30 text-slate-100 focus-visible:ring-astral-purple-light" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="password" className="text-slate-300">Contraseña</Label>
                <Input id="password" type="password" name="password" value={formData.password} onChange={handleChange} required placeholder="Mínimo 8 caracteres" className="bg-cosmic-bg border-astral-purple/30 text-slate-100 focus-visible:ring-astral-purple-light" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fecha_nacimiento" className="text-slate-300">Fecha de Nacimiento</Label>
                <Input id="fecha_nacimiento" type="date" name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleChange} required className="bg-cosmic-bg border-astral-purple/30 text-slate-100 focus-visible:ring-astral-purple-light" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hora_nacimiento" className="text-slate-300">Hora Exacta (HH:MM)</Label>
                <Input id="hora_nacimiento" type="time" name="hora_nacimiento" value={formData.hora_nacimiento} onChange={handleChange} required className="bg-cosmic-bg border-astral-purple/30 text-slate-100 focus-visible:ring-astral-purple-light" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="ciudad_origen" className="text-slate-300">Ciudad y País de Origen</Label>
                <Input id="ciudad_origen" name="ciudad_origen" value={formData.ciudad_origen} onChange={handleChange} required placeholder="Puerto Montt, Chile" className="bg-cosmic-bg border-astral-purple/30 text-slate-100 focus-visible:ring-astral-purple-light" />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-astral-purple hover:bg-astral-purple-light text-white font-semibold shadow-lg shadow-astral-purple/20"
              disabled={isLoading}
            >
              {isLoading ? 'Creando cuenta...' : 'Registrarme'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-astral-purple/30 bg-transparent p-4 mt-2 rounded-b-xl">
          <p className="text-sm text-slate-400">
            ¿Ya tienes una cuenta?{' '}
            <Link to="/login" className="text-astral-gold font-semibold hover:text-yellow-400 hover:underline transition-colors">
              Inicia sesión aquí
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default RegisterPage;
