import React, { useState } from 'react';

const CierreDiario = () => {
  const [archivo, setArchivo] = useState(null);
  const [vistaPrevia, setVistaPrevia] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const manejarSubidaArchivo = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
      setArchivo(file);
      leerVistaPreviaCSV(file);
    } else {
      alert('Por favor selecciona un archivo CSV válido');
    }
  };

  const leerVistaPreviaCSV = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const contenido = e.target.result;
      const lineas = contenido.split('\n').slice(0, 6);
      setVistaPrevia(lineas.join('\n'));
    };
    reader.readAsText(file);
  };

  const subirYProcesarCSV = async () => {
    if (!archivo) {
      alert('Por favor selecciona un archivo CSV primero');
      return;
    }

    setProcesando(true);
    setMensaje('');

    try {
      const usuarioData = JSON.parse(localStorage.getItem('userData') || '{}');
      const usuarioId = usuarioData.id;

      if (!usuarioId) {
        alert('No se pudo obtener el ID del usuario. Por favor, inicia sesión nuevamente.');
        return;
      }

      const formData = new FormData();
      formData.append('archivo', archivo);
      formData.append('usuario_id', usuarioId.toString());

      const response = await fetch('https://constrefri-backend.onrender.com/cierres-diarios/subir-csv', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const datos = await response.json();
        
        const procesarResponse = await fetch('https://constrefri-backend.onrender.com/cierres-diarios/procesar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productos: datos.productos,
            nombre_archivo: datos.nombre_archivo,
            usuario_id: usuarioId
          }),
        });

        if (procesarResponse.ok) {
          const resultado = await procesarResponse.json();
          setMensaje(`✅ ${resultado.mensaje}`);
          setArchivo(null);
          setVistaPrevia(null);
        } else {
          const error = await procesarResponse.json();
          setMensaje(`❌ Error: ${error.detail}`);
        }
      } else {
        const error = await response.json();
        setMensaje(`❌ Error subiendo archivo: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error:', error);
      setMensaje('❌ Error de conexión con el servidor');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Cierre Diario - Carga de Inventario</h1>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
        <h2 className="text-lg font-semibold mb-4">1. Subir Archivo CSV</h2>
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <input
            type="file"
            accept=".csv"
            onChange={manejarSubidaArchivo}
            className="hidden"
            id="csv-upload"
          />
          <label
            htmlFor="csv-upload"
            className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold inline-block"
          >
            Seleccionar Archivo CSV
          </label>
          <p className="text-sm text-gray-600 mt-2">
            {archivo ? `Archivo seleccionado: ${archivo.name}` : 'Formatos aceptados: .csv'}
          </p>
        </div>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">Estructura esperada del CSV:</h3>
          <code className="text-sm bg-white p-2 rounded border">
            codigo,nombre,categoria,cantidad,precio_compra,precio_venta
          </code>
        </div>
      </div>

      {vistaPrevia && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
          <h2 className="text-lg font-semibold mb-4">2. Vista Previa del Archivo</h2>
          <div className="bg-gray-50 p-4 rounded-lg border">
            <pre className="text-sm whitespace-pre-wrap">{vistaPrevia}</pre>
            <p className="text-xs text-gray-500 mt-2">Mostrando primeras líneas del archivo...</p>
          </div>
        </div>
      )}

      {archivo && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
          <h2 className="text-lg font-semibold mb-4">3. Procesar Cierre Diario</h2>
          <button
            onClick={subirYProcesarCSV}
            disabled={procesando}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {procesando ? 'Procesando...' : 'Procesar Cierre Diario'}
          </button>
        </div>
      )}

      {mensaje && (
        <div className={`p-4 rounded-lg ${
          mensaje.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {mensaje}
        </div>
      )}
    </div>
  );
};

export default CierreDiario;
