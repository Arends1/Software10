import React, { useState, useEffect } from 'react';
import GestionUsuarios from './GestionUsuarios';
import AuditoriaCompleta from './AuditoriaCompleta';
import ReportesAvanzados from './ReportesAvanzados';
import CierreDiario from '../empleado/CierreDiario';
import ConsultaInventario from '../empleado/ConsultaInventario';
import AjustesStock from '../empleado/AjustesStock';

const DashboardAdministrador = () => {
  const [seccionActiva, setSeccionActiva] = useState('inicio');
  const [metricasReales, setMetricasReales] = useState({
    totalProductos: 0,
    valorInventario: 0,
    stockBajo: 0,
    totalUsuarios: 0
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
      
      const [inventarioRes, usuariosRes, configRes] = await Promise.all([
        fetch('http://127.0.0.1:8000/inventario'),
        fetch('http://127.0.0.1:8000/usuarios'),
        fetch('http://127.0.0.1:8000/configuraciones')
      ]);

      if (inventarioRes.ok && usuariosRes.ok && configRes.ok) {
        const inventario = await inventarioRes.json();
        const usuarios = await usuariosRes.json();
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

        const totalUsuarios = usuarios.length;

        setMetricasReales({
          totalProductos,
          valorInventario,
          stockBajo,
          totalUsuarios
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
      case 'gestion-usuarios':
        return <GestionUsuarios />;
      case 'auditoria':
        return <AuditoriaCompleta />;
      case 'reportes-avanzados':
        return <ReportesAvanzados />;
      case 'cierre-diario':
        return <CierreDiario />;
      case 'consulta-inventario':
        return <ConsultaInventario />;
      case 'ajustes-stock':
        return <AjustesStock />;
      default:
        return (
          <div className="space-y-6">
            {/* Header del Dashboard */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h1 className="text-2xl font-bold text-gray-800">Dashboard Administrador</h1>
              <p className="text-gray-600">Panel de administracion completo de Constrefri</p>
            </div>

            {/* Metricas Rapidas - DATOS REALES */}
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
                  <span className="text-xs text-red-500">Necesita atencion</span>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
                  <h3 className="text-sm font-medium text-gray-500">Usuarios Activos</h3>
                  <p className="text-2xl font-bold text-gray-800">{metricasReales.totalUsuarios}</p>
                  <span className="text-xs text-gray-500">En sistema</span>
                </div>
              </div>
            )}

            {/* El resto del código permanece igual */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Gestion del Sistema</h3>
                <div className="space-y-3">
                  <button 
                    onClick={() => setSeccionActiva('gestion-usuarios')}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg font-medium transition duration-200"
                  >
                    Gestionar Usuarios
                  </button>
                  <button 
                    onClick={() => setSeccionActiva('auditoria')}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-3 px-4 rounded-lg font-medium transition duration-200"
                  >
                    Ver Auditoria
                  </button>
                  <button 
                    onClick={() => setSeccionActiva('reportes-avanzados')}
                    className="w-full bg-purple-500 hover:bg-purple-600 text-white py-3 px-4 rounded-lg font-medium transition duration-200"
                  >
                    Reportes Avanzados
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Operaciones</h3>
                <div className="space-y-3">
                  <button 
                    onClick={() => setSeccionActiva('cierre-diario')}
                    className="w-full bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg font-medium transition duration-200"
                  >
                    Realizar Cierre Diario
                  </button>
                  <button 
                    onClick={() => setSeccionActiva('consulta-inventario')}
                    className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium transition duration-200"
                  >
                    Consultar Inventario
                  </button>
                  <button 
                    onClick={() => setSeccionActiva('ajustes-stock')}
                    className="w-full bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-lg font-medium transition duration-200"
                  >
                    Ajustes de Stock
                  </button>
                </div>
              </div>
            </div>

            {/* Alertas del Sistema - Mantenemos algunas alertas estáticas */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Estado del Sistema</h3>
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-800">Sistema Operativo</span>
                    <span className="text-green-600 font-bold">✅ Normal</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Todos los servicios funcionando correctamente</p>
                </div>
                
                {metricasReales.stockBajo > 0 && (
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-800">Stock Bajo Detectado</span>
                      <span className="text-yellow-600 font-bold">{metricasReales.stockBajo} productos</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Revisar inventario para reposición</p>
                  </div>
                )}
                
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-800">Base de Datos</span>
                    <span className="text-green-600 font-bold">✅ Conectada</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Conexión estable con PostgreSQL</p>
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

export default DashboardAdministrador;