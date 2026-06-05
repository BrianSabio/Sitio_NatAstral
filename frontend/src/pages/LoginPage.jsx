// =============================================================================
// LoginPage.jsx
// Página de inicio de sesión. Maneja el flujo clásico y el requerimiento crítico:
// la captura de datos astrológicos adicionales si la cuenta proviene de Google
// o si le faltan datos obligatorios.
// =============================================================================

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/auth.service';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Estados del flujo
  const [step, setStep] = useState('login');
  
  // Datos temporales para el caso de requerir más información
  const [tempToken, setTempToken] = useState(null);
  const [tempUsuario, setTempUsuario] = useState(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [profileData, setProfileData] = useState({
    fecha_nacimiento: '',
    hora_nacimiento: '',
    ciudad_origen: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChangeForm = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleChangeProfile = (e) => setProfileData({ ...profileData, [e.target.name]: e.target.value });

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await authService.login(formData.email, formData.password);
      
      if (response.requiere_datos_adicionales) {
        setTempToken(response.token);
        setTempUsuario(response.usuario);
        setStep('complete_profile');
      } else {
        login(response.token, response.usuario);
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    const horaRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!horaRegex.test(profileData.hora_nacimiento)) {
      setError('La hora de nacimiento debe estar en formato HH:MM.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.completeProfile(tempToken, profileData);
      login(tempToken, tempUsuario);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(`No pudimos guardar tus datos: ${err.message}.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cosmic-bg text-slate-100 flex items-center justify-center p-4 selection:bg-astral-purple selection:text-white">
      <Card className="w-full max-w-md shadow-lg shadow-astral-purple/20 border border-astral-purple/40 bg-cosmic-card backdrop-blur-md">
        
        {step === 'login' && (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-astral-gold text-3xl font-bold font-serif tracking-wide">Iniciar Sesión</CardTitle>
              <CardDescription className="text-slate-400">
                Ingresa para acceder a tu historial y reservar un turno.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLoginSubmit} className="space-y-6">
                
                {error && (
                  <div className="p-3 bg-red-950/50 border border-red-900/50 text-red-300 rounded-lg text-sm text-center">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-300">Email</Label>
                  <Input 
                    id="email" type="email" name="email" 
                    value={formData.email} onChange={handleChangeForm} 
                    required placeholder="sol@ejemplo.com" 
                    className="bg-cosmic-bg border-astral-purple/30 text-slate-100 focus-visible:ring-astral-purple-light"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-300">Contraseña</Label>
                  <Input 
                    id="password" type="password" name="password" 
                    value={formData.password} onChange={handleChangeForm} 
                    required placeholder="Tu contraseña" 
                    className="bg-cosmic-bg border-astral-purple/30 text-slate-100 focus-visible:ring-astral-purple-light"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-astral-purple hover:bg-astral-purple-light text-white font-semibold shadow-lg shadow-astral-purple/20"
                  disabled={isLoading}
                >
                  {isLoading ? 'Ingresando...' : 'Iniciar Sesión'}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex justify-center border-t border-astral-purple/30 bg-transparent p-4 mt-2 rounded-b-xl">
              <p className="text-sm text-slate-400">
                ¿No tienes una cuenta?{' '}
                <Link to="/register" className="text-astral-gold font-semibold hover:underline">
                  Crea una gratis
                </Link>
              </p>
            </CardFooter>
          </>
        )}

        {step === 'complete_profile' && (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-astral-gold text-2xl font-bold font-serif tracking-wide">Completa tu Perfil</CardTitle>
              <CardDescription className="text-slate-400">
                Para brindarte una lectura precisa, necesitamos tus datos natales exactos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                
                {error && (
                  <div className="p-3 bg-red-950/50 border border-red-900/50 text-red-300 rounded-lg text-sm text-center">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="fecha_nacimiento" className="text-slate-300">Fecha de Nacimiento</Label>
                  <Input 
                    id="fecha_nacimiento" type="date" name="fecha_nacimiento" 
                    value={profileData.fecha_nacimiento} onChange={handleChangeProfile} 
                    required 
                    className="bg-cosmic-bg border-astral-purple/30 text-slate-100 focus-visible:ring-astral-purple-light"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hora_nacimiento" className="text-slate-300">Hora Exacta (HH:MM)</Label>
                  <Input 
                    id="hora_nacimiento" type="time" name="hora_nacimiento" 
                    value={profileData.hora_nacimiento} onChange={handleChangeProfile} 
                    required 
                    className="bg-cosmic-bg border-astral-purple/30 text-slate-100 focus-visible:ring-astral-purple-light"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ciudad_origen" className="text-slate-300">Ciudad y País de Origen</Label>
                  <Input 
                    id="ciudad_origen" name="ciudad_origen" 
                    value={profileData.ciudad_origen} onChange={handleChangeProfile} 
                    required placeholder="Ej: Buenos Aires, Argentina" 
                    className="bg-cosmic-bg border-astral-purple/30 text-slate-100 focus-visible:ring-astral-purple-light"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-astral-gold hover:bg-yellow-400 text-slate-900 font-bold shadow-lg shadow-astral-gold/20"
                  disabled={isLoading}
                >
                  {isLoading ? 'Guardando...' : 'Finalizar y Entrar'}
                </Button>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
};

export default LoginPage;
