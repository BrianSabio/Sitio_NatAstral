// =============================================================================
// auth.service.js
// Aísla todas las peticiones HTTP relacionadas con la autenticación.
// Configura las cabeceras comunes y maneja los errores de forma centralizada.
// =============================================================================

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const defaultHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
};

/**
 * Maneja la respuesta del fetch, parseando el JSON y lanzando errores
 * si la propiedad ok es false o si el status HTTP no es 2xx.
 */
const handleResponse = async (response) => {
  const data = await response.json().catch(() => null);
  
  if (!response.ok || (data && !data.ok)) {
    const errorMsg = data?.mensaje || `Error del servidor: ${response.statusText}`;
    throw new Error(errorMsg);
  }
  
  return data;
};

export const authService = {
  /**
   * Registra un nuevo usuario de forma manual.
   * @param {Object} userData Datos del usuario
   * @returns {Promise<Object>} Respuesta del backend (token, usuario)
   */
  async register(userData) {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify(userData),
    });
    return handleResponse(response);
  },

  /**
   * Inicia sesión de forma manual.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<Object>} Respuesta del backend (token, usuario, requiere_datos_adicionales)
   */
  async login(email, password) {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(response);
  },

  /**
   * Completa el perfil astrológico del usuario (Ej. después de login con Google).
   * @param {string} token Token temporal o actual
   * @param {Object} profileData Datos faltantes (fecha_nacimiento, hora_nacimiento, ciudad_origen)
   */
  async completeProfile(token, profileData) {
    // Nota: El endpoint exacto de actualización debe implementarse en el backend.
    // Por convención, usamos un PUT a un recurso de perfil/usuario.
    const response = await fetch(`${API_URL}/api/usuarios/perfil`, {
      method: 'PUT',
      headers: {
        ...defaultHeaders,
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(profileData),
    });
    return handleResponse(response);
  }
};
