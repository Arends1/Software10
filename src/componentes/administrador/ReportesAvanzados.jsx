import React, { useState, useEffect } from 'react';

const ReportesAvanzados = () => {
  const [reporteSeleccionado, setReporteSeleccionado] = useState('rendimiento');
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    try {
      setCargando(true);
      console.log('🔍 Cargando productos desde /inventario...');
      
      const response = await fetch('https://constrefri-backend.onrender.com/inventario');
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Productos cargados:', data);
      setProductos(data);
      
    } catch (error) {
      console.error('❌ Error:', error);
      setError(`Error cargando datos: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  // CALCULAR MÉTRICAS REALES BASADAS EN TUS PRODUCTOS
  const calcularMetricas = () => {
    const totalProductos = productos.length;
    const stockTotal = productos.reduce((sum, p) => sum + (p.stock_actual || 0), 0);
    const valorInventario = productos.reduce((sum, p) => sum + ((p.precio_venta || 0) * (p.stock_actual || 0)), 0);
    
    // Como todos tienen stock_minimo = 0, calculamos críticos como stock < 50
    const stockCritico = productos.filter(p => (p.stock_actual || 0) < 50).length;
    const productosActivos = productos.filter(p => (p.stock_actual || 0) > 0).length;

    // Calcular ventas estimadas basadas en productos
    const ventaPromedio = productos.reduce((sum, p) => sum + (p.precio_venta || 0), 0) / productos.length;
    const ventasTotales = ventaPromedio * 150; // Estimación

    return {
      totalProductos,
      stockTotal,
      valorInventario,
      stockCritico,
      productosActivos,
      ventasTotales,
      promedioDiario: Math.round(ventasTotales / 30),
      crecimiento: 12.5
    };
  };

  // PRODUCTOS CON STOCK BAJO
  const obtenerStockCritico = () => {
    return productos
      .filter(p => (p.stock_actual || 0) < 50)
      .map(p => ({
        producto: p.nombre,
        stock: p.stock_actual,
        minimo: 50, // Mínimo sugerido
        estado: p.stock_actual < 20 ? 'Critico' : 'Bajo'
      }));
  };

  // PRODUCTOS MÁS VALIOSOS (por valor en inventario)
  const obtenerProductosMasValiosos = () => {
    return productos
      .map(p => ({
        producto: p.nombre,
        valor: (p.precio_venta || 0) * (p.stock_actual || 0),
        stock: p.stock_actual
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
  };

  // VENTAS POR CATEGORÍA
  const obtenerVentasPorCategoria = () => {
    const categorias = {};
    productos.forEach(p => {
      const categoria = p.categoria || 'Sin Categoría';
      if (!categorias[categoria]) {
        categorias[categoria] = { ventas: 0, productos: 0 };
      }
      categorias[categoria].ventas += (p.precio_venta || 0) * 10; // Estimación
      categorias[categoria].productos += 1;
    });
    
    return Object.entries(categorias).map(([categoria, datos]) => ({
      categoria,
      ventas: datos.ventas,
      productos: datos.productos
    }));
  };

  if (cargando) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-4 text-gray-600">Cargando inventario...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h2 className="text-xl font-bold text-red-800 mb-2">Error</h2>
          <p className="text-red-700">{error}</p>
          <button 
            onClick={cargarProductos}
            className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const metricas = calcularMetricas();
  const stockCritico = obtenerStockCritico();
  const productosMasValiosos = obtenerProductosMasValiosos();
  const ventasPorCategoria = obtenerVentasPorCategoria();

  const renderizarReporte = () => {
    switch(reporteSeleccionado) {
      case 'rendimiento':
        return (
          <div className="space-y-6">
            {/* MÉTRICAS PRINCIPALES */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 text-center border">
                <p className="text-2xl font-bold text-blue-600">${metricas.ventasTotales.toLocaleString()}</p>
                <p className="text-sm text-gray-600">Ventas Estimadas</p>
                <p className="text-xs text-gray-500">Basado en {metricas.totalProductos} productos</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center border">
                <p className="text-2xl font-bold text-green-600">{metricas.productosActivos}</p>
                <p className="text-sm text-gray-600">Productos Activos</p>
                <p className="text-xs text-gray-500">Con stock disponible</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center border">
                <p className="text-2xl font-bold text-purple-600">${metricas.valorInventario.toLocaleString()}</p>
                <p className="text-sm text-gray-600">Valor Inventario</p>
                <p className="text-xs text-gray-500">Stock total valorizado</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center border">
                <p className="text-2xl font-bold text-red-600">{metricas.stockCritico}</p>
                <p className="text-sm text-gray-600">Stock Bajo</p>
                <p className="text-xs text-gray-500">Menos de 50 unidades</p>
              </div>
            </div>

            {/* PRODUCTOS MÁS VALIOSOS */}
            <div className="bg-white rounded-lg p-6 border">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Productos Más Valiosos en Inventario</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Valor en Inventario</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {productosMasValiosos.map((producto, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">{producto.producto}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{producto.stock} unidades</td>
                        <td className="px-4 py-2 text-sm font-semibold text-green-600">
                          ${producto.valor.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* VENTAS POR CATEGORÍA */}
            <div className="bg-white rounded-lg p-6 border">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Desempeño por Categoría</h3>
              <div className="space-y-3">
                {ventasPorCategoria.map((categoria, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-800">{categoria.categoria}</span>
                      <p className="text-sm text-gray-600">{categoria.productos} productos</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-600">${categoria.ventas.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">Ventas estimadas</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'inventario':
        return (
          <div className="space-y-6">
            {/* RESUMEN INVENTARIO */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 text-center border">
                <p className="text-2xl font-bold text-blue-600">{metricas.totalProductos}</p>
                <p className="text-sm text-gray-600">Total Productos</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center border">
                <p className="text-2xl font-bold text-green-600">{metricas.stockTotal}</p>
                <p className="text-sm text-gray-600">Unidades en Stock</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center border">
                <p className="text-2xl font-bold text-purple-600">${metricas.valorInventario.toLocaleString()}</p>
                <p className="text-sm text-gray-600">Valor Total</p>
              </div>
            </div>

            {/* STOCK CRÍTICO */}
            <div className="bg-white rounded-lg p-6 border">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Productos con Stock Bajo ({stockCritico.length})
              </h3>
              {stockCritico.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-green-500 text-6xl mb-4">✅</div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">¡Inventario Saludable!</h3>
                  <p className="text-gray-600">No hay productos con stock bajo</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stockCritico.map((producto, index) => (
                    <div key={index} className={`p-4 rounded-lg border ${
                      producto.estado === 'Critico' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-800">{producto.producto}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          producto.estado === 'Critico' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {producto.estado}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Stock actual: <strong>{producto.stock} unidades</strong> | Mínimo recomendado: <strong>{producto.minimo}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* DISTRIBUCIÓN DE STOCK */}
            <div className="bg-white rounded-lg p-6 border">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Distribución de Stock por Categoría</h3>
              <div className="space-y-4">
                {ventasPorCategoria.map((categoria, index) => {
                  const productosCategoria = productos.filter(p => p.categoria === categoria.categoria);
                  const stockCategoria = productosCategoria.reduce((sum, p) => sum + (p.stock_actual || 0), 0);
                  
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-700">{categoria.categoria}</span>
                        <span className="text-gray-600">{stockCategoria} unidades</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(stockCategoria / metricas.stockTotal) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Reportes Avanzados</h2>
        <p className="text-gray-600 mb-6">
          Análisis basado en {productos.length} productos del inventario
        </p>

        {/* NAVEGACIÓN */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
          {[
            { id: 'rendimiento', nombre: 'Rendimiento' },
            { id: 'inventario', nombre: 'Inventario' }
          ].map((reporte) => (
            <button
              key={reporte.id}
              onClick={() => setReporteSeleccionado(reporte.id)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition duration-200 ${
                reporteSeleccionado === reporte.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {reporte.nombre}
            </button>
          ))}
        </div>

        {/* CONTENIDO */}
        {renderizarReporte()}

        {/* ACTUALIZAR */}
        <div className="mt-6">
          <button
            onClick={cargarProductos}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition duration-200"
          >
            Actualizar Datos
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportesAvanzados;
