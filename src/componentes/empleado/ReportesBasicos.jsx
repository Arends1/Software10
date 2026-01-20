import React, { useState } from 'react';

const ReportesBasicos = () => {
  const [reporteActivo, setReporteActivo] = useState('ventas');
  const [rangoFecha, setRangoFecha] = useState('7dias');

  // Datos reales para empresa pequeña
  const datosVentas = [
    { fecha: '01/11', ventas: 920 },
    { fecha: '02/11', ventas: 780 },
    { fecha: '03/11', ventas: 850 },
    { fecha: '04/11', ventas: 950 },
    { fecha: '05/11', ventas: 820 },
    { fecha: '06/11', ventas: 880 },
    { fecha: '07/11', ventas: 850 }
  ];

  const productosMasVendidos = [
    { producto: 'Cemento 50kg', vendidos: 12, ingresos: 2400 },
    { producto: 'Varilla 1/2"', vendidos: 8, ingresos: 1200 },
    { producto: 'Tornillos 3"', vendidos: 45, ingresos: 450 },
    { producto: 'Ladrillo 6h', vendidos: 120, ingresos: 1800 },
    { producto: 'Pintura Blanca', vendidos: 6, ingresos: 420 }
  ];

  const stockCritico = [
    { producto: 'Cemento 50kg', stock: 3, minimo: 10, estado: 'Critico' },
    { producto: 'Pegamento PVC', stock: 2, minimo: 5, estado: 'Critico' },
    { producto: 'Brocha 4"', stock: 6, minimo: 10, estado: 'Bajo' }
  ];

  const calcularTotalVentas = () => {
    return datosVentas.reduce((total, dia) => total + dia.ventas, 0);
  };

  const renderizarReporte = () => {
    switch(reporteActivo) {
      case 'ventas':
        return (
          <div className="space-y-6">
            {/* Resumen de Ventas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 text-center border">
                <p className="text-2xl font-bold text-blue-600">${calcularTotalVentas()}</p>
                <p className="text-sm text-gray-600">Total Ventas</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center border">
                <p className="text-2xl font-bold text-green-600">{datosVentas.length}</p>
                <p className="text-sm text-gray-600">Días Analizados</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center border">
                <p className="text-2xl font-bold text-purple-600">${Math.round(calcularTotalVentas() / datosVentas.length)}</p>
                <p className="text-sm text-gray-600">Promedio Diario</p>
              </div>
            </div>

            {/* Gráfico Simple de Ventas */}
            <div className="bg-white rounded-lg p-6 border">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Ventas de los Últimos 7 Días</h3>
              <div className="space-y-2">
                {datosVentas.map((dia, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <span className="w-16 text-sm text-gray-600">{dia.fecha}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-6">
                      <div 
                        className="bg-blue-500 h-6 rounded-full transition-all duration-500"
                        style={{ width: `${(dia.ventas / 1000) * 100}%` }}
                      ></div>
                    </div>
                    <span className="w-20 text-sm font-medium text-gray-800">${dia.ventas}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Productos Más Vendidos */}
            <div className="bg-white rounded-lg p-6 border">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Productos Más Vendidos</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unidades</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {productosMasVendidos.map((producto, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">{producto.producto}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{producto.vendidos}</td>
                        <td className="px-4 py-2 text-sm font-semibold text-green-600">${producto.ingresos}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'stock':
        return (
          <div className="space-y-6">
            {/* Alertas de Stock */}
            <div className="bg-white rounded-lg p-6 border">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Productos con Stock Critico</h3>
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
                      Stock actual: <strong>{producto.stock}</strong> | Minimo requerido: <strong>{producto.minimo}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resumen Stock */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 text-center border">
                <p className="text-2xl font-bold text-red-600">
                  {stockCritico.filter(p => p.estado === 'Critico').length}
                </p>
                <p className="text-sm text-gray-600">Productos Criticos</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center border">
                <p className="text-2xl font-bold text-yellow-600">
                  {stockCritico.filter(p => p.estado === 'Bajo').length}
                </p>
                <p className="text-sm text-gray-600">Productos con Stock Bajo</p>
              </div>
            </div>
          </div>
        );

      case 'movimientos':
        return (
          <div className="bg-white rounded-lg p-6 border">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Últimos Cierres Procesados</h3>
            <div className="space-y-4">
              {[
                { fecha: '07/11/2023', ventas: 850, productos: 15, estado: 'Completado' },
                { fecha: '06/11/2023', ventas: 880, productos: 16, estado: 'Completado' },
                { fecha: '05/11/2023', ventas: 820, productos: 14, estado: 'Completado' },
                { fecha: '04/11/2023', ventas: 950, productos: 18, estado: 'Completado' }
              ].map((cierre, index) => (
                <div key={index} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">{cierre.fecha}</p>
                    <p className="text-sm text-gray-600">{cierre.productos} productos procesados</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">${cierre.ventas}</p>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {cierre.estado}
                    </span>
                  </div>
                </div>
              ))}
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
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Reportes Basicos</h2>
        <p className="text-gray-600 mb-6">Informes y análisis del sistema</p>

        {/* Navegación de Reportes */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
          {[
            { id: 'ventas', nombre: 'Ventas' },
            { id: 'stock', nombre: 'Stock' },
            { id: 'movimientos', nombre: 'Movimientos' }
          ].map((reporte) => (
            <button
              key={reporte.id}
              onClick={() => setReporteActivo(reporte.id)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition duration-200 ${
                reporteActivo === reporte.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {reporte.nombre}
            </button>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex space-x-4 mb-6">
          <select
            value={rangoFecha}
            onChange={(e) => setRangoFecha(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7dias">Últimos 7 días</option>
            <option value="30dias">Últimos 30 días</option>
            <option value="mes">Este mes</option>
          </select>
        </div>

        {/* Contenido del Reporte */}
        {renderizarReporte()}

        {/* Botones de Exportación */}
        <div className="mt-6 flex space-x-4">
          <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition duration-200">
            Exportar a PDF
          </button>
          <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition duration-200">
            Exportar a Excel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportesBasicos;