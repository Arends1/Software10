import React, { useState, useEffect } from 'react';

const RevertirProcesos = () => {
  const [auditoria, setAuditoria] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [revertiendo, setRevertiendo] = useState(false);
  const [usuario, setUsuario] = useState(null);
  const [filtroAccion, setFiltroAccion] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => {
    cargarAuditoria();
    cargarUsuarios();
    const usuarioData = JSON.parse(localStorage.getItem('userData') || '{}');
    setUsuario(usuarioData);
  }, []);

  const cargarAuditoria = async () => {
    try {
      setCargando(true);
      const response = await fetch('https://constrefri-backend.onrender.com/auditoria');
      
      if (response.ok) {
        const data = await response.json();
        setAuditoria(data);
      } else {
        console.error('Error cargando auditoría');
        alert('Error al cargar la auditoría');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error de conexión al cargar auditoría');
    } finally {
      setCargando(false);
    }
  };

  const cargarUsuarios = async () => {
    try {
      const response = await fetch('https://constrefri-backend.onrender.com/usuarios');
      if (response.ok) {
        const data = await response.json();
        setUsuarios(data);
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    }
  };

  const revertirProceso = async (procesoId, procesoAccion) => {
    if (!usuario || usuario.rol !== 'dueño') {
      alert('❌ Solo el dueño puede revertir procesos');
      return;
    }

    if (!window.confirm(`¿Estás seguro de que quieres revertir este proceso?\n\nAcción: ${procesoAccion}\n\nEsta acción no se puede deshacer.`)) {
      return;
    }

    setRevertiendo(true);

    try {
      const response = await fetch('https://constrefri-backend.onrender.com/revertir-proceso', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proceso_id: procesoId,
          proceso_tipo: 'auditoria'
        }),
      });

      if (response.ok) {
        const resultado = await response.json();
        alert(`✅ ${resultado.mensaje}`);
        cargarAuditoria();
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error de conexión al revertir proceso');
    } finally {
      setRevertiendo(false);
    }
  };

  const formatFecha = (fechaString) => {
    return new Date(fechaString).toLocaleString('es-ES');
  };

  const getColorAccion = (accion) => {
    if (accion.includes('CREAR')) return 'bg-green-100 text-green-800 border border-green-200';
    if (accion.includes('ACTUALIZAR') || accion.includes('AJUSTAR')) return 'bg-blue-100 text-blue-800 border border-blue-200';
    if (accion.includes('LOGIN')) return 'bg-gray-100 text-gray-800 border border-gray-200';
    if (accion.includes('REVERTIR')) return 'bg-red-100 text-red-800 border border-red-200';
    if (accion.includes('CIERRE')) return 'bg-purple-100 text-purple-800 border border-purple-200';
    if (accion.includes('ELIMINAR')) return 'bg-red-100 text-red-800 border border-red-200';
    return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
  };

  const puedeRevertir = (registro) => {
    if (!registro) return false;
    
    // Solo procesos no revertidos
    if (registro.revertido) return false;
    
    // No revertir logins ni reversiones
    if (registro.accion.includes('LOGIN') || registro.accion.includes('REVERTIR')) return false;
    
    // Solo CIERRES DIARIOS se pueden revertir
    return registro.accion.includes('CIERRE_DIARIO');
  };

  const getDescripcionAccion = (accion) => {
    if (accion.includes('CIERRE_DIARIO')) return 'Cierre Diario';
    if (accion.includes('CREAR_PRODUCTO')) return 'Creación de Producto';
    if (accion.includes('CREAR_USUARIO')) return 'Creación de Usuario';
    if (accion.includes('ACTUALIZAR_PRODUCTO')) return 'Actualización de Producto';
    if (accion.includes('ELIMINAR_PRODUCTO')) return 'Eliminación de Producto';
    if (accion.includes('AJUSTAR_STOCK')) return 'Ajuste de Stock';
    if (accion.includes('LOGIN')) return 'Inicio de Sesión';
    return accion;
  };

  const limpiarFiltros = () => {
    setFiltroAccion('');
    setFiltroUsuario('');
  };

  // Filtrar auditoría
  const auditoriaFiltrada = auditoria.filter(registro => {
    const coincideAccion = filtroAccion === '' || registro.accion.includes(filtroAccion);
    const coincideUsuario = filtroUsuario === '' || 
      registro.usuario_id?.toString() === filtroUsuario ||
      registro.usuario_nombre?.toLowerCase().includes(filtroUsuario.toLowerCase()) ||
      registro.usuario_email?.toLowerCase().includes(filtroUsuario.toLowerCase());
    
    return coincideAccion && coincideUsuario;
  });

  // Obtener acciones únicas para el filtro
  const accionesUnicas = [...new Set(auditoria.map(r => r.accion))].sort();

  const esDueño = usuario && usuario.rol === 'dueño';

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Revertir Procesos del Sistema</h1>
        <div className="flex items-center gap-4">
          {usuario && (
            <span className={`text-sm px-3 py-1 rounded-full ${
              usuario.rol === 'dueño' ? 'bg-purple-100 text-purple-800' : 
              usuario.rol === 'administrador' ? 'bg-blue-100 text-blue-800' : 
              'bg-green-100 text-green-800'
            }`}>
              {usuario.nombre} ({usuario.rol})
            </span>
          )}
          <button
            onClick={cargarAuditoria}
            disabled={cargando}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
          >
            {cargando ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {!esDueño && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
          <p className="text-sm text-red-700">
            ❌ <strong>Acceso restringido:</strong> Solo el dueño puede revertir procesos del sistema.
          </p>
        </div>
      )}

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filtrar por Tipo de Acción
          </label>
          <select
            value={filtroAccion}
            onChange={(e) => setFiltroAccion(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los tipos</option>
            <option value="CIERRE_DIARIO">Cierres Diarios</option>
            <option value="ACTUALIZAR_PRODUCTO">Actualizaciones de Producto</option>
            <option value="CREAR_PRODUCTO">Creaciones de Producto</option>
            <option value="CREAR_USUARIO">Creaciones de Usuario</option>
            <option value="AJUSTAR_STOCK">Ajustes de Stock</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filtrar por Usuario
          </label>
          <select
            value={filtroUsuario}
            onChange={(e) => setFiltroUsuario(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los usuarios</option>
            {usuarios.map(usuario => (
              <option key={usuario.id} value={usuario.id}>
                {usuario.nombre} ({usuario.email})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={limpiarFiltros}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold"
          >
            Limpiar Filtros
          </button>
        </div>
      </div>

      {/* Filtros rápidos - SOLO CIERRES DIARIOS */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFiltroAccion('CIERRE_DIARIO')}
          className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium hover:bg-purple-200 border border-purple-200"
        >
          Solo Cierres Diarios
        </button>
        <button
          onClick={() => setFiltroAccion('')}
          className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium hover:bg-gray-200 border border-gray-200"
        >
          Ver Todo
        </button>
      </div>

      {cargando ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">Cargando auditoría...</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {auditoriaFiltrada.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay registros de auditoría que coincidan con los filtros.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Fecha y Hora
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Acción
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Detalles
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Estado
                    </th>
                    {esDueño && (
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Acciones
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {auditoriaFiltrada.map((registro) => (
                    <tr key={registro.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatFecha(registro.fecha)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{registro.usuario_nombre || 'Sistema'}</div>
                        <div className="text-sm text-gray-500">{registro.usuario_email || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getColorAccion(registro.accion)}`}>
                            {getDescripcionAccion(registro.accion)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {registro.tabla_afectada || 'Sistema'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-md">
                          {registro.detalles}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                          registro.revertido 
                            ? 'bg-red-100 text-red-800 border border-red-200' 
                            : 'bg-green-100 text-green-800 border border-green-200'
                        }`}>
                          {registro.revertido ? 'Revertido' : 'Activo'}
                        </span>
                      </td>
                      {esDueño && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          {puedeRevertir(registro) ? (
                            <button
                              onClick={() => revertirProceso(registro.id, registro.accion)}
                              disabled={revertiendo}
                              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {revertiendo ? 'Revertiendo...' : 'Revertir'}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-500 px-2 py-1">
                              {registro.revertido ? 'Ya revertido' : 'No reversible'}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!cargando && auditoria.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="text-sm text-gray-600">Total Registros</div>
            <div className="text-2xl font-bold text-gray-800">{auditoriaFiltrada.length} / {auditoria.length}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="text-sm text-gray-600">Procesos Activos</div>
            <div className="text-2xl font-bold text-green-600">
              {auditoriaFiltrada.filter(r => !r.revertido).length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="text-sm text-gray-600">Procesos Revertidos</div>
            <div className="text-2xl font-bold text-red-600">
              {auditoriaFiltrada.filter(r => r.revertido).length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="text-sm text-gray-600">Cierres Revertibles</div>
            <div className="text-2xl font-bold text-blue-600">
              {auditoriaFiltrada.filter(puedeRevertir).length}
            </div>
          </div>
        </div>
      )}

      {esDueño && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-2">Información sobre Reversiones</h3>
          <p className="text-sm text-blue-700">
            <strong>Procesos que se pueden revertir:</strong> Solo los <strong>Cierres Diarios</strong> pueden ser revertidos.
          </p>
          <p className="text-sm text-blue-700 mt-1">
            <strong>No se pueden revertir:</strong> Actualizaciones de productos, creaciones de usuarios, ajustes de stock, inicios de sesión y procesos ya revertidos.
          </p>
          <p className="text-sm text-blue-700 mt-1">
            <strong>Filtros disponibles:</strong> Puedes filtrar por tipo de acción y usuario específico. Usa "Solo Cierres Diarios" para ver solo los procesos revertibles.
          </p>
        </div>
      )}
    </div>
  );
};

export default RevertirProcesos;
