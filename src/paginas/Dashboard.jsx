import React, { useState } from 'react';
import Encabezado from '../componentes/comunes/Encabezado';
import DashboardEmpleado from '../componentes/empleado/DashboardEmpleado';
import DashboardAdministrador from '../componentes/administrador/DashboardAdministrador';
import DashboardDueño from '../componentes/dueño/DashboardDueño';

const Dashboard = ({ usuario, onCerrarSesion }) => {
  const renderizarContenido = () => {
    switch(usuario.rol) {
      case 'empleado':
        return <DashboardEmpleado />;
      case 'administrador':
        return <DashboardAdministrador />;
      case 'dueño':
        return <DashboardDueño />;
      default:
        return <DashboardEmpleado />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Encabezado 
        usuario={usuario} 
        onCerrarSesion={onCerrarSesion} 
      />
      
      <main className="p-6">
        {renderizarContenido()}
      </main>
    </div>
  );
};

export default Dashboard;