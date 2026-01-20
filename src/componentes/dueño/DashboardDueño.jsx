import React, { useState, useEffect } from 'react';
import GestionUsuarios from '../administrador/GestionUsuarios';
import ConfiguracionSistema from '../administrador/ConfiguracionSistema';
import AuditoriaCompleta from '../administrador/AuditoriaCompleta';
import ReportesAvanzados from '../administrador/ReportesAvanzados';
import CierreDiario from '../empleado/CierreDiario';
import ConsultaInventario from '../empleado/ConsultaInventario';
import AjustesStock from '../empleado/AjustesStock';
import RevertirProcesos from './RevertirProcesos';

const DashboardDueño = () => {
  const [seccionActiva, setSeccionActiva] = useState('inicio');
  const [mermasPendientes, setMermasPendientes] = useState([]);
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
      cargarMermasPendientes();
    }
  }, [seccionActiva]);

  const cargarDatosReales = async () => {
    try {
      setCargando(true);
      
      const [inventarioRes, usuariosRes, configRes] = await Promise.all([
        fetch('https://constrefri-backend.onrender.com/inventario'),
        fetch('https://constrefri-backend.onrender.com/usuarios'),
        fetch('https://constrefri-backend.onrender.com/configuraciones')
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

  const cargarMermasPendientes = async () => {
    try {
      const response = await fetch('https://constrefri-backend.onrender.com/mermas/pendientes');
      if (response.ok) {
        const data = await response.json();
        setMermasPendientes(data);
      }
    } catch (error) {
      console.error('Error cargando mermas pendientes:', error);
    }
  };

  const aprobarMerma = async (mermaId) => {
    if (!window.confirm('¿Estás seguro de que quieres aprobar esta merma? Esta acción actualizará el stock inmediatamente.')) {
      return;
    }

    try {
      const usuarioData = JSON.parse(localStorage.getItem('userData') || '{}');
      
      const response = await fetch(`https://constrefri-backend.onrender.com/mermas/aprobar?merma_id=${mermaId}&usuario_id=${usuarioData.id}`, {
        method: 'POST',
      });

      if (response.ok) {
        const resultado = await response.json();
        alert(`✅ ${resultado.mensaje}`);
        cargarMermasPendientes();
        cargarDatosReales(); // Recargar métricas
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
      
      const response = await fetch(`https://constrefri-backend.onrender.com/mermas/rechazar?merma_id=${mermaId}&usuario_id=${usuarioData.id}&motivo_rechazo=${encodeURIComponent(motivo)}`, {
        method: 'POST',
      });

      if (response.ok) {
        const resultado = await response.json();
        alert(`✅ ${resultado.mensaje}`);
        cargarMermasPendientes();
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error de conexión al rechazar merma');
    }
  };

  const renderizarSeccion = () => {
    switch(seccionActiva) {
      case 'gestion-usuarios':
        return <GestionUsuarios />;
      case 'configuracion-sistema':
        return <ConfiguracionSistema />;
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
      case 'revertir-procesos':
        return <RevertirProcesos />;
      default:
        return (
          <div className="space-y-6">
            {/* Header del Dashboard */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h1 className="text-2xl font-bold text-gray-800">Dashboard Ejecutivo - Dueño</h1>
              <p className="text-gray-600">Vision completa y control total de Constrefri</p>
            </div>

            {/* ALERTA DE MERMAS PENDIENTES - Se mantiene igual */}
            {mermasPendientes.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-orange-800">
                    ⚠️ Mermas Pendientes de Aprobación: {mermasPendientes.length}
                  </h3>
                  <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                    {mermasPendientes.length}
                  </span>
                </div>
                
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {mermasPendientes.map((merma) => (
                    <div key={merma.id} className="bg-white rounded-lg p-4 border border-orange-100">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800">{merma.producto_nombre}</h4>
                          <p className="text-sm text-gray-600">Código: {merma.producto_codigo}</p>
                          <p className="text-sm text-gray-600">Solicitado por: {merma.usuario_solicitud_nombre}</p>
                          <p className="text-sm text-gray-600">Motivo: {merma.motivo}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-red-600">-{merma.cantidad}</p>
                          <p className="text-sm text-gray-500">Stock: {merma.producto_stock}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => aprobarMerma(merma.id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-semibold flex-1"
                        >
                          ✅ Aprobar
                        </button>
                        <button
                          onClick={() => rechazarMerma(merma.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-semibold flex-1"
                        >
                          ❌ Rechazar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <p className="text-sm text-orange-700 mt-3">
                  Tienes {mermasPendientes.length} solicitudes de mermas esperando tu aprobación.
                </p>
              </div>
            )}

            {/* Metricas Ejecutivas - DATOS REALES */}
            {cargando ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-3/4 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  <h3 className="text-sm font-medium text-gray-500">Usuarios Activos</h3>
                  <p className="text-2xl font-bold text-gray-800">{metricasReales.totalUsuarios}</p>
                  <span className="text-xs text-gray-500">En sistema</span>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-500">
                  <h3 className="text-sm font-medium text-gray-500">Mermas Pendientes</h3>
                  <p className="text-2xl font-bold text-gray-800">{mermasPendientes.length}</p>
                  <span className="text-xs text-orange-500">Por aprobar</span>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-indigo-500">
                  <h3 className="text-sm font-medium text-gray-500">Estado Sistema</h3>
                  <p className="text-2xl font-bold text-gray-800">100%</p>
                  <span className="text-xs text-green-500">Operativo</span>
                </div>
              </div>
            )}

            {/* El resto del código permanece igual */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Control del Sistema */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Control del Sistema</h3>
                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={() => setSeccionActiva('configuracion-sistema')}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg font-medium transition duration-200"
                  >
                    Configurar Sistema
                  </button>
                  <button 
                    onClick={() => setSeccionActiva('gestion-usuarios')}
                    className="w-full bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg font-medium transition duration-200"
                  >
                    Gestionar Usuarios
                  </button>
                  <button 
                    onClick={() => setSeccionActiva('auditoria')}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-3 px-4 rounded-lg font-medium transition duration-200"
                  >
                    Auditoria Completa
                  </button>
                  <button 
                    onClick={() => setSeccionActiva('revertir-procesos')}
                    className="w-full bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-lg font-medium transition duration-200"
                  >
                    Revertir Procesos
                  </button>
                </div>
              </div>

              {/* Operaciones y Analisis */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Operaciones y Analisis</h3>
                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={() => setSeccionActiva('reportes-avanzados')}
                    className="w-full bg-purple-500 hover:bg-purple-600 text-white py-3 px-4 rounded-lg font-medium transition duration-200"
                  >
                    Reportes Ejecutivos
                  </button>
                  <button 
                    onClick={() => setSeccionActiva('cierre-diario')}
                    className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium transition duration-200"
                  >
                    Realizar Cierre Diario
                  </button>
                  <button 
                    onClick={() => setSeccionActiva('consulta-inventario')}
                    className="w-full bg-teal-500 hover:bg-teal-600 text-white py-3 px-4 rounded-lg font-medium transition duration-200"
                  >
                    Consultar Inventario
                  </button>
                  <button 
                    onClick={() => setSeccionActiva('ajustes-stock')}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 px-4 rounded-lg font-medium transition duration-200"
                  >
                    Ajustes de Stock
                  </button>
                </div>
              </div>
            </div>

            {/* Alertas Ejecutivas - Actualizadas con datos reales */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Estado del Negocio</h3>
              <div className="space-y-3">
                {metricasReales.valorInventario > 100000 && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-800">Inventario Saludable</span>
                      <span className="text-green-600 font-bold">✅ Excelente</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Valor de inventario: ${metricasReales.valorInventario.toLocaleString()}</p>
                  </div>
                )}
                
                {metricasReales.stockBajo > 0 && (
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-800">Atención Requerida</span>
                      <span className="text-yellow-600 font-bold">{metricasReales.stockBajo} productos</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Productos con stock bajo necesitan reposición</p>
                  </div>
                )}
                
                {mermasPendientes.length > 0 && (
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-800">Mermas Pendientes</span>
                      <span className="text-orange-600 font-bold">{mermasPendientes.length} solicitudes</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Revisar y aprobar solicitudes de mermas</p>
                  </div>
                )}
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
          ← Volver al Dashboard Ejecutivo
        </button>
      )}
      {renderizarSeccion()}
    </div>
  );
};

export default DashboardDueño;
