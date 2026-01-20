import React, { useState, useEffect } from 'react';

const AuditoriaCompleta = () => {
  const [auditoria, setAuditoria] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [filtroAccion, setFiltroAccion] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');

  useEffect(() => {
    cargarAuditoria();
    cargarUsuarios();
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

  const auditoriaFiltrada = auditoria.filter(registro => {
    const fechaRegistro = new Date(registro.fecha);
    const fechaDesde = filtroFechaDesde ? new Date(filtroFechaDesde) : null;
    const fechaHasta = filtroFechaHasta ? new Date(filtroFechaHasta + 'T23:59:59') : null;

    const coincideUsuario = filtroUsuario === '' || 
      registro.usuario_nombre?.toLowerCase().includes(filtroUsuario.toLowerCase()) || 
      registro.usuario_email?.toLowerCase().includes(filtroUsuario.toLowerCase()) ||
      registro.usuario_id?.toString() === filtroUsuario;

    const coincideAccion = filtroAccion === '' || 
      registro.accion?.toLowerCase().includes(filtroAccion.toLowerCase());

    const coincideFecha = (!fechaDesde || fechaRegistro >= fechaDesde) && 
                         (!fechaHasta || fechaRegistro <= fechaHasta);

    return coincideUsuario && coincideAccion && coincideFecha;
  });

  const accionesUnicas = [...new Set(auditoria.map(r => r.accion))].sort();

  const limpiarFiltros = () => {
    setFiltroUsuario('');
    setFiltroAccion('');
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
  };

  const formatFecha = (fechaString) => {
    return new Date(fechaString).toLocaleString('es-ES');
  };

  const getColorAccion = (accion) => {
    if (accion.includes('CREAR')) return 'bg-green-100 text-green-800 border border-green-200';
    if (accion.includes('ACTUALIZAR') || accion.includes('ELIMINAR')) return 'bg-blue-100 text-blue-800 border border-blue-200';
    if (accion.includes('LOGIN')) return 'bg-gray-100 text-gray-800 border border-gray-200';
    if (accion.includes('REVERTIR')) return 'bg-red-100 text-red-800 border border-red-200';
    if (accion.includes('CIERRE')) return 'bg-purple-100 text-purple-800 border border-purple-200';
    if (accion.includes('AJUSTE')) return 'bg-orange-100 text-orange-800 border border-orange-200';
    return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
  };

  const getEstadoColor = (revertido) => {
    return revertido 
      ? 'bg-red-100 text-red-800 border border-red-200' 
      : 'bg-green-100 text-green-800 border border-green-200';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Auditoría Completa del Sistema</h1>
        <div className="flex gap-2">
          <button
            onClick={limpiarFiltros}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold"
          >
            Limpiar Filtros
          </button>
          <button
            onClick={cargarAuditoria}
            disabled={cargando}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
          >
            {cargando ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filtrar por Acción
          </label>
          <select
            value={filtroAccion}
            onChange={(e) => setFiltroAccion(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas las acciones</option>
            {accionesUnicas.map(accion => (
              <option key={accion} value={accion}>
                {accion}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fecha Desde
          </label>
          <input
            type="date"
            value={filtroFechaDesde}
            onChange={(e) => setFiltroFechaDesde(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fecha Hasta
          </label>
          <input
            type="date"
            value={filtroFechaHasta}
            onChange={(e) => setFiltroFechaHasta(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFiltroAccion('CIERRE')}
          className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium hover:bg-purple-200"
        >
          Cierres Diarios
        </button>
        <button
          onClick={() => setFiltroAccion('LOGIN')}
          className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium hover:bg-gray-200"
        >
          Inicios de Sesión
        </button>
        <button
          onClick={() => setFiltroAccion('CREAR')}
          className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium hover:bg-green-200"
        >
          Creaciones
        </button>
        <button
          onClick={() => setFiltroAccion('ELIMINAR')}
          className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium hover:bg-red-200"
        >
          Eliminaciones
        </button>
        <button
          onClick={() => setFiltroAccion('ACTUALIZAR')}
          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium hover:bg-blue-200"
        >
          Actualizaciones
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
                      Tabla Afectada
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Detalles
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {auditoriaFiltrada.map((registro) => (
                    <tr key={registro.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatFecha(registro.fecha)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{registro.usuario_nombre || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{registro.usuario_email || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getColorAccion(registro.accion)}`}>
                          {registro.accion}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{registro.tabla_afectada || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-md">
                          {registro.detalles}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getEstadoColor(registro.revertido)}`}>
                          {registro.revertido ? 'Revertido' : 'Activo'}
                        </span>
                      </td>
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
            <div className="text-sm text-gray-600">Registros Activos</div>
            <div className="text-2xl font-bold text-green-600">
              {auditoriaFiltrada.filter(r => !r.revertido).length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="text-sm text-gray-600">Registros Revertidos</div>
            <div className="text-2xl font-bold text-red-600">
              {auditoriaFiltrada.filter(r => r.revertido).length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="text-sm text-gray-600">Usuarios Únicos</div>
            <div className="text-2xl font-bold text-blue-600">
              {new Set(auditoriaFiltrada.map(r => r.usuario_id)).size}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-800 mb-2">Información de Auditoría</h3>
        <p className="text-sm text-blue-700">
          Este módulo muestra todos los registros de actividad del sistema. Cada acción realizada por los usuarios 
          queda registrada con fecha, hora, usuario responsable y detalles de la operación.
        </p>
        <p className="text-sm text-blue-700 mt-2">
          <strong>Filtros disponibles:</strong> Por usuario específico, tipo de acción, y rango de fechas.
        </p>
      </div>
    </div>
  );
};

export default AuditoriaCompleta;
