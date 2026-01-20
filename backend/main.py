from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
from psycopg2.extras import RealDictCursor
import hashlib
import csv
import io
from datetime import datetime
from typing import List

app = FastAPI(title="El Unificador")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_CONFIG = {
    "host": "localhost",
    "database": "constrefri_db",
    "user": "constrefri_user",
    "password": "12345",
    "port": "5432"
}

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

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def get_db():
    try:
        return psycopg2.connect(**DB_CONFIG)
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
        conn.commit()
        print("✅ Tabla 'usuarios' lista")
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

init_db()

@app.get("/")
def home():
    return {"mensaje": "Backend funcionando"}

@app.post("/auth/login")
def login(login_data: LoginRequest):
    conn = get_db()
    if conn:
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute(
                "SELECT id, nombre, email, hash_contrasena, rol FROM usuarios WHERE email = %s AND activo = true",
                (login_data.username,)
            )
            user_db = cur.fetchone()
            
            if user_db and hash_password(login_data.password) == user_db["hash_contrasena"]:
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
        except Exception as e:
            print(f"Error en login PostgreSQL: {e}")
        finally:
            conn.close()
    
    users_db = {
        "empleado@constrefri.com": {
            "id": 1,
            "nombre": "Juan Empleado",
            "password": "empleado123",
            "rol": "empleado"
        },
        "admin@constrefri.com": {
            "id": 2,
            "nombre": "Maria Administradora",
            "password": "admin123",
            "rol": "administrador"
        },
        "dueno@constrefri.com": {
            "id": 3,
            "nombre": "Carlos Dueño",
            "password": "dueno123",
            "rol": "dueño"
        }
    }
    
    user = users_db.get(login_data.username)
    if not user or user["password"] != login_data.password:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    return {
        "token_acceso": f"token_{user['id']}",
        "tipo_token": "bearer",
        "usuario": {
            "id": user["id"],
            "nombre": user["nombre"],
            "email": login_data.username,
            "rol": user["rol"]
        }
    }

@app.post("/usuarios")
def crear_usuario(usuario: UserCreate):
    conn = get_db()
    if not conn:
        raise HTTPException(status_code=500, detail="Error de conexión a PostgreSQL")
    
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("SELECT id FROM usuarios WHERE email = %s", (usuario.email,))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="El email ya existe")
        
        hash_contra = hash_password(usuario.password)
        cur.execute(
            "INSERT INTO usuarios (nombre, email, hash_contrasena, rol) VALUES (%s, %s, %s, %s) RETURNING id, nombre, email, rol",
            (usuario.nombre, usuario.email, hash_contra, usuario.rol)
        )
        
        nuevo_usuario = cur.fetchone()
        conn.commit()
        
        return {
            "id": nuevo_usuario["id"],
            "nombre": nuevo_usuario["nombre"],
            "email": nuevo_usuario["email"],
            "rol": nuevo_usuario["rol"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
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
    except:
        return []
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
async def procesar_cierre_diario(datos: ProcesarCierreRequest, usuario_id: int):
    conn = get_db()
    if not conn:
        raise HTTPException(status_code=500, detail="Error de conexión a PostgreSQL")
    
    try:
        cur = conn.cursor()
        
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
            else:
                cur.execute(
                    "INSERT INTO productos (codigo, nombre, categoria, precio_compra, precio_venta, stock_actual) VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
                    (producto.codigo, producto.nombre, producto.categoria, producto.precio_compra, producto.precio_venta, producto.cantidad)
                )
                producto_id = cur.fetchone()[0]
            
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)