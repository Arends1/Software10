const API_URL = 'https://constrefri-backend.onrender.com';

export class APIService {
  static async login(email, password) {
    try {
      const loginData = {
        username: email,  // Tu backend espera "username" 
        password: password
      };

      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',  // AÑADE ESTO
        },
        body: JSON.stringify(loginData),  // Envía JSON, no FormData
      });

      if (!response.ok) {
        throw new Error('Credenciales incorrectas');
      }

      return await response.json();
    } catch (error) {
      throw new Error(error.message || 'Error de conexión');
    }
  }

  static setToken(token) {
    localStorage.setItem('authToken', token);
  }

  static getToken() {
    return localStorage.getItem('authToken');
  }

  static removeToken() {
    localStorage.removeItem('authToken');
  }
}
