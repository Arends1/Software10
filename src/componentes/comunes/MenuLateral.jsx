import React from 'react';

const MenuLateral = ({ rol, seccionActiva, onCambiarSeccion }) => {
  const opcionesEmpleado = [
    { id: 'cierre-diario', nombre: 'Cierre Diario', icono: '📊' },
    { id: 'consulta-inventario', nombre: 'Consultar Inventario', icono: '📦' },
    { id: 'ajustes-inventario', nombre: 'Ajustes de Inventario', icono: '✏️' }
  ];

  const opcionesAdministrador = [
    { id: 'gestion-usuarios', nombre: 'Gestión de Usuarios', icono: '👥' },
    { id: 'reportes-avanzados', nombre: 'Reportes Avanzados', icono: '📈' },
    { id: 'configuracion-sistema', nombre: 'Configuración', icono: '⚙️' }
  ];

  const opcionesDueño = [
    { id: 'dashboard-ejecutivo', nombre: 'Dashboard Ejecutivo', icono: '🏠' },
    { id: 'auditoria-completa', nombre: 'Auditoría Completa', icono: '🔍' },
    { id: 'control-remoto', nombre: 'Control Remoto', icono: '📱' }
  ];

  const obtenerOpciones = () => {
    switch(rol) {
      case 'dueño': return opcionesDueño;
      case 'administrador': return opcionesAdministrador;
      default: return opcionesEmpleado;
    }
  };

  return (
    <div className="bg-gray-800 text-white w-64 min-h-screen p-4">
      <h2 className="text-lg font-semibold mb-6">Menú Principal</h2>
      
      <nav className="space-y-2">
        {obtenerOpciones().map((opcion) => (
          <button
            key={opcion.id}
            onClick={() => onCambiarSeccion(opcion.id)}
            className={`w-full text-left px-4 py-3 rounded-lg transition duration-150 ${
              seccionActiva === opcion.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            <span className="mr-3">{opcion.icono}</span>
            {opcion.nombre}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default MenuLateral;