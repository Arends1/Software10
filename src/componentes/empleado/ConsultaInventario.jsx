import React, { useState, useEffect } from 'react';

const ConsultaInventario = () => {
  const [inventario, setInventario] = useState([]);
  const [configuraciones, setConfiguraciones] = useState({});
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [usuario, setUsuario] = useState(null);
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cantidadEliminar, setCantidadEliminar] = useState(1);
  
  // Nuevos estados para filtros
  const [filtroStock, setFiltroStock] = useState('todos');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');

  useEffect(() => {
    cargarDatos();
    const usuarioData = JSON.parse(localStorage.getItem('userData') || '{}');
    if (usuarioData) {
      setUsuario(usuarioData);
    }
  }, []);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      
      // Cargar inventario y configuraciones en paralelo
      const [inventarioResponse, configResponse] = await Promise.all([
        fetch('https://constrefri-backend.onrender.com/inventario'),
        fetch('https://constrefri-backend.onrender.com/configuraciones')
      ]);

      if (inventarioResponse.ok) {
        const inventarioData = await inventarioResponse.json();
        setInventario(inventarioData);
      }

      if (configResponse.ok) {
        const configData = await configResponse.json();
        setConfiguraciones(configData);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setCargando(false);
    }
  };

  // Obtener límites de stock desde configuraciones
  const getLimitesStock = () => {
    return {
      stockBajo: parseInt(configuraciones.alerta_stock_bajo) || 50,
      stockCritico: parseInt(configuraciones.alerta_stock_critico) || 10
    };
  };

  const { stockBajo, stockCritico } = getLimitesStock();

  const abrirModalEliminar = (producto) => {
    setProductoSeleccionado(producto);
    setCantidadEliminar(1);
    setMostrarModalEliminar(true);
  };

  const cerrarModalEliminar = () => {
    setMostrarModalEliminar(false);
    setProductoSeleccionado(null);
    setCantidadEliminar(1);
  };

  const eliminarProducto = async () => {
    if (!usuario || !productoSeleccionado) {
      alert('No se pudo verificar el usuario o el producto');
      return;
    }

    if (usuario.rol !== 'dueño') {
      alert('❌ Solo el dueño puede eliminar productos');
      return;
    }

    if (cantidadEliminar < 1) {
      alert('❌ La cantidad debe ser al menos 1');
      return;
    }

    if (cantidadEliminar > productoSeleccionado.stock_actual) {
      alert(`❌ No puedes eliminar más de ${productoSeleccionado.stock_actual} unidades`);
      return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:8000/productos/${productoSeleccionado.id}?usuario_id=${usuario.id}&cantidad=${cantidadEliminar}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const resultado = await response.json();
        alert(`✅ ${resultado.mensaje}`);
        cargarDatos();
        cerrarModalEliminar();
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error de conexión');
    }
  };

  const eliminarTodoElProducto = async (productoId, productoNombre) => {
    if (!usuario) {
      alert('No se pudo verificar el usuario');
      return;
    }

    if (usuario.rol !== 'dueño') {
      alert('❌ Solo el dueño puede eliminar productos');
      return;
    }

    if (!window.confirm(`¿Estás seguro de eliminar completamente "${productoNombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:8000/productos/${productoId}?usuario_id=${usuario.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const resultado = await response.json();
        alert(`✅ ${resultado.mensaje}`);
        cargarDatos();
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error de conexión');
    }
  };

  // Obtener categorías únicas para el filtro
  const categorias = ['todas', ...new Set(inventario.map(producto => producto.categoria).filter(Boolean))];

  // Aplicar todos los filtros
  const inventarioFiltrado = inventario.filter(producto => {
    // Filtro de búsqueda general
    const coincideBusqueda = 
      producto.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
      producto.codigo.toLowerCase().includes(filtro.toLowerCase()) ||
      producto.categoria.toLowerCase().includes(filtro.toLowerCase());

    // Filtro por stock (USANDO CONFIGURACIONES DINÁMICAS)
    let coincideStock = true;
    switch (filtroStock) {
      case 'bajo':
        coincideStock = (producto.stock_actual || 0) < stockBajo;
        break;
      case 'medio':
        coincideStock = (producto.stock_actual || 0) >= stockBajo && (producto.stock_actual || 0) < 100;
        break;
      case 'alto':
        coincideStock = (producto.stock_actual || 0) >= 100;
        break;
      case 'critico':
        coincideStock = (producto.stock_actual || 0) <= stockCritico;
        break;
      default:
        coincideStock = true;
    }

    // Filtro por categoría
    const coincideCategoria = filtroCategoria === 'todas' || producto.categoria === filtroCategoria;

    return coincideBusqueda && coincideStock && coincideCategoria;
  });

  // Limpiar filtros
  const limpiarFiltros = () => {
    setFiltro('');
    setFiltroStock('todos');
    setFiltroCategoria('todas');
  };

  // Determinar color del stock (USANDO CONFIGURACIONES DINÁMICAS)
  const getColorStock = (producto) => {
    if ((producto.stock_actual || 0) <= stockCritico) {
      return 'bg-red-100 text-red-800 border border-red-200';
    } else if ((producto.stock_actual || 0) < stockBajo) {
      return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    } else {
      return 'bg-green-100 text-green-800 border border-green-200';
    }
  };

  const esDueño = usuario && usuario.rol === 'dueño';

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Consulta de Inventario</h1>
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
            onClick={cargarDatos}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold"
          >
            Actualizar
          </button>
        </div>
      </div>

      {/* Información de límites actuales */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="text-sm text-blue-800">
          <strong>Límites actuales:</strong> Stock Bajo: &lt;{stockBajo} unidades | Stock Crítico: ≤{stockCritico} unidades
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-6 space-y-4">
        {/* Filtro de búsqueda general */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2">
            <input
              type="text"
              placeholder="Buscar por código, nombre o categoría..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Filtro por stock (USANDO CONFIGURACIONES DINÁMICAS) */}
          <div>
            <select
              value={filtroStock}
              onChange={(e) => setFiltroStock(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="todos">Todos los stocks</option>
              <option value="critico">Stock Crítico (≤{stockCritico})</option>
              <option value="bajo">Stock Bajo (&lt;{stockBajo})</option>
              <option value="medio">Stock Medio ({stockBajo}-100)</option>
              <option value="alto">Stock Alto (&gt;100)</option>
            </select>
          </div>

          {/* Filtro por categoría */}
          <div>
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="todas">Todas las categorías</option>
              {categorias.filter(cat => cat !== 'todas').map((categoria, index) => (
                <option key={index} value={categoria}>
                  {categoria}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Botón limpiar filtros */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Mostrando {inventarioFiltrado.length} de {inventario.length} productos
            {(filtro || filtroStock !== 'todos' || filtroCategoria !== 'todas') && (
              <span className="ml-2 text-blue-600">
                (filtros aplicados)
              </span>
            )}
          </div>
          
          {(filtro || filtroStock !== 'todos' || filtroCategoria !== 'todas') && (
            <button
              onClick={limpiarFiltros}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"
            >
              Limpiar Filtros
            </button>
          )}
        </div>
      </div>

      {cargando ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">Cargando inventario...</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {inventarioFiltrado.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {inventario.length === 0 
                ? "No hay productos en el inventario." 
                : "No se encontraron productos con los filtros aplicados."}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Código</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Producto</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Categoría</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Precio Compra</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Precio Venta</th>
                  {esDueño && (
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {inventarioFiltrado.map((producto) => (
                  <tr key={producto.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{producto.codigo}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{producto.nombre}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {producto.categoria}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getColorStock(producto)}`}>
                        {producto.stock_actual} unidades
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        ${producto.precio_compra?.toLocaleString() || '0'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-green-600">
                        ${producto.precio_venta?.toLocaleString() || '0'}
                      </div>
                    </td>
                    {esDueño && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => abrirModalEliminar(producto)}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm font-semibold"
                          >
                            Reducir Stock
                          </button>
                          <button
                            onClick={() => eliminarTodoElProducto(producto.id, producto.nombre)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-semibold"
                          >
                            Eliminar Todo
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {mostrarModalEliminar && productoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Reducir Stock</h2>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Producto: <strong>{productoSeleccionado.nombre}</strong></p>
              <p className="text-sm text-gray-600">Stock actual: <strong>{productoSeleccionado.stock_actual} unidades</strong></p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cantidad a eliminar:
              </label>
              <input
                type="number"
                min="1"
                max={productoSeleccionado.stock_actual}
                value={cantidadEliminar}
                onChange={(e) => setCantidadEliminar(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                Máximo: {productoSeleccionado.stock_actual} unidades
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={eliminarProducto}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-semibold"
              >
                Eliminar {cantidadEliminar} unidad{cantidadEliminar !== 1 ? 'es' : ''}
              </button>
              <button
                onClick={cerrarModalEliminar}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg font-semibold"
              >
                Cancelar
              </button>
            </div>

            {cantidadEliminar === productoSeleccionado.stock_actual && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-700">
                  <strong>Nota:</strong> Estás eliminando todo el stock. El producto se eliminará completamente.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {!cargando && inventario.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="text-sm text-gray-600">Total Productos</div>
            <div className="text-2xl font-bold text-gray-800">{inventario.length}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="text-sm text-gray-600">Stock Total</div>
            <div className="text-2xl font-bold text-blue-600">
              {inventario.reduce((sum, prod) => sum + (prod.stock_actual || 0), 0)} unidades
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="text-sm text-gray-600">Categorías</div>
            <div className="text-2xl font-bold text-purple-600">
              {new Set(inventario.map(prod => prod.categoria)).size}
            </div>
          </div>
        </div>
      )}

      {usuario && !esDueño && (
        <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-700">
            Como <strong>{usuario.rol}</strong>, solo puedes consultar el inventario.
          </p>
        </div>
      )}
    </div>
  );
};

export default ConsultaInventario;
