from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
from psycopg2.extras import RealDictCursor
import csv
import io
from datetime import datetime, timedelta
from typing import List
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="El Unificador")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://constrefri-frontend.onrender.com",
        "https://constrefri-frontend.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class User(BaseModel):
    id: int
    nombre: str
    email: str
    rol: str

class UserCreate(BaseModel):
    nombre: str
    email: str
    password: str
    rol: str

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    token_acceso: str
    tipo_token: str
    usuario: User

class ProductoCSV(BaseModel):
    codigo: str
    nombre: str
    categoria: str
    cantidad: int
    precio_compra: float
    precio_venta: float

class ProcesarCierreRequest(BaseModel):
    productos: List[ProductoCSV]
    nombre_archivo: str
    usuario_id: int

class RevertirProcesoRequest(BaseModel):
    proceso_id: int
    proceso_tipo: str

class MermaRequest(BaseModel):
    producto_id: int
    cantidad: int
    motivo: str
    observaciones: str = ""
    usuario_id: int

class ConfiguracionBase(BaseModel):
    clave: str
    valor: str

def get_db():
    try:
        # Obtiene la URL desde variable de entorno de Render
        database_url = os.getenv("DATABASE_URL")
        
        if not database_url:
            print("❌ ERROR: DATABASE_URL no configurada en Render")
            print("📋 Ve a tu Web Service -> Environment -> Add DATABASE_URL")
            return None
            
        print(f"🔗 Conectando a PostgreSQL...")
        # Conecta usando la URL de Render
        return psycopg2.connect(database_url)
    except Exception as e:
        print(f"❌ Error PostgreSQL: {e}")
        return None

