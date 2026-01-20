import React, { useState, useEffect } from 'react';
import CierreDiario from './CierreDiario';
import ConsultaInventario from './ConsultaInventario';
import AjustesStock from './AjustesStock';
import ReportesBasicos from './ReportesBasicos';

const DashboardEmpleado = () => {
  const [seccionActiva, setSeccionActiva] = useState('inicio');
  const [metricasReales, setMetricasReales] = useState({
    totalProductos: 0,
    valorInventario: 0,
    stockBajo: 0,
    cierresHoy: 0
  });
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (seccionActiva === 'inicio') {
      cargarDatosReales();
    }
  }, [seccionActiva]);

  const cargarDatosReales = async () => {
    try {
      setCargando(true);
      
      const [inventarioRes, configRes, cierresRes] = await Promise.all([
        fetch('http://127.0.0.1:8000/inventario'),
        fetch('http://127.0.0.1:8000/configuraciones'),
        fetch('http://127.0.0.1:8000/auditoria?limit=50')
      ]);

      if (inventarioRes.ok && configRes.ok) {
        const inventario = await inventarioRes.json();
        const configs = await configRes.json();
        
        // Calcular métricas REALES
        const totalProductos = inventario.length;
        const valorInventario = inventario.reduce((sum, prod) => 
          sum + ((prod.precio_venta || 0) * (prod.stock_actual || 0)), 0
        );
        
        const limiteStockBajo = parseInt(configs.alerta_stock_bajo) || 50;
        const stockBajo = inventario.filter(prod => 
          (prod.stock_actual || 0) < limiteStockBajo
        ).length;

        // Contar cierres de hoy
        let cierresHoy = 0;
        if (cierresRes.ok) {
          const auditoria = await cierresRes.json();
          const hoy = new Date().toDateString();
          cierresHoy = auditoria.filter(item => 
            item.accion === 'CIERRE_DIARIO' && 
            new Date(item.fecha).toDateString() === hoy
          ).length;
        }

        setMetricasReales({
          totalProductos,
          valorInventario,
          stockBajo,
          cierresHoy
        });
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setCargando(false);
    }
  };

  const renderizarSeccion = () => {
    switch(seccionActiva) {
      case 'cierre-diario':
        return <CierreDiario />;
      case 'consulta-inventario':
        return <ConsultaInventario />;
      case 'ajustes-stock':
        return <AjustesStock />;
      case 'reportes':
        return <ReportesBasicos />;
      default:
        return (
          <div className="space-y-6">
            {/* Header del Dashboard */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h1 className="text-2xl font-bold text-gray-800">Dashboard Empleado</h1>
              <p className="text-gray-600">Bienvenido al sistema de gestión de Constrefri</p>
            </div>

            {/* Métricas Rápidas - DATOS REALES */}
            {cargando ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1,2,3,4].map(i => (
                  <div key={i} className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-3/4 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
                  <h3 className="text-sm font-medium text-gray-500">Total Productos</h3>
                  <p className="text-2xl font-bold text-gray-800">{metricasReales.totalProductos}</p>
                  <span className="text-xs text-gray-500">En inventario</span>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
                  <h3 className="text-sm font-medium text-gray-500">Valor Inventario</h3>
                  <p className="text-2xl font-bold text-gray-800">${metricasReales.valorInventario.toLocaleString()}</p>
                  <span className="text-xs text-gray-500">Stock valorizado</span>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-yellow-500">
                  <h3 className="text-sm font-medium text-gray-500">Stock Bajo</h3>
                  <p className="text-2xl font-bold text-gray-800">{metricasReales.stockBajo}</p>
                  <span className="text-xs text-red-500">Necesita atención</span>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
                  <h3 className="text-sm font-medium text-gray-500">Cierres Hoy</h3>
                  <p className="text-2xl font-bold text-gray-800">{metricasReales.cierresHoy}</p>
                  <span className="text-xs text-gray-500">Procesados hoy</span>
                </div>
              </div>
            )}

            {/* Resto del código permanece igual */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Acciones Rápidas</h3>
                <div className="space-y-3">
                  <button 
                    onClick={() => setSeccionActiva('cierre-diario')}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg font-medium transition duration-200 flex items-center justify-center"
                  >
                    Realizar Cierre Diario
                  </button>
                  <button 
                    onClick={() => setSeccionActiva('consulta-inventario')}
                    className="w-full bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg font-medium transition duration-200 flex items-center justify-center"
                  >
                    Consultar Inventario
                  </button>
                  <button 
                    onClick={() => setSeccionActiva('ajustes-stock')}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-3 px-4 rounded-lg font-medium transition duration-200 flex items-center justify-center"
                  >
                    Ajustar Stock (Mermas)
                  </button>
                  <button 
                    onClick={() => setSeccionActiva('reportes')}
                    className="w-full bg-purple-500 hover:bg-purple-600 text-white py-3 px-4 rounded-lg font-medium transition duration-200 flex items-center justify-center"
                  >
                    Ver Reportes Básicos
                  </button>
                </div>
              </div>

              {/* Productos con Stock Bajo - DATOS REALES */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Productos con Stock Bajo</h3>
                <div className="space-y-3">
                  {cargando ? (
                    [1,2,3].map(i => (
                      <div key={i} className="animate-pulse p-3 bg-gray-100 rounded-lg">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                      </div>
                    ))
                  ) : metricasReales.stockBajo > 0 ? (
                    // Aquí podrías cargar los productos reales con stock bajo
                    <div className="text-center py-4">
                      <p className="text-gray-600">{metricasReales.stockBajo} productos necesitan reposición</p>
                      <button 
                        onClick={() => setSeccionActiva('consulta-inventario')}
                        className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Ver en inventario →
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <div className="text-green-500 text-4xl mb-2">✅</div>
                      <p className="text-gray-600">No hay productos con stock bajo</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {seccionActiva !== 'inicio' && (
        <button 
          onClick={() => setSeccionActiva('inicio')}
          className="mb-4 flex items-center text-blue-600 hover:text-blue-800 transition duration-200"
        >
          ← Volver al Dashboard
        </button>
      )}
      {renderizarSeccion()}
    </div>
  );
};

export default DashboardEmpleado;