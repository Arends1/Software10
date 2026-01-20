import React, { useState, useEffect } from 'react';

const AprobarMermas = () => {
  const [mermasPendientes, setMermasPendientes] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarMermasPendientes();
  }, []);

  const cargarMermasPendientes = async () => {
    try {
      setCargando(true);
      const response = await fetch('http://127.0.0.1:8000/mermas/pendientes');
      if (response.ok) {
        const data = await response.json();
        setMermasPendientes(data);
      }
    } catch (error) {
      console.error('Error cargando mermas pendientes:', error);
    } finally {
      setCargando(false);
    }
  };

  const aprobarMerma = async (mermaId) => {
    if (!window.confirm('¿Estás seguro de que quieres aprobar esta merma? Esta acción actualizará el stock inmediatamente.')) {
      return;
    }

    try {
      const usuarioData = JSON.parse(localStorage.getItem('userData') || '{}');
      
      const response = await fetch(`http://127.0.0.1:8000/mermas/aprobar?merma_id=${mermaId}&usuario_id=${usuarioData.id}`, {
        method: 'POST',
      });

      if (response.ok) {
        const resultado = await response.json();
        alert(`✅ ${resultado.mensaje}`);
        cargarMermasPendientes(); // Recargar la lista
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error de conexión al aprobar merma');
    }
  };

  const rechazarMerma = async (mermaId) => {
    const motivo = prompt('Ingresa el motivo del rechazo:');
    if (!motivo || motivo.trim() === '') {
      alert('Debes ingresar un motivo para rechazar la merma');
      return;
    }

    try {
      const usuarioData = JSON.parse(localStorage.getItem('userData') || '{}');
      
      const response = await fetch(`http://127.0.0.1:8000/mermas/rechazar?merma_id=${mermaId}&usuario_id=${usuarioData.id}&motivo_rechazo=${encodeURIComponent(motivo)}`, {
        method: 'POST',
      });

      if (response.ok) {
        const resultado = await response.json();
        alert(`✅ ${resultado.mensaje}`);
        cargarMermasPendientes(); // Recargar la lista
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error de conexión al rechazar merma');
    }
  };

  const formatFecha = (fechaString) => {
    return new Date(fechaString).toLocaleString('es-ES');
  };

  if (cargando) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-4 text-gray-600">Cargando mermas pendientes...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Aprobar Mermas Pendientes</h2>
            <p className="text-gray-600">Revisa y gestiona las solicitudes de mermas de los empleados</p>
          </div>
          <button
            onClick={cargarMermasPendientes}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold"
          >
            Actualizar
          </button>
        </div>

        {mermasPendientes.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-green-500 text-6xl mb-4">✅</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No hay mermas pendientes</h3>
            <p className="text-gray-600">Todas las solicitudes han sido procesadas.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {mermasPendientes.map((merma) => (
              <div key={merma.id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-800">{merma.producto_nombre}</h4>
                    <p className="text-sm text-gray-600">Código: {merma.producto_codigo}</p>
                    <p className="text-sm text-gray-600">Stock actual: {merma.producto_stock}</p>
                  </div>
                  
                  <div>
                    <p className="text-lg font-bold text-red-600">-{merma.cantidad} unidades</p>
                    <p className="text-sm text-gray-600">Motivo: {merma.motivo}</p>
                    {merma.observaciones && (
                      <p className="text-sm text-gray-600 mt-1">Obs: {merma.observaciones}</p>
                    )}
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">
                      Solicitado por: <strong>{merma.usuario_solicitud_nombre}</strong>
                    </p>
                    <p className="text-sm text-gray-600">{merma.usuario_solicitud_email}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatFecha(merma.fecha_solicitud)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => aprobarMerma(merma.id)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold flex-1"
                  >
                    ✅ Aprobar Merma
                  </button>
                  <button
                    onClick={() => rechazarMerma(merma.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold flex-1"
                  >
                    ❌ Rechazar Merma
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {mermasPendientes.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">Información Importante</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Al <strong>aprobar</strong> una merma, el stock se actualizará inmediatamente</li>
              <li>• Al <strong>rechazar</strong> una merma, se pedirá un motivo y se notificará al empleado</li>
              <li>• Todas las acciones quedan registradas en el historial del sistema</li>
              <li>• Verifica que el stock sea suficiente antes de aprobar</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default AprobarMermas;