import React, { useEffect, useState } from 'react';
import logo from '../assets/logo.png'; // Importación CORRECTA

const Splash = ({ onFinish }) => {
  const [visible, setVisible] = useState(true);
  const [textVisible, setTextVisible] = useState(false);

  useEffect(() => {
    const textTimer = setTimeout(() => {
      setTextVisible(true);
    }, 500);

    const hideTimer = setTimeout(() => {
      setVisible(false);
    }, 4000);

    const finishTimer = setTimeout(() => {
      onFinish();
    }, 4500);

    return () => {
      clearTimeout(textTimer);
      clearTimeout(hideTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  if (!visible) return null;

  return (
    <div className={`
      fixed inset-0 flex items-center justify-center 
      bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900
      transition-all duration-500 ease-in-out
      ${visible ? 'opacity-100' : 'opacity-0'}
      z-50
    `}>
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-500 rounded-full mix-blend-screen filter blur-xl opacity-30 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-purple-500 rounded-full mix-blend-screen filter blur-xl opacity-30 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-28 h-28 bg-indigo-500 rounded-full mix-blend-screen filter blur-xl opacity-40 animate-pulse animation-delay-1000"></div>
      </div>

      <div className={`
        text-center transform transition-all duration-1000 ease-out
        ${textVisible ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}
      `}>
        <div className="w-48 h-48 flex items-center justify-center mx-auto mb-6 transform transition-transform duration-1000 hover:scale-110">
          <img 
            src={logo}  {/* CAMBIADO: de "/src/assets/logo.png" a {logo} */}
            alt="Constrefri Logo" 
            className="w-full h-full object-contain drop-shadow-2xl animate-float"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://via.placeholder.com/200/3B82F6/FFFFFF?text=C';
            }}
          />
        </div>
        
        <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-200 via-white to-purple-200 bg-clip-text text-transparent mb-4">
          Constrefri
        </h1>
        
        <p className="text-blue-200 text-lg font-light tracking-widest animate-pulse-slow">
          Construye tu futuro!
        </p>
        <div className="mt-8 w-64 h-1 bg-blue-800 rounded-full mx-auto overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-loading-bar"></div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="flex space-x-2">
          <div className="w-2 h-2 bg-blue-300 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '100ms' }}></div>
          <div className="w-2 h-2 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
          <div className="w-2 h-2 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
};

export default Splash;
