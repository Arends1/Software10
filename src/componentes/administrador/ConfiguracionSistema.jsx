import React, { useState, useEffect } from 'react';

const ConfiguracionSistema = () => {
  const [configuraciones, setConfiguraciones] = useState({
    empresa: {
      nombre: 'Constrefri',
      telefono: '+1234567890',
      direccion: 'Av. Principal 123',
      email: 'info@constrefri.com'
    },
    inventario: {
      alertaStockBajo: 10,
      alertaStockCritico: 5,
      diasBackup: 7
    },
    sistema: {
      horarioApertura: '08:00',
      horarioCierre: '18:00',
      tiempoSesion: 60
    }
  });

  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);

  // Cargar configuraciones al iniciar
  useEffect(() => {
    cargarConfiguraciones();
  }, []);

  const cargarConfiguraciones = async () => {
    try {
      setCargando(true);
      const response = await fetch('http://127.0.0.1:8000/configuraciones');
      
      if (response.ok) {
        const data = await response.json();
        
        // Mapear las configuraciones de la base de datos al estado local
        setConfiguraciones({
          empresa: {
            nombre: data.empresa_nombre || 'Constrefri',
            telefono: data.empresa_telefono || '+1234567890',
            direccion: data.empresa_direccion || 'Av. Principal 123',
            email: data.empresa_email || 'info@constrefri.com'
          },
          inventario: {
            alertaStockBajo: parseInt(data.alerta_stock_bajo) || 10,
            alertaStockCritico: parseInt(data.alerta_stock_critico) || 5,
            diasBackup: parseInt(data.dias_backup) || 7
          },
          sistema: {
            horarioApertura: data.horario_apertura || '08:00',
            horarioCierre: data.horario_cierre || '18:00',
            tiempoSesion: parseInt(data.tiempo_sesion) || 60
          }
        });
      }
    } catch (error) {
      console.error('Error cargando configuraciones:', error);
    } finally {
      setCargando(false);
    }
  };

  const manejarGuardar = async () => {
    setGuardando(true);
    
    try {
      // Preparar todas las configuraciones para enviar
      const configsParaGuardar = [
        { clave: 'empresa_nombre', valor: configuraciones.empresa.nombre },
        { clave: 'empresa_telefono', valor: configuraciones.empresa.telefono },
        { clave: 'empresa_direccion', valor: configuraciones.empresa.direccion },
        { clave: 'empresa_email', valor: configuraciones.empresa.email },
        { clave: 'alerta_stock_bajo', valor: configuraciones.inventario.alertaStockBajo.toString() },
        { clave: 'alerta_stock_critico', valor: configuraciones.inventario.alertaStockCritico.toString() },
        { clave: 'dias_backup', valor: configuraciones.inventario.diasBackup.toString() },
        { clave: 'horario_apertura', valor: configuraciones.sistema.horarioApertura },
        { clave: 'horario_cierre', valor: configuraciones.sistema.horarioCierre },
        { clave: 'tiempo_sesion', valor: configuraciones.sistema.tiempoSesion.toString() }
      ];

      const response = await fetch('http://127.0.0.1:8000/configuraciones/actualizar-multiples', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configsParaGuardar)
      });

      if (response.ok) {
        alert('✅ Configuraciones guardadas exitosamente');
        // Recargar la página para aplicar cambios en todos los componentes
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error guardando configuraciones:', error);
      alert('❌ Error de conexión al guardar configuraciones');
    } finally {
      setGuardando(false);
    }
  };

  const actualizarConfiguracion = (seccion, campo, valor) => {
    setConfiguraciones(prev => ({
      ...prev,
      [seccion]: {
        ...prev[seccion],
        [campo]: valor
      }
    }));
  };

  if (cargando) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-4 text-gray-600">Cargando configuraciones...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Configuracion del Sistema</h2>

      <div className="space-y-8">
        {/* Configuracion de Empresa */}
        <div className="border-b pb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Informacion de la Empresa</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de la Empresa</label>
              <input
                type="text"
                value={configuraciones.empresa.nombre}
                onChange={(e) => actualizarConfiguracion('empresa', 'nombre', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Telefono</label>
              <input
                type="text"
                value={configuraciones.empresa.telefono}
                onChange={(e) => actualizarConfiguracion('empresa', 'telefono', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Direccion</label>
              <input
                type="text"
                value={configuraciones.empresa.direccion}
                onChange={(e) => actualizarConfiguracion('empresa', 'direccion', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={configuraciones.empresa.email}
                onChange={(e) => actualizarConfiguracion('empresa', 'email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Configuracion de Inventario */}
        <div className="border-b pb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Configuracion de Inventario</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Alerta Stock Bajo</label>
              <input
                type="number"
                value={configuraciones.inventario.alertaStockBajo}
                onChange={(e) => actualizarConfiguracion('inventario', 'alertaStockBajo', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Unidades minimas para alerta amarilla</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Alerta Stock Critico</label>
              <input
                type="number"
                value={configuraciones.inventario.alertaStockCritico}
                onChange={(e) => actualizarConfiguracion('inventario', 'alertaStockCritico', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Unidades minimas para alerta roja</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dias entre Backups</label>
              <input
                type="number"
                value={configuraciones.inventario.diasBackup}
                onChange={(e) => actualizarConfiguracion('inventario', 'diasBackup', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Frecuencia de respaldos automaticos</p>
            </div>
          </div>
        </div>

        {/* Configuracion del Sistema */}
        <div className="border-b pb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Configuracion del Sistema</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Horario de Apertura</label>
              <input
                type="time"
                value={configuraciones.sistema.horarioApertura}
                onChange={(e) => actualizarConfiguracion('sistema', 'horarioApertura', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Horario de Cierre</label>
              <input
                type="time"
                value={configuraciones.sistema.horarioCierre}
                onChange={(e) => actualizarConfiguracion('sistema', 'horarioCierre', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tiempo de Sesion (min)</label>
              <input
                type="number"
                value={configuraciones.sistema.tiempoSesion}
                onChange={(e) => actualizarConfiguracion('sistema', 'tiempoSesion', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Minutos de inactividad antes de cerrar sesion</p>
            </div>
          </div>
        </div>

        {/* Botones de Accion */}
        <div className="flex space-x-4">
          <button
            onClick={manejarGuardar}
            disabled={guardando}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition duration-200 disabled:cursor-not-allowed"
          >
            {guardando ? 'Guardando...' : 'Guardar Configuraciones'}
          </button>
          <button
            onClick={cargarConfiguraciones}
            className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition duration-200"
          >
            Cancelar Cambios
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfiguracionSistema;