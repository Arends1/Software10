import React, { useState, useEffect } from 'react';

const AjustesStock = () => {
  const [productoSeleccionado, setProductoSeleccionado] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [productos, setProductos] = useState([]);
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    cargarProductos();
    const usuarioData = JSON.parse(localStorage.getItem('userData') || '{}');
    setUsuario(usuarioData);
  }, []);

  const cargarProductos = async () => {
    try {
      const response = await fetch('https://constrefri-backend.onrender.com/inventario');
      if (response.ok) {
        const data = await response.json();
        setProductos(data);
      }
    } catch (error) {
      console.error('Error cargando productos:', error);
    }
  };

  const productoActual = productos.find(p => p.id === parseInt(productoSeleccionado));

  const manejarEnvio = async (e) => {
    e.preventDefault();
    setEnviando(true);

    try {
      const usuarioData = JSON.parse(localStorage.getItem('userData') || '{}');
      
      const response = await fetch('https://constrefri-backend.onrender.com/mermas/registrar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          producto_id: parseInt(productoSeleccionado),
          cantidad: parseInt(cantidad),
          motivo: motivo,
          observaciones: observaciones,
          usuario_id: usuarioData.id
        }),
      });

      if (response.ok) {
        const resultado = await response.json();
        
        if (resultado.estado === 'aprobada') {
          alert(`✅ ${resultado.mensaje}`);
        } else {
          alert(`🟡 ${resultado.mensaje}`);
        }
        
        // Resetear formulario
        setProductoSeleccionado('');
        setCantidad('');
        setMotivo('');
        setObservaciones('');
        
        // Recargar productos para actualizar stock
        cargarProductos();
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error de conexión al registrar merma');
    } finally {
      setEnviando(false);
    }
  };

  const stockDespues = productoActual ? productoActual.stock_actual - parseInt(cantidad || 0) : 0;

  const esEmpleado = usuario && usuario.rol === 'empleado';

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Ajustes de Stock - Mermas</h2>
            <p className="text-gray-600">Registra pérdidas, daños o mermas de inventario</p>
          </div>
          {usuario && (
            <span className={`text-sm px-3 py-1 rounded-full ${
              usuario.rol === 'dueño' ? 'bg-purple-100 text-purple-800' : 
              usuario.rol === 'administrador' ? 'bg-blue-100 text-blue-800' : 
              'bg-green-100 text-green-800'
            }`}>
              {usuario.nombre} ({usuario.rol})
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulario */}
          <div>
            <form onSubmit={manejarEnvio} className="space-y-4">
              {/* Producto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Producto *
                </label>
                <select
                  value={productoSeleccionado}
                  onChange={(e) => setProductoSeleccionado(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Seleccionar producto</option>
                  {productos.map(producto => (
                    <option key={producto.id} value={producto.id}>
                      {producto.nombre} - {producto.codigo} (Stock: {producto.stock_actual})
                    </option>
                  ))}
                </select>
              </div>

              {/* Stock Actual (solo lectura) */}
              {productoActual && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Stock actual:</strong> {productoActual.stock_actual} unidades
                  </p>
                </div>
              )}

              {/* Cantidad a descontar */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cantidad a Descontar *
                </label>
                <input
                  type="number"
                  min="1"
                  max={productoActual ? productoActual.stock_actual : 1}
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: 2"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Máximo: {productoActual ? productoActual.stock_actual : 0} unidades disponibles
                </p>
              </div>

              {/* Stock después del ajuste */}
              {productoActual && cantidad && (
                <div className={`p-3 rounded-lg ${stockDespues < 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                  <p className={`text-sm ${stockDespues < 0 ? 'text-red-700' : 'text-green-700'}`}>
                    <strong>Stock después del ajuste:</strong> {stockDespues} unidades
                    {stockDespues < 0 && ' - No hay suficiente stock'}
                  </p>
                </div>
              )}

              {/* Motivo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo de la Merma *
                </label>
                <select
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Seleccionar motivo</option>
                  <option value="Merma Normal">Merma Normal</option>
                  <option value="Producto Dañado">Producto Dañado</option>
                  <option value="Pérdida">Pérdida</option>
                  <option value="No Cumple Calidad">No Cumple Calidad</option>
                  <option value="Vencimiento">Vencimiento</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Detalles adicionales sobre la merma..."
                />
              </div>

              {/* Información del proceso */}
              {esEmpleado && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-800 mb-2">Proceso de Aprobación</h3>
                  <p className="text-sm text-yellow-700">
                    Como empleado, tu solicitud de merma será enviada para aprobación del dueño. 
                    El stock no se actualizará hasta que sea aprobada.
                  </p>
                </div>
              )}

              {/* Botón Enviar */}
              <button
                type="submit"
                disabled={enviando || stockDespues < 0 || !productoSeleccionado || !cantidad || !motivo}
                className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg font-semibold transition duration-200 disabled:cursor-not-allowed"
              >
                {enviando ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-t-2 border-white border-solid rounded-full animate-spin mr-2"></div>
                    {esEmpleado ? 'Enviando Solicitud...' : 'Registrando Merma...'}
                  </div>
                ) : (
                  esEmpleado ? 'Solicitar Merma' : 'Registrar Merma'
                )}
              </button>
            </form>
          </div>

          {/* Información */}
          <div>
            {esEmpleado ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-yellow-800 mb-2">Restricciones del Empleado</h3>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Solo puedes solicitar mermas (descuentos)</li>
                  <li>• No puedes aumentar el stock</li>
                  <li>• Cada merma requiere aprobación del dueño</li>
                  <li>• El stock se actualiza solo después de la aprobación</li>
                  <li>• Todas las solicitudes quedan registradas</li>
                </ul>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-green-800 mb-2">Permisos de Dueño/Administrador</h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Puedes registrar mermas directamente</li>
                  <li>• El stock se actualiza inmediatamente</li>
                  <li>• Puedes aprobar/rechazar solicitudes de empleados</li>
                  <li>• Acceso completo al sistema</li>
                </ul>
              </div>
            )}

            {/* Ejemplo */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Ejemplo</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p><strong>Producto:</strong> Martillos</p>
                <p><strong>Stock actual:</strong> 150 unidades</p>
                <p><strong>Merma:</strong> 20 unidades</p>
                <p><strong>Resultado:</strong> 130 unidades en inventario</p>
                {esEmpleado && (
                  <p className="text-yellow-600 font-semibold">
                    (Aplicado después de aprobación)
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AjustesStock;
