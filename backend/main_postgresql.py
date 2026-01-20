import os
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from passlib.context import CryptContext

app = FastAPI(title="El Unificador - PostgreSQL")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class LoginRequest(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    nombre: str
    email: str
    rol: str

class TokenResponse(BaseModel):
    token_acceso: str
    tipo_token: str
    usuario: UserResponse

# CONFIGURACIÓN POSTGRESQL
DB_CONFIG = {
    "host": "localhost",
    "database": "constrefri_db",
    "user": "constrefri_user",
    "password": "12345",
    "port": "5432"
}

def get_db_connection():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        print(f"❌ Error conectando a PostgreSQL: {e}")
        return None

def init_database():
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        cur = conn.cursor()
        
        cur.execute('''
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                hash_contrasena TEXT NOT NULL,
                rol VARCHAR(20) NOT NULL,
                activo BOOLEAN DEFAULT true,
                fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        cur.execute('''
            CREATE TABLE IF NOT EXISTS auditoria (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER REFERENCES usuarios(id),
                accion VARCHAR(100) NOT NULL,
                tabla_afectada VARCHAR(50),
                registro_id INTEGER,
                detalles TEXT,
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        usuarios = [
            ("Juan Empleado", "empleado@constrefri.com", pwd_context.hash("empleado123"), "empleado"),
            ("Maria Administradora", "admin@constrefri.com", pwd_context.hash("admin123"), "administrador"),
            ("Carlos Dueño", "dueno@constrefri.com", pwd_context.hash("dueno123"), "dueño")
        ]
        
        for nombre, email, hash_contra, rol in usuarios:
            cur.execute(
                "INSERT INTO usuarios (nombre, email, hash_contrasena, rol) VALUES (%s, %s, %s, %s) ON CONFLICT (email) DO NOTHING",
                (nombre, email, hash_contra, rol)
            )
        
        conn.commit()
        print("✅ PostgreSQL inicializado correctamente")
        return True
        
    except Exception as e:
        print(f"❌ Error inicializando PostgreSQL: {e}")
        conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

def registrar_auditoria(usuario_id: int, accion: str, tabla_afectada: str = None, registro_id: int = None, detalles: str = None):
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO auditoria (usuario_id, accion, tabla_afectada, registro_id, detalles) VALUES (%s, %s, %s, %s, %s)",
            (usuario_id, accion, tabla_afectada, registro_id, detalles)
        )
        conn.commit()
    except Exception as e:
        print(f"Error registrando auditoría: {e}")
    finally:
        conn.close()

init_database()

@app.get("/")
def home():
    return {"mensaje": "El Unificador con PostgreSQL - Conectado!"}

@app.post("/auth/login", response_model=TokenResponse)
def login(login_data: LoginRequest):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Error de conexión a la base de datos")
    
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            "SELECT id, nombre, email, hash_contrasena, rol FROM usuarios WHERE email = %s AND activo = true",
            (login_data.username,)
        )
        user = cur.fetchone()
        
        if not user or not pwd_context.verify(login_data.password, user["hash_contrasena"]):
            raise HTTPException(status_code=401, detail="Credenciales incorrectas")
        
        registrar_auditoria(user["id"], "LOGIN", "usuarios", user["id"], f"Usuario {user['email']} inició sesión")
        
        return {
            "token_acceso": f"token_pg_{user['id']}",
            "tipo_token": "bearer",
            "usuario": {
                "id": user["id"],
                "nombre": user["nombre"],
                "email": user["email"],
                "rol": user["rol"]
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error del servidor")
    finally:
        conn.close()

@app.get("/usuarios")
def obtener_usuarios():
    conn = get_db_connection()
    if not conn:
        return {"error": "No hay conexión a PostgreSQL"}
    
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT id, nombre, email, rol FROM usuarios WHERE activo = true")
        usuarios = cur.fetchall()
        return {"usuarios": usuarios}
    finally:
        conn.close()

@app.get("/auditoria")
def obtener_auditoria():
    conn = get_db_connection()
    if not conn:
        return {"error": "No hay conexión a PostgreSQL"}
    
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute('''
            SELECT a.*, u.nombre as usuario_nombre 
            FROM auditoria a 
            LEFT JOIN usuarios u ON a.usuario_id = u.id 
            ORDER BY a.fecha DESC 
            LIMIT 50
        ''')
        auditoria = cur.fetchall()
        return {"auditoria": auditoria}
    finally:
        conn.close()

@app.get("/salud-db")
def salud_db():
    conn = get_db_connection()
    if conn:
        conn.close()
        return {"estado": "conectado", "base_datos": "PostgreSQL"}
    else:
        return {"estado": "error", "base_datos": "No conectado"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