def init_db():
    conn = get_db()
    if not conn:
        print("⚠️  No se pudo conectar a PostgreSQL")
        return
    
    try:
        cur = conn.cursor()
        
        # Tabla usuarios
        cur.execute('''
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                hash_contrasena TEXT NOT NULL,
                rol VARCHAR(20) NOT NULL,
                activo BOOLEAN DEFAULT true
            )
        ''')
        
        # Tabla productos
        cur.execute('''
            CREATE TABLE IF NOT EXISTS productos (
                id SERIAL PRIMARY KEY,
                codigo VARCHAR(50) UNIQUE NOT NULL,
                nombre VARCHAR(200) NOT NULL,
                categoria VARCHAR(100),
                precio_compra DECIMAL(10,2),
                precio_venta DECIMAL(10,2),
                stock_actual INTEGER DEFAULT 0,
                stock_minimo INTEGER DEFAULT 0,
                activo BOOLEAN DEFAULT true,
                fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabla movimientos_inventario
        cur.execute('''
            CREATE TABLE IF NOT EXISTS movimientos_inventario (
                id SERIAL PRIMARY KEY,
                producto_id INTEGER REFERENCES productos(id),
                tipo_movimiento VARCHAR(20) CHECK (tipo_movimiento IN ('entrada', 'salida', 'ajuste')),
                cantidad INTEGER NOT NULL,
                motivo VARCHAR(200),
                fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                usuario_id INTEGER REFERENCES usuarios(id),
                archivo_origen VARCHAR(255)
            )
        ''')
        
        # Tabla cierres_diarios
        cur.execute('''
            CREATE TABLE IF NOT EXISTS cierres_diarios (
                id SERIAL PRIMARY KEY,
                fecha_cierre DATE NOT NULL,
                archivo_csv VARCHAR(255) NOT NULL,
                total_productos INTEGER DEFAULT 0,
                total_ingresados INTEGER DEFAULT 0,
                estado VARCHAR(20) DEFAULT 'procesado',
                usuario_id INTEGER REFERENCES usuarios(id),
                fecha_procesado TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabla auditoria_sistema
        cur.execute('''
            CREATE TABLE IF NOT EXISTS auditoria_sistema (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER REFERENCES usuarios(id),
                accion VARCHAR(100) NOT NULL,
                tabla_afectada VARCHAR(50),
                registro_id INTEGER,
                detalles TEXT,
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                revertido BOOLEAN DEFAULT false
            )
        ''')
        
        # Tabla mermas_pendientes
        cur.execute('''
            CREATE TABLE IF NOT EXISTS mermas_pendientes (
                id SERIAL PRIMARY KEY,
                producto_id INTEGER REFERENCES productos(id),
                cantidad INTEGER NOT NULL,
                motivo VARCHAR(200) NOT NULL,
                observaciones TEXT,
                estado VARCHAR(20) DEFAULT 'pendiente',
                usuario_solicitud_id INTEGER REFERENCES usuarios(id),
                usuario_aprobacion_id INTEGER REFERENCES usuarios(id),
                motivo_rechazo TEXT,
                fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                fecha_aprobacion TIMESTAMP
            )
        ''')
        
        # Tabla configuraciones_sistema (NUEVA)
        cur.execute('''
            CREATE TABLE IF NOT EXISTS configuraciones_sistema (
                id SERIAL PRIMARY KEY,
                clave VARCHAR(100) UNIQUE NOT NULL,
                valor TEXT NOT NULL,
                descripcion TEXT,
                fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Insertar configuraciones por defecto
        configuraciones = [
            ('empresa_nombre', 'Constrefri', 'Nombre de la empresa'),
            ('empresa_telefono', '+1234567890', 'Teléfono de la empresa'),
            ('empresa_direccion', 'Av. Principal 123', 'Dirección de la empresa'),
            ('empresa_email', 'info@constrefri.com', 'Email de la empresa'),
            ('alerta_stock_bajo', '10', 'Límite para alerta de stock bajo'),
            ('alerta_stock_critico', '5', 'Límite para alerta de stock crítico'),
            ('dias_backup', '7', 'Días entre backups automáticos'),
            ('horario_apertura', '08:00', 'Horario de apertura'),
            ('horario_cierre', '18:00', 'Horario de cierre'),
            ('tiempo_sesion', '60', 'Tiempo de sesión en minutos')
        ]
        
        for clave, valor, descripcion in configuraciones:
            cur.execute(
                "INSERT INTO configuraciones_sistema (clave, valor, descripcion) VALUES (%s, %s, %s) ON CONFLICT (clave) DO NOTHING",
                (clave, valor, descripcion)
            )
        
        # Verificar si ya existen usuarios
        cur.execute("SELECT COUNT(*) FROM usuarios")
        count = cur.fetchone()[0]
        
        if count == 0:
            print("📝 Insertando usuarios por defecto...")
            usuarios = [
                ('Carlos Dueño', 'dueno@constrefri.com', 'dueno123', 'dueño'),
                ('Maria Administradora', 'admin@constrefri.com', 'admin123', 'administrador'),
                ('Juan Empleado', 'empleado@constrefri.com', 'empleado123', 'empleado')
            ]
            
            for nombre, email, password, rol in usuarios:
                cur.execute(
                    "INSERT INTO usuarios (nombre, email, hash_contrasena, rol) VALUES (%s, %s, %s, %s)",
                    (nombre, email, password, rol)
                )
            
            print("✅ Todos los usuarios insertados")
        
        conn.commit()
        print("✅ Todas las tablas creadas/verificadas")
        
    except Exception as e:
        print(f"❌ Error creando tablas: {e}")
    finally:
        conn.close()

init_db()

def registrar_auditoria(usuario_id: int, accion: str, tabla_afectada: str = None, registro_id: int = None, detalles: str = None):
    conn = get_db()
    if not conn:
        return
    
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO auditoria_sistema (usuario_id, accion, tabla_afectada, registro_id, detalles) VALUES (%s, %s, %s, %s, %s)",
            (usuario_id, accion, tabla_afectada, registro_id, detalles)
        )
        conn.commit()
        print(f"✅ Auditoría registrada: {accion}")
    except Exception as e:
        print(f"❌ Error registrando auditoría: {e}")
    finally:
        conn.close()

@app.get("/")
def home():
    return {"mensaje": "Backend funcionando"}

@app.post("/auth/login")
def login(login_data: LoginRequest):
    conn = get_db()
    if not conn:
        raise HTTPException(status_code=500, detail="Error de conexión a PostgreSQL")
    
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        print(f"🔍 Buscando usuario: {login_data.username}")
        
        cur.execute(
            "SELECT id, nombre, email, hash_contrasena, rol FROM usuarios WHERE email = %s",
            (login_data.username,)
        )
        user_db = cur.fetchone()
        
        if user_db:
            print(f"✅ Usuario encontrado: {user_db['email']}")
            print(f"🔑 Contraseña BD: '{user_db['hash_contrasena']}'")
            print(f"🔑 Contraseña enviada: '{login_data.password}'")
            
            if user_db["hash_contrasena"] == login_data.password:
                registrar_auditoria(user_db["id"], "LOGIN", "usuarios", user_db["id"], f"Usuario {user_db['email']} inició sesión")
                
                return {
                    "token_acceso": f"token_{user_db['id']}",
                    "tipo_token": "bearer",
                    "usuario": {
                        "id": user_db["id"],
                        "nombre": user_db["nombre"],
                        "email": user_db["email"],
                        "rol": user_db["rol"]
                    }
                }
        
        print("❌ Credenciales incorrectas")
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
            
    except Exception as e:
        print(f"Error en login: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
    finally:
        conn.close()

@app.get("/usuarios")
def obtener_usuarios():
    conn = get_db()
    if not conn:
        return []
    
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT id, nombre, email, rol FROM usuarios WHERE activo = true")
        return cur.fetchall()
    except Exception as e:
        print(f"Error obteniendo usuarios: {e}")
        return []
    finally:
        conn.close()

@app.post("/usuarios")
def crear_usuario(usuario: UserCreate):
    conn = get_db()
    if not conn:
        raise HTTPException(status_code=500, detail="Error de conexión a PostgreSQL")
    
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        print(f"📝 Intentando crear usuario: {usuario.email}")
        print(f"📋 Datos recibidos: nombre={usuario.nombre}, email={usuario.email}, rol={usuario.rol}")
        
        cur.execute("SELECT id FROM usuarios WHERE email = %s", (usuario.email,))
        email_existente = cur.fetchone()
        
        if email_existente:
            print(f"❌ Email ya existe: {usuario.email}")
            raise HTTPException(status_code=400, detail="El email ya existe")
        
        print("✅ Email disponible")
        
        try:
            cur.execute(
                "INSERT INTO usuarios (nombre, email, hash_contrasena, rol) VALUES (%s, %s, %s, %s) RETURNING id, nombre, email, rol",
                (usuario.nombre, usuario.email, usuario.password, usuario.rol)
            )
            
            nuevo_usuario = cur.fetchone()
            conn.commit()
            
            print(f"✅ Usuario creado exitosamente: ID={nuevo_usuario['id']}")
            
            registrar_auditoria(1, "CREAR_USUARIO", "usuarios", nuevo_usuario["id"], f"Usuario {usuario.email} creado con rol {usuario.rol}")
            
            return {
                "id": nuevo_usuario["id"],
                "nombre": nuevo_usuario["nombre"],
                "email": nuevo_usuario["email"],
                "rol": nuevo_usuario["rol"]
            }
            
        except Exception as insert_error:
            print(f"❌ Error en INSERT: {insert_error}")
            conn.rollback()
            raise HTTPException(status_code=500, detail=f"Error creando usuario en la base de datos: {str(insert_error)}")
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error general: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")
    finally:
        if conn:
            conn.close()

@app.delete("/usuarios/{usuario_id}")
async def eliminar_usuario(usuario_id: int, usuario_actual_id: int = Query(...)):
    conn = get_db()
    if not conn:
        raise HTTPException(status_code=500, detail="Error de conexión a PostgreSQL")
    
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Verificar que el usuario actual existe y es administrador/dueño
        cur.execute("SELECT rol FROM usuarios WHERE id = %s", (usuario_actual_id,))
        usuario_actual = cur.fetchone()
        
        if not usuario_actual:
            raise HTTPException(status_code=404, detail="Usuario actual no encontrado")
        
        if usuario_actual["rol"] not in ["administrador", "dueño"]:
            raise HTTPException(status_code=403, detail="No tienes permisos para eliminar usuarios")
        
        # Verificar que el usuario a eliminar existe
        cur.execute("SELECT id, nombre, email FROM usuarios WHERE id = %s", (usuario_id,))
        usuario_a_eliminar = cur.fetchone()
        
        if not usuario_a_eliminar:
            raise HTTPException(status_code=404, detail="Usuario a eliminar no encontrado")
        
        # No permitir eliminarse a sí mismo
        if usuario_id == usuario_actual_id:
            raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")
        
        # Marcar como inactivo en lugar de eliminar (MEJOR PRÁCTICA)
        cur.execute("UPDATE usuarios SET activo = false WHERE id = %s", (usuario_id,))
        conn.commit()
        
        registrar_auditoria(usuario_actual_id, "ELIMINAR_USUARIO", "usuarios", usuario_id, 
                           f"Usuario {usuario_a_eliminar['email']} desactivado")
        
        return {
            "success": True,
            "mensaje": f"Usuario {usuario_a_eliminar['nombre']} eliminado exitosamente"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"❌ Error eliminando usuario: {e}")
        raise HTTPException(status_code=500, detail=f"Error eliminando usuario: {str(e)}")
    finally:
        conn.close()

@app.post("/cierres-diarios/subir-csv")
async def subir_csv_cierre(archivo: UploadFile = File(...), usuario_id: int = Form(...)):
    try:
        contenido = await archivo.read()
        contenido_texto = contenido.decode('utf-8')
        
        csv_reader = csv.DictReader(io.StringIO(contenido_texto))
        productos = []
        
        for fila in csv_reader:
            producto = ProductoCSV(
                codigo=fila.get('codigo', '').strip(),
                nombre=fila.get('nombre', '').strip(),
                categoria=fila.get('categoria', '').strip(),
                cantidad=int(fila.get('cantidad', 0)),
                precio_compra=float(fila.get('precio_compra', 0)),
                precio_venta=float(fila.get('precio_venta', 0))
            )
            productos.append(producto)
        
        return {
            "success": True,
            "productos": productos,
            "total_productos": len(productos),
            "nombre_archivo": archivo.filename
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error procesando CSV: {str(e)}")

@app.post("/cierres-diarios/procesar")
async def procesar_cierre_diario(datos: ProcesarCierreRequest):
    conn = get_db()
    if not conn:
        raise HTTPException(status_code=500, detail="Error de conexión a PostgreSQL")
    
    try:
        cur = conn.cursor()
        
        usuario_id = datos.usuario_id
        
        print(f"🔍 Procesando cierre con usuario_id: {usuario_id}")
        
        cur.execute("SELECT id FROM usuarios WHERE id = %s", (usuario_id,))
        usuario_existe = cur.fetchone()
        
        if not usuario_existe:
            print(f"❌ Usuario {usuario_id} no existe en la base de datos")
            raise HTTPException(status_code=400, detail=f"El usuario {usuario_id} no existe")
        
        cur.execute(
            "INSERT INTO cierres_diarios (fecha_cierre, archivo_csv, total_productos, usuario_id) VALUES (%s, %s, %s, %s) RETURNING id",
            (datetime.now().date(), datos.nombre_archivo, len(datos.productos), usuario_id)
        )
        cierre_id = cur.fetchone()[0]
        
        total_ingresados = 0
        
        for producto in datos.productos:
            cur.execute("SELECT id, stock_actual FROM productos WHERE codigo = %s", (producto.codigo,))
            producto_existente = cur.fetchone()
            
            if producto_existente:
                producto_id = producto_existente[0]
                nuevo_stock = producto_existente[1] + producto.cantidad
                
                cur.execute(
                    "UPDATE productos SET stock_actual = %s, precio_compra = %s, precio_venta = %s WHERE id = %s",
                    (nuevo_stock, producto.precio_compra, producto.precio_venta, producto_id)
                )
                
                registrar_auditoria(usuario_id, "ACTUALIZAR_PRODUCTO", "productos", producto_id, f"Stock actualizado a {nuevo_stock}")
            else:
                cur.execute(
                    "INSERT INTO productos (codigo, nombre, categoria, precio_compra, precio_venta, stock_actual) VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
                    (producto.codigo, producto.nombre, producto.categoria, producto.precio_compra, producto.precio_venta, producto.cantidad)
                )
                producto_id = cur.fetchone()[0]
                
                registrar_auditoria(usuario_id, "CREAR_PRODUCTO", "productos", producto_id, f"Producto {producto.codigo} creado")
            
            cur.execute(
                "INSERT INTO movimientos_inventario (producto_id, tipo_movimiento, cantidad, motivo, usuario_id, archivo_origen) VALUES (%s, %s, %s, %s, %s, %s)",
                (producto_id, 'entrada', producto.cantidad, 'Cierre diario CSV', usuario_id, datos.nombre_archivo)
            )
            
            total_ingresados += 1
        
        cur.execute(
            "UPDATE cierres_diarios SET total_ingresados = %s WHERE id = %s",
            (total_ingresados, cierre_id)
        )
        
        conn.commit()
        
        registrar_auditoria(usuario_id, "CIERRE_DIARIO", "cierres_diarios", cierre_id, f"Cierre diario {datos.nombre_archivo} procesado")
        
        return {
            "success": True,
            "mensaje": f"Cierre diario procesado exitosamente. {total_ingresados} productos actualizados/creados.",
            "cierre_id": cierre_id,
            "total_procesado": total_ingresados
        }
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error procesando cierre: {str(e)}")
    finally:
        conn.close()

@app.get("/inventario")
async def obtener_inventario():
    conn = get_db()
    if not conn:
        return []
    
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT id, codigo, nombre, categoria, precio_compra, precio_venta, stock_actual, stock_minimo 
            FROM productos 
            WHERE activo = true 
            ORDER BY nombre
        """)
        return cur.fetchall()
    except Exception as e:
        print(f"Error obteniendo inventario: {e}")
        return []
    finally:
        conn.close()

@app.delete("/productos/{producto_id}")
async def eliminar_producto(producto_id: int, usuario_id: int = Query(...), cantidad: int = Query(None)):
    conn = get_db()
    if not conn:
        raise HTTPException(status_code=500, detail="Error de conexión a PostgreSQL")
    
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("SELECT rol FROM usuarios WHERE id = %s", (usuario_id,))
        usuario = cur.fetchone()
        
        if not usuario or usuario["rol"] != "dueño":
            raise HTTPException(status_code=403, detail="Solo el dueño puede eliminar productos")
        
        cur.execute("SELECT nombre, stock_actual FROM productos WHERE id = %s", (producto_id,))
        producto = cur.fetchone()
        
        if not producto:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        
        if cantidad is None:
            cur.execute("DELETE FROM movimientos_inventario WHERE producto_id = %s", (producto_id,))
            cur.execute("DELETE FROM productos WHERE id = %s", (producto_id,))
            mensaje = f"Producto {producto['nombre']} eliminado permanentemente"
            registrar_auditoria(usuario_id, "ELIMINAR_PRODUCTO", "productos", producto_id, f"Producto {producto['nombre']} eliminado completamente")
        else:
            if cantidad > producto["stock_actual"]:
                raise HTTPException(status_code=400, detail=f"No se puede eliminar más de {producto['stock_actual']} unidades")
            
            nuevo_stock = producto["stock_actual"] - cantidad
            
            if nuevo_stock <= 0:
                cur.execute("DELETE FROM movimientos_inventario WHERE producto_id = %s", (producto_id,))
                cur.execute("DELETE FROM productos WHERE id = %s", (producto_id,))
                mensaje = f"Producto {producto['nombre']} eliminado completamente (stock agotado)"
                registrar_auditoria(usuario_id, "ELIMINAR_PRODUCTO", "productos", producto_id, f"Producto {producto['nombre']} eliminado por agotar stock")
            else:
                cur.execute("UPDATE productos SET stock_actual = %s WHERE id = %s", (nuevo_stock, producto_id))
                cur.execute(
                    "INSERT INTO movimientos_inventario (producto_id, tipo_movimiento, cantidad, motivo, usuario_id) VALUES (%s, %s, %s, %s, %s)",
                    (producto_id, 'salida', cantidad, 'Reducción manual de stock', usuario_id)
                )
                mensaje = f"Stock reducido en {cantidad} unidades. Nuevo stock: {nuevo_stock} unidades"
                registrar_auditoria(usuario_id, "AJUSTAR_STOCK", "productos", producto_id, f"Stock reducido en {cantidad} unidades. Nuevo stock: {nuevo_stock}")
        
        conn.commit()
        
        return {
            "success": True,
            "mensaje": mensaje
        }
        
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error eliminando producto: {str(e)}")
    finally:
        conn.close()

@app.get("/auditoria")
async def obtener_auditoria():
    conn = get_db()
    if not conn:
        return []
    
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT a.*, u.nombre as usuario_nombre, u.email as usuario_email
            FROM auditoria_sistema a
            LEFT JOIN usuarios u ON a.usuario_id = u.id
            ORDER BY a.fecha DESC
            LIMIT 1000
        """)
        resultados = cur.fetchall()
        return resultados
    except Exception as e:
        print(f"Error obteniendo auditoría: {e}")
        return []
    finally:
        conn.close()

@app.post("/revertir-proceso")
async def revertir_proceso(datos: RevertirProcesoRequest):
    conn = get_db()
    if not conn:
        raise HTTPException(status_code=500, detail="Error de conexión a PostgreSQL")
    
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("SELECT * FROM auditoria_sistema WHERE id = %s", (datos.proceso_id,))
        proceso = cur.fetchone()
        
        if not proceso:
            raise HTTPException(status_code=404, detail="Proceso no encontrado")
        
        if proceso["revertido"]:
            raise HTTPException(status_code=400, detail="Este proceso ya fue revertido")
        
        print(f"🔄 Revertiendo proceso: {proceso['accion']} - {proceso['detalles']}")
        
        if proceso["accion"] == "CIERRE_DIARIO":
            # SOLUCIÓN SIMPLE Y DIRECTA: Revertir usando los movimientos de inventario
            cierre_id = proceso["registro_id"]
            print(f"📁 Revertiendo cierre diario ID: {cierre_id}")
            
            # 1. Obtener información del cierre
            cur.execute("SELECT archivo_csv FROM cierres_diarios WHERE id = %s", (cierre_id,))
            cierre_info = cur.fetchone()
            
            if not cierre_info:
                raise HTTPException(status_code=404, detail="Cierre diario no encontrado")
            
            nombre_archivo = cierre_info["archivo_csv"]
            print(f"📄 Archivo del cierre: {nombre_archivo}")
            
            productos_actualizados = 0
            
            # 2. Buscar TODOS los movimientos de este cierre
            cur.execute("""
                SELECT mi.producto_id, mi.cantidad, p.codigo, p.nombre, p.stock_actual
                FROM movimientos_inventario mi
                JOIN productos p ON mi.producto_id = p.id
                WHERE mi.archivo_origen = %s
            """, (nombre_archivo,))
            
            movimientos = cur.fetchall()
            print(f"🔍 Movimientos encontrados para revertir: {len(movimientos)}")
            
            # 3. Revertir el stock para cada producto
            for movimiento in movimientos:
                producto_id = movimiento["producto_id"]
                cantidad_agregada = movimiento["cantidad"]
                stock_actual = movimiento["stock_actual"]
                
                # Calcular nuevo stock (restando lo agregado en el cierre)
                nuevo_stock = stock_actual - cantidad_agregada
                if nuevo_stock < 0:
                    nuevo_stock = 0
                
                print(f"📈 Revirtiendo producto: {movimiento['codigo']} - Stock: {stock_actual} -> {nuevo_stock} (restado: {cantidad_agregada})")
                
                cur.execute("UPDATE productos SET stock_actual = %s WHERE id = %s", (nuevo_stock, producto_id))
                productos_actualizados += 1
            
            # 4. Eliminar movimientos de este cierre
            cur.execute("DELETE FROM movimientos_inventario WHERE archivo_origen = %s", (nombre_archivo,))
            movimientos_eliminados = cur.rowcount
            
            # 5. Eliminar el registro del cierre diario
            cur.execute("DELETE FROM cierres_diarios WHERE id = %s", (cierre_id,))
            cierres_eliminados = cur.rowcount
            
            # 6. Marcar como revertido en auditoría
            cur.execute("UPDATE auditoria_sistema SET revertido = true WHERE id = %s", (datos.proceso_id,))
            
            print(f"✅ Cierre diario revertido: {productos_actualizados} productos actualizados, {movimientos_eliminados} movimientos eliminados")
            
        elif proceso["accion"] == "CREAR_PRODUCTO":
            print(f"🗑️ Eliminando producto creado ID: {proceso['registro_id']}")
            cur.execute("DELETE FROM productos WHERE id = %s", (proceso["registro_id"],))
            cur.execute("DELETE FROM movimientos_inventario WHERE producto_id = %s", (proceso["registro_id"],))
            cur.execute("UPDATE auditoria_sistema SET revertido = true WHERE id = %s", (datos.proceso_id,))
            
        elif proceso["accion"] == "CREAR_USUARIO":
            print(f"👤 Desactivando usuario creado ID: {proceso['registro_id']}")
            cur.execute("UPDATE usuarios SET activo = false WHERE id = %s", (proceso["registro_id"],))
            cur.execute("UPDATE auditoria_sistema SET revertido = true WHERE id = %s", (datos.proceso_id,))
            
        elif proceso["accion"] == "ACTUALIZAR_PRODUCTO":
            print(f"🔄 No se puede revertir automáticamente actualización de producto")
            cur.execute("UPDATE auditoria_sistema SET revertido = true WHERE id = %s", (datos.proceso_id,))
            
        elif proceso["accion"] == "ELIMINAR_PRODUCTO":
            print(f"⚠️ No se puede revertir eliminación de producto")
            raise HTTPException(status_code=400, detail="No se puede revertir la eliminación de productos")
            
        elif proceso["accion"] == "AJUSTAR_STOCK":
            print(f"🔄 Revirtiendo ajuste de stock para producto ID: {proceso['registro_id']}")
            # Buscar el último movimiento de stock para este producto
            cur.execute("""
                SELECT cantidad FROM movimientos_inventario 
                WHERE producto_id = %s AND tipo_movimiento = 'salida' 
                ORDER BY fecha_movimiento DESC LIMIT 1
            """, (proceso["registro_id"],))
            movimiento = cur.fetchone()
            
            if movimiento:
                cantidad_reducida = movimiento["cantidad"]
                # Obtener stock actual
                cur.execute("SELECT stock_actual FROM productos WHERE id = %s", (proceso["registro_id"],))
                producto = cur.fetchone()
                if producto:
                    nuevo_stock = producto["stock_actual"] + cantidad_reducida
                    cur.execute("UPDATE productos SET stock_actual = %s WHERE id = %s", (nuevo_stock, proceso["registro_id"]))
                    # Eliminar el movimiento de ajuste
                    cur.execute("DELETE FROM movimientos_inventario WHERE producto_id = %s AND tipo_movimiento = 'salida' ORDER BY fecha_movimiento DESC LIMIT 1", (proceso["registro_id"],))
            
            cur.execute("UPDATE auditoria_sistema SET revertido = true WHERE id = %s", (datos.proceso_id,))
        
        conn.commit()
        
        # Registrar reversión en auditoría
        registrar_auditoria(1, "REVERTIR_PROCESO", "auditoria_sistema", datos.proceso_id, f"Proceso {datos.proceso_id} ({proceso['accion']}) revertido")
        
        return {
            "success": True,
            "mensaje": f"Proceso {datos.proceso_id} revertido exitosamente. {productos_actualizados} productos actualizados"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"❌ Error revirtiendo proceso: {e}")
        raise HTTPException(status_code=500, detail=f"Error revirtiendo proceso: {str(e)}")
    finally:
        conn.close()

# ==================== RUTAS PARA MERMAS ====================

@app.post("/mermas/registrar")
async def registrar_merma(datos: MermaRequest):
    conn = get_db()
    if not conn:
        raise HTTPException(status_code=500, detail="Error de conexión a PostgreSQL")
    
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Verificar que el producto existe y tiene stock suficiente
        cur.execute("SELECT id, nombre, stock_actual FROM productos WHERE id = %s", (datos.producto_id,))
        producto = cur.fetchone()
        
        if not producto:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        
        if datos.cantidad > producto["stock_actual"]:
            raise HTTPException(status_code=400, detail=f"No hay suficiente stock. Stock actual: {producto['stock_actual']}")
        
        if datos.cantidad <= 0:
            raise HTTPException(status_code=400, detail="La cantidad debe ser mayor a 0")
        
        # Verificar rol del usuario
        cur.execute("SELECT rol FROM usuarios WHERE id = %s", (datos.usuario_id,))
        usuario = cur.fetchone()
        
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        # Si es dueño o administrador, aplicar merma inmediatamente
        if usuario["rol"] in ["dueño", "administrador"]:
            # Calcular nuevo stock
            nuevo_stock = producto["stock_actual"] - datos.cantidad
            
            # Actualizar stock del producto
            cur.execute("UPDATE productos SET stock_actual = %s WHERE id = %s", 
                       (nuevo_stock, datos.producto_id))
            
            # Registrar movimiento de inventario
            cur.execute("""
                INSERT INTO movimientos_inventario 
                (producto_id, tipo_movimiento, cantidad, motivo, usuario_id)
                VALUES (%s, 'salida', %s, %s, %s)
            """, (datos.producto_id, datos.cantidad, f"Merma: {datos.motivo}", datos.usuario_id))
            
            mensaje = f"Merma registrada exitosamente. Stock actualizado: {nuevo_stock} unidades"
            estado = "aprobada"
            
        else:
            # Si es empleado, solo guardar la solicitud pendiente
            mensaje = "Solicitud de merma enviada. Esperando aprobación del dueño."
            estado = "pendiente"
            nuevo_stock = producto["stock_actual"]  # No cambia el stock
        
        # Registrar en tabla de mermas_pendientes
        cur.execute("""
            INSERT INTO mermas_pendientes 
            (producto_id, cantidad, motivo, observaciones, estado, usuario_solicitud_id)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (datos.producto_id, datos.cantidad, datos.motivo, datos.observaciones, estado, datos.usuario_id))
        
        merma_id = cur.fetchone()["id"]
        
        conn.commit()
        
        # Registrar en auditoría
        registrar_auditoria(datos.usuario_id, "SOLICITUD_MERMA", "mermas_pendientes", merma_id, 
                           f"Solicitud de merma: {datos.cantidad} unidades de {producto['nombre']} - Estado: {estado}")
        
        return {
            "success": True,
            "mensaje": mensaje,
            "estado": estado,
            "merma_id": merma_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"❌ Error registrando merma: {e}")
        raise HTTPException(status_code=500, detail=f"Error registrando merma: {str(e)}")
    finally:
        conn.close()

@app.get("/mermas/pendientes")
async def obtener_mermas_pendientes():
    conn = get_db()
    if not conn:
        return []
    
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT 
                mp.*,
                p.codigo as producto_codigo,
                p.nombre as producto_nombre,
                p.stock_actual as producto_stock,
                u.nombre as usuario_solicitud_nombre,
                u.email as usuario_solicitud_email
            FROM mermas_pendientes mp
            JOIN productos p ON mp.producto_id = p.id
            JOIN usuarios u ON mp.usuario_solicitud_id = u.id
            WHERE mp.estado = 'pendiente'
            ORDER BY mp.fecha_solicitud DESC
        """)
        return cur.fetchall()
    except Exception as e:
        print(f"Error obteniendo mermas pendientes: {e}")
        return []
    finally:
        conn.close()

@app.post("/mermas/aprobar")
async def aprobar_merma(merma_id: int = Query(...), usuario_id: int = Query(...)):
    conn = get_db()
    if not conn:
        raise HTTPException(status_code=500, detail="Error de conexión a PostgreSQL")
    
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Verificar que el usuario es dueño
        cur.execute("SELECT rol FROM usuarios WHERE id = %s", (usuario_id,))
        usuario = cur.fetchone()
        
        if not usuario or usuario["rol"] != "dueño":
            raise HTTPException(status_code=403, detail="Solo el dueño puede aprobar mermas")
        
        # Obtener la merma pendiente
        cur.execute("""
            SELECT mp.*, p.nombre as producto_nombre, p.stock_actual
            FROM mermas_pendientes mp
            JOIN productos p ON mp.producto_id = p.id
            WHERE mp.id = %s AND mp.estado = 'pendiente'
        """, (merma_id,))
        
        merma = cur.fetchone()
        
        if not merma:
            raise HTTPException(status_code=404, detail="Merma no encontrada o ya procesada")
        
        # Verificar que aún hay stock suficiente
        if merma["cantidad"] > merma["stock_actual"]:
            raise HTTPException(status_code=400, detail=f"No hay suficiente stock. Stock actual: {merma['stock_actual']}")
        
        # Actualizar stock del producto
        nuevo_stock = merma["stock_actual"] - merma["cantidad"]
        cur.execute("UPDATE productos SET stock_actual = %s WHERE id = %s", 
                   (nuevo_stock, merma["producto_id"]))
        
        # Registrar movimiento de inventario
        cur.execute("""
            INSERT INTO movimientos_inventario 
            (producto_id, tipo_movimiento, cantidad, motivo, usuario_id)
            VALUES (%s, 'salida', %s, %s, %s)
        """, (merma["producto_id"], merma["cantidad"], f"Merma: {merma['motivo']}", usuario_id))
        
        # Actualizar merma como aprobada
        cur.execute("""
            UPDATE mermas_pendientes 
            SET estado = 'aprobada', 
                usuario_aprobacion_id = %s,
                fecha_aprobacion = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (usuario_id, merma_id))
        
        conn.commit()
        
        # Registrar en auditoría
        registrar_auditoria(usuario_id, "APROBAR_MERMA", "mermas_pendientes", merma_id, 
                           f"Merma aprobada: {merma['cantidad']} unidades de {merma['producto_nombre']}")
        
        return {
            "success": True,
            "mensaje": f"Merma aprobada exitosamente. Stock actualizado: {nuevo_stock} unidades"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"❌ Error aprobando merma: {e}")
        raise HTTPException(status_code=500, detail=f"Error aprobando merma: {str(e)}")
    finally:
        conn.close()

@app.post("/mermas/rechazar")
async def rechazar_merma(merma_id: int = Query(...), usuario_id: int = Query(...), motivo_rechazo: str = Query(...)):
    conn = get_db()
    if not conn:
        raise HTTPException(status_code=500, detail="Error de conexión a PostgreSQL")
    
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Verificar que el usuario es dueño
        cur.execute("SELECT rol FROM usuarios WHERE id = %s", (usuario_id,))
        usuario = cur.fetchone()
        
        if not usuario or usuario["rol"] != "dueño":
            raise HTTPException(status_code=403, detail="Solo el dueño puede rechazar mermas")
        
        # Obtener la merma pendiente
        cur.execute("""
            SELECT mp.*, p.nombre as producto_nombre
            FROM mermas_pendientes mp
            JOIN productos p ON mp.producto_id = p.id
            WHERE mp.id = %s AND mp.estado = 'pendiente'
        """, (merma_id,))
        
        merma = cur.fetchone()
        
        if not merma:
            raise HTTPException(status_code=404, detail="Merma no encontrada o ya procesada")
        
        # Actualizar merma como rechazada
        cur.execute("""
            UPDATE mermas_pendientes 
            SET estado = 'rechazada', 
                usuario_aprobacion_id = %s,
                motivo_rechazo = %s,
                fecha_aprobacion = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (usuario_id, motivo_rechazo, merma_id))
        
        conn.commit()
        
        # Registrar en auditoría
        registrar_auditoria(usuario_id, "RECHAZAR_MERMA", "mermas_pendientes", merma_id, 
                           f"Merma rechazada: {merma['cantidad']} unidades de {merma['producto_nombre']} - Motivo: {motivo_rechazo}")
        
        return {
            "success": True,
            "mensaje": "Merma rechazada exitosamente"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"❌ Error rechazando merma: {e}")
        raise HTTPException(status_code=500, detail=f"Error rechazando merma: {str(e)}")
    finally:
        conn.close()

# ==================== RUTAS PARA REPORTES ====================

@app.get("/reportes/metricas")
async def obtener_metricas_reportes():
    conn = get_db()
    if not conn:
        return {}
    
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Métricas de productos
        cur.execute("""
            SELECT 
                COUNT(*) as total_productos,
                SUM(stock_actual) as stock_total,
                SUM(precio_venta * stock_actual) as valor_inventario,
                COUNT(CASE WHEN stock_actual <= stock_minimo THEN 1 END) as stock_critico_count,
                COUNT(CASE WHEN stock_actual > 0 THEN 1 END) as productos_activos
            FROM productos 
            WHERE activo = true
        """)
        metricas = cur.fetchone()
        
        # Productos más vendidos (basado en movimientos de salida)
        cur.execute("""
            SELECT 
                p.nombre as producto,
                SUM(mi.cantidad) as vendidos,
                SUM(mi.cantidad * p.precio_venta) as ingresos
            FROM movimientos_inventario mi
            JOIN productos p ON mi.producto_id = p.id
            WHERE mi.tipo_movimiento = 'salida'
            GROUP BY p.id, p.nombre
            ORDER BY vendidos DESC
            LIMIT 5
        """)
        productos_mas_vendidos = cur.fetchall()
        
        # Stock crítico
        cur.execute("""
            SELECT 
                nombre as producto,
                stock_actual as stock,
                stock_minimo as minimo,
                CASE 
                    WHEN stock_actual <= stock_minimo THEN 'Critico'
                    WHEN stock_actual <= stock_minimo * 2 THEN 'Bajo'
                    ELSE 'Normal'
                END as estado
            FROM productos 
            WHERE activo = true AND stock_actual <= stock_minimo * 2
            ORDER BY stock_actual ASC
        """)
        stock_critico = cur.fetchall()
        
        return {
            "metricas": metricas,
            "productos_mas_vendidos": productos_mas_vendidos,
            "stock_critico": stock_critico
        }
        
    except Exception as e:
        print(f"Error obteniendo métricas de reportes: {e}")
        return {}
    finally:
        conn.close()

@app.get("/reportes/ventas")
async def obtener_ventas_reporte():
    conn = get_db()
    if not conn:
        return []
    
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Ventas de los últimos 7 días (simuladas basadas en movimientos)
        cur.execute("""
            SELECT 
                DATE(fecha_movimiento) as fecha,
                SUM(cantidad * (SELECT precio_venta FROM productos WHERE id = mi.producto_id)) as ventas_dia
            FROM movimientos_inventario mi
            WHERE tipo_movimiento = 'salida' 
                AND fecha_movimiento >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY DATE(fecha_movimiento)
            ORDER BY fecha DESC
            LIMIT 7
        """)
        ventas_reales = cur.fetchall()
        
        # Si no hay ventas reales, generar datos de ejemplo basados en productos
        if not ventas_reales:
            cur.execute("SELECT SUM(precio_venta * 15) as venta_promedio FROM productos WHERE activo = true")
            venta_promedio = cur.fetchone()["venta_promedio"] or 1000
            
            ventas_reales = []
            for i in range(7):
                fecha = (datetime.now() - timedelta(days=6-i)).strftime('%d/%m')
                venta = int(venta_promedio * (0.8 + (i * 0.05)))  # Variación progresiva
                ventas_reales.append({
                    "fecha": fecha,
                    "ventas": venta
                })
        else:
            # Formatear ventas reales
            ventas_reales = [
                {
                    "fecha": venta["fecha"].strftime('%d/%m'),
                    "ventas": float(venta["ventas_dia"]) if venta["ventas_dia"] else 0
                }
                for venta in ventas_reales
            ]
        
        return ventas_reales
        
    except Exception as e:
        print(f"Error obteniendo ventas: {e}")
        return []
    finally:
        conn.close()

@app.get("/reportes/stock-critico")
async def obtener_stock_critico_reporte():
    conn = get_db()
    if not conn:
        return []
    
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("""
            SELECT 
                nombre as producto,
                stock_actual as stock,
                stock_minimo as minimo,
                CASE 
                    WHEN stock_actual <= stock_minimo THEN 'Critico'
                    ELSE 'Bajo'
                END as estado
            FROM productos 
            WHERE activo = true AND stock_actual <= stock_minimo * 2
            ORDER BY stock_actual ASC
        """)
        return cur.fetchall()
        
    except Exception as e:
        print(f"Error obteniendo stock crítico: {e}")
        return []
    finally:
        conn.close()

@app.get("/reportes/productos-mas-vendidos")
async def obtener_productos_mas_vendidos_reporte():
    conn = get_db()
    if not conn:
        return []
    
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("""
            SELECT 
                p.nombre as producto,
                COALESCE(SUM(mi.cantidad), 0) as vendidos,
                COALESCE(SUM(mi.cantidad * p.precio_venta), 0) as ingresos
            FROM productos p
            LEFT JOIN movimientos_inventario mi ON p.id = mi.producto_id AND mi.tipo_movimiento = 'salida'
            WHERE p.activo = true
            GROUP BY p.id, p.nombre
            ORDER BY vendidos DESC
            LIMIT 5
        """)
        return cur.fetchall()
        
    except Exception as e:
        print(f"Error obteniendo productos más vendidos: {e}")
        return []
    finally:
        conn.close()

# ==================== RUTAS PARA CONFIGURACIONES ====================

@app.get("/configuraciones")
async def obtener_configuraciones():
    conn = get_db()
    if not conn:
        return {}
    
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT clave, valor FROM configuraciones_sistema")
        configs = cur.fetchall()
        
        # Convertir a objeto
        config_dict = {config['clave']: config['valor'] for config in configs}
        return config_dict
        
    except Exception as e:
        print(f"Error obteniendo configuraciones: {e}")
        return {}
    finally:
        conn.close()

@app.post("/configuraciones/actualizar")
async def actualizar_configuracion(config: ConfiguracionBase):
    conn = get_db()
    if not conn:
        raise HTTPException(status_code=500, detail="Error de conexión a PostgreSQL")
    
    try:
        cur = conn.cursor()
        cur.execute(
            "UPDATE configuraciones_sistema SET valor = %s, fecha_actualizacion = CURRENT_TIMESTAMP WHERE clave = %s",
            (config.valor, config.clave)
        )
        conn.commit()
        
        return {"success": True, "mensaje": f"Configuración {config.clave} actualizada"}
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error actualizando configuración: {str(e)}")
    finally:
        conn.close()

@app.post("/configuraciones/actualizar-multiples")
async def actualizar_configuraciones_multiples(configs: List[ConfiguracionBase]):
    conn = get_db()
    if not conn:
        raise HTTPException(status_code=500, detail="Error de conexión a PostgreSQL")
    
    try:
        cur = conn.cursor()
        
        for config in configs:
            cur.execute(
                "UPDATE configuraciones_sistema SET valor = %s, fecha_actualizacion = CURRENT_TIMESTAMP WHERE clave = %s",
                (config.valor, config.clave)
            )
        
        conn.commit()
        
        return {"success": True, "mensaje": f"{len(configs)} configuraciones actualizadas"}
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error actualizando configuraciones: {str(e)}")
    finally:
        conn.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
