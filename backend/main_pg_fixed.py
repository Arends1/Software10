import os
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from passlib.context import CryptContext
from datetime import datetime

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

# Configuración PostgreSQL - CONEXIÓN DIRECTA
def get_db_connection():
    try:
        conn = psycopg2.connect(
            host="localhost",
            database="el_unificador_db",
            user="postgres",
            password="password",
            port="5432",
            client_encoding='UTF8'
        )
        return conn
    except Exception as e:
        print(f"❌ Error conectando a PostgreSQL: {e}")
        return None

# Inicializar base de datos
def init_database():
    conn = get_db_connection()
    if not conn:
        print("⚠️  No se pudo conectar a PostgreSQL. Usando modo simulación.")
        return False
    
    try:
        cur = conn.cursor()
        
        # Crear tabla si no existe
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
        
        # Insertar usuarios de prueba
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
        print("✅ Base de datos PostgreSQL inicializada correctamente")
        return True
        
    except Exception as e:
        print(f"❌ Error inicializando PostgreSQL: {e}")
        return False
    finally:
        if conn:
            conn.close()

# Verificar al inicio
init_database()

@app.get("/")
def home():
    return {"mensaje": "El Unificador con PostgreSQL - Conexión Directa"}

@app.post("/auth/login", response_model=TokenResponse)
def login(login_data: LoginRequest):
    conn = get_db_connection()
    if not conn:
        # Modo simulación si no hay PostgreSQL
        usuarios_simulados = {
            "empleado@constrefri.com": {"id": 1, "nombre": "Juan Empleado", "rol": "empleado", "password": "empleado123"},
            "admin@constrefri.com": {"id": 2, "nombre": "Maria Administradora", "rol": "administrador", "password": "admin123"},
            "dueno@constrefri.com": {"id": 3, "nombre": "Carlos Dueño", "rol": "dueño", "password": "dueno123"}
        }
        
        user = usuarios_simulados.get(login_data.username)
        if user and user["password"] == login_data.password:
            return {
                "token_acceso": f"token_sim_{user['id']}",
                "tipo_token": "bearer",
                "usuario": {
                    "id": user["id"],
                    "nombre": user["nombre"],
                    "email": login_data.username,
                    "rol": user["rol"]
                }
            }
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            "SELECT id, nombre, email, hash_contrasena, rol FROM usuarios WHERE email = %s AND activo = true",
            (login_data.username,)
        )
        user = cur.fetchone()
        
        if not user or not pwd_context.verify(login_data.password, user["hash_contrasena"]):
            raise HTTPException(status_code=401, detail="Credenciales incorrectas")
        
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
        return {"usuarios": [], "modo": "simulación"}
    
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT id, nombre, email, rol FROM usuarios WHERE activo = true")
        usuarios = cur.fetchall()
        return {"usuarios": usuarios, "modo": "postgresql"}
    finally:
        conn.close()

@app.get("/salud-db")
def salud_db():
    conn = get_db_connection()
    if conn:
        conn.close()
        return {"estado": "conectado", "base_datos": "PostgreSQL"}
    else:
        return {"estado": "simulación", "base_datos": "Modo de respaldo"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
