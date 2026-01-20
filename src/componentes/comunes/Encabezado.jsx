import React from 'react';

const Encabezado = ({ usuario, onCerrarSesion }) => {
  const obtenerColorRol = (rol) => {
    switch(rol) {
      case 'dueño': return 'bg-purple-100 text-purple-800';
      case 'administrador': return 'bg-green-100 text-green-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const obtenerTextoRol = (rol) => {
    switch(rol) {
      case 'dueño': return 'Dueño';
      case 'administrador': return 'Administrador';
      default: return 'Empleado';
    }
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">
              El Unificador
            </h1>
            <span className="ml-4 text-sm text-gray-500">
              Constrefri
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{usuario?.email}</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${obtenerColorRol(usuario?.rol)}`}>
                {obtenerTextoRol(usuario?.rol)}
              </span>
            </div>
            
            <button
              onClick={onCerrarSesion}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm font-medium transition duration-150"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Encabezado;