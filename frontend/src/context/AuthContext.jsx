// =============================================================================
// AuthContext.jsx
// Estado global de autenticación de NatAstral.
//
// Expone al árbol de componentes:
//   - `token`    → El JWT del usuario autenticado (null si no hay sesión).
//   - `usuario`  → Los datos básicos del usuario (id, nombre, email).
//   - `login`    → Función para iniciar sesión: recibe token + datos y los persiste.
//   - `logout`   → Función para cerrar sesión: limpia el estado y el localStorage.
//   - `isLoading`→ Estado de carga inicial mientras se restaura la sesión desde localStorage.
// =============================================================================

import { createContext, useState, useEffect, useContext } from 'react';

// Clave usada para persistir el token en localStorage
const TOKEN_KEY = 'natastral_token';
const USUARIO_KEY = 'natastral_usuario';

// 1. Crear el contexto con valores por defecto
export const AuthContext = createContext({
  token: null,
  usuario: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

// 2. Proveedor del contexto — envuelve el árbol de rutas en App.jsx
export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [usuario, setUsuario] = useState(null);
  // isLoading en true evita un parpadeo de "no autenticado" mientras se
  // restaura la sesión desde localStorage al cargar la app.
  const [isLoading, setIsLoading] = useState(true);

  // Restaurar sesión desde localStorage al montar el proveedor
  useEffect(() => {
    const tokenGuardado = localStorage.getItem(TOKEN_KEY);
    const usuarioGuardado = localStorage.getItem(USUARIO_KEY);

    if (tokenGuardado && usuarioGuardado) {
      setToken(tokenGuardado);
      setUsuario(JSON.parse(usuarioGuardado));
    }

    // La carga inicial terminó; ya sea con sesión o sin ella
    setIsLoading(false);
  }, []);

  /**
   * Inicia sesión guardando el token y los datos del usuario.
   * @param {string} nuevoToken - JWT recibido del backend.
   * @param {object} datosUsuario - Objeto con id, nombre, email del usuario.
   */
  const login = (nuevoToken, datosUsuario) => {
    setToken(nuevoToken);
    setUsuario(datosUsuario);
    localStorage.setItem(TOKEN_KEY, nuevoToken);
    localStorage.setItem(USUARIO_KEY, JSON.stringify(datosUsuario));
  };

  /**
   * Cierra la sesión: limpia el estado de React y el localStorage.
   */
  const logout = () => {
    setToken(null);
    setUsuario(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USUARIO_KEY);
  };

  /**
   * Alias de login para semántica en flujos de registro.
   */
  const register = (nuevoToken, datosUsuario) => {
    login(nuevoToken, datosUsuario);
  };

  return (
    <AuthContext.Provider value={{ token, usuario, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// 3. Custom hook para consumir el contexto de forma limpia
// Uso: const { token, login, register, logout } = useAuth();
export const useAuth = () => useContext(AuthContext);
