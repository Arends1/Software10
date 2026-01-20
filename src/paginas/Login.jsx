import React, { useState } from 'react';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // URL del backend en Render
  const API_URL = 'https://constrefri-backend.onrender.com';

  const manejarEnvio = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const loginData = {
        username: email,
        password: password
      };

      // CAMBIADO: localhost → tu backend de Render
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Credenciales incorrectas');
      }

      const data = await response.json();
      
      localStorage.setItem('authToken', data.token_acceso);
      localStorage.setItem('userData', JSON.stringify(data.usuario));
      
      onLogin(data.usuario);
      
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-8 w-full max-w-md">
        
        <div className="text-center mb-8">
          <div className="w-24 h-24 flex items-center justify-center mx-auto mb-4 transform transition-transform duration-300 hover:scale-105">
            <img 
              src="/logo.png"  // CAMBIADO: src/assets/logo.png → /logo.png
              alt="Constrefri Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">El Unificador</h1>
          <p className="text-gray-600">Constrefri</p>
        </div>

        <form onSubmit={manejarEnvio} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
              placeholder="usuario@constrefri.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-t-2 border-white border-solid rounded-full animate-spin mr-2"></div>
                Iniciando Sesión...
              </div>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>

        <div className="mt-6 p-4 bg-blue-50/50 rounded-xl border border-blue-200">
          <p className="text-sm text-blue-700 text-center">
            <strong>Usuarios de Prueba:</strong>
          </p>
          <p className="text-xs text-blue-600 text-center mt-1">
            empleado@constrefri.com / empleado123
          </p>
          <p className="text-xs text-blue-600 text-center">
            admin@constrefri.com / admin123
          </p>
          <p className="text-xs text-blue-600 text-center">
            dueno@constrefri.com / dueno123
          </p>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            v1.0.0 • Sistema seguro y confiable
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
