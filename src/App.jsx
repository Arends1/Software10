// src/App.jsx
import React, { useState } from 'react';
import Splash from './paginas/Splash';
import Login from './paginas/Login';
import Dashboard from './paginas/Dashboard';

const App = () => {
  const [usuario, setUsuario] = useState(null);
  const [showSplash, setShowSplash] = useState(true);

  const manejarLogin = (datosUsuario) => {
    setUsuario(datosUsuario);
  };

  const manejarCerrarSesion = () => {
    setUsuario(null);
  };

  const manejarFinSplash = () => {
    setShowSplash(false);
  };

  return (
    <div className="App">
      {showSplash ? (
        <Splash onFinish={manejarFinSplash} />
      ) : !usuario ? (
        <Login onLogin={manejarLogin} />
      ) : (
        <Dashboard 
          usuario={usuario} 
          onCerrarSesion={manejarCerrarSesion} 
        />
      )}
    </div>
  );
};

export default App;