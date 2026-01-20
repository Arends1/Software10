import React, { useState, useEffect } from 'react';

const GestionUsuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'empleado'
  });
  const [cargando, setCargando] = useState(false);
  const [usuarioActual, setUsuarioActual] = useState(null);

  useEffect(() => {
    cargarUsuarios();
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    setUsuarioActual(userData);
  }, []);

  const cargarUsuarios = async () => {
    try {
      console.log('Cargando usuarios...');
      const response = await fetch('https://constrefri-backend.onrender.com/usuarios');
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Usuarios cargados:', data);
        setUsuarios(data);
      } else {
        console.error('Error response:', response.status);
        alert('Error al cargar usuarios: ' + response.status);
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      alert('Error de conexión al backend');
    }
  };

  const crearUsuario = async (e) => {
    e.preventDefault();
    
    if (nuevoUsuario.password.length < 6) {
      alert('❌ La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setCargando(true);

    try {
      console.log('Creando usuario:', nuevoUsuario);
      const response = await fetch('https://constrefri-backend.onrender.com/usuarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nuevoUsuario),
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const usuarioCreado = await response.json();
        console.log('Usuario creado:', usuarioCreado);
        setNuevoUsuario({ nombre: '', email: '', password: '', rol: 'empleado' });
        setMostrarFormulario(false);
        alert('✅ Usuario creado exitosamente');
        cargarUsuarios(); // Recargar la lista completa
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error creando usuario:', error);
      alert('❌ Error de conexión al crear usuario');
    } finally {
      setCargando(false);
    }
  };

  const eliminarUsuario = async (usuarioId, usuarioNombre) => {
    // Solo el dueño puede eliminar usuarios
    if (!usuarioActual || usuarioActual.rol !== 'dueño') {
      alert('❌ Solo el dueño puede eliminar usuarios');
      return;
    }

    // No permitir eliminarse a sí mismo
    if (usuarioActual.id === usuarioId) {
      alert('❌ No puedes eliminar tu propio usuario');
      return;
    }

    if (!window.confirm(`¿Estás seguro de eliminar al usuario "${usuarioNombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      console.log('Eliminando usuario ID:', usuarioId);
      
      // LLAMADA REAL AL BACKEND PARA ELIMINAR
      const response = await fetch(`http://127.0.0.1:8000/usuarios/${usuarioId}?usuario_actual_id=${usuarioActual.id}`, {
        method: 'DELETE',
      });

      console.log('Response status eliminación:', response.status);

      if (response.ok) {
        const resultado = await response.json();
        console.log('Resultado eliminación:', resultado);
        
        // Recargar la lista completa de usuarios
        await cargarUsuarios();
        
        alert(`✅ ${resultado.mensaje}`);
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.detail}`);
      }
      
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      alert('❌ Error de conexión al eliminar usuario');
    }
  };

  // Verificar si el usuario actual es dueño
  const esDueño = usuarioActual && usuarioActual.rol === 'dueño';

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gestión de Usuarios</h1>
        <div className="flex items-center gap-4">
          {usuarioActual && (
            <span className={`text-sm px-3 py-1 rounded-full ${
              usuarioActual.rol === 'dueño' ? 'bg-purple-100 text-purple-800' : 
              usuarioActual.rol === 'administrador' ? 'bg-blue-100 text-blue-800' : 
              'bg-green-100 text-green-800'
            }`}>
              {usuarioActual.nombre} ({usuarioActual.rol})
            </span>
          )}
          <button
            onClick={() => setMostrarFormulario(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold"
          >
            + Crear Usuario
          </button>
        </div>
      </div>

      {mostrarFormulario && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Crear Nuevo Usuario</h2>
            <form onSubmit={crearUsuario} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={nuevoUsuario.nombre}
                  onChange={(e) => setNuevoUsuario({...nuevoUsuario, nombre: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Ej: Juan Pérez"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={nuevoUsuario.email}
                  onChange={(e) => setNuevoUsuario({...nuevoUsuario, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="usuario@constrefri.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña
                </label>
                <input
                  type="password"
                  required
                  value={nuevoUsuario.password}
                  onChange={(e) => setNuevoUsuario({...nuevoUsuario, password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Mínimo 6 caracteres"
                  minLength="6"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rol
                </label>
                <select
                  value={nuevoUsuario.rol}
                  onChange={(e) => setNuevoUsuario({...nuevoUsuario, rol: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="empleado">Empleado</option>
                  <option value="administrador">Administrador</option>
                  <option value="dueño">Dueño</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={cargando}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-semibold disabled:opacity-50"
                >
                  {cargando ? 'Creando...' : 'Crear Usuario'}
                </button>
                <button
                  type="button"
                  onClick={() => setMostrarFormulario(false)}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg font-semibold"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Usuario
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Rol
              </th>
              {esDueño && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {usuarios.map((usuario) => (
              <tr key={usuario.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{usuario.nombre}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-600">{usuario.email}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    usuario.rol === 'dueño' ? 'bg-purple-100 text-purple-800' :
                    usuario.rol === 'administrador' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {usuario.rol}
                  </span>
                </td>
                {esDueño && (
                  <td className="px-6 py-4">
                    <button
                      onClick={() => eliminarUsuario(usuario.id, usuario.nombre)}
                      disabled={usuarioActual && usuarioActual.id === usuario.id}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Eliminar
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {esDueño && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700">
            <strong>Nota:</strong> Como dueño, puedes eliminar usuarios excepto tu propio usuario.
          </p>
        </div>
      )}

      {!esDueño && usuarios.length > 0 && (
        <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-700">
            <strong>Nota:</strong> Solo el dueño puede eliminar usuarios.
          </p>
        </div>
      )}
    </div>
  );
};

export default GestionUsuarios;
