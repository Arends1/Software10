import sqlite3
import hashlib
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime

app = FastAPI(title="El Unificador - SQLite con SHA256")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

# Configuración SQLite
DATABASE_PATH = "el_unificador.db"

def get_db_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password: str) -> str:
    """Hash simple con SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def init_database():
    conn = get_db_connection()
    try:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                hash_contrasena TEXT NOT NULL,
                rol TEXT NOT NULL,
                activo BOOLEAN DEFAULT 1,
                fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Insertar usuarios de prueba con hash SHA256
        usuarios = [
            ("Juan Empleado", "empleado@constrefri.com", hash_password("empleado123"), "empleado"),
            ("Maria Administradora", "admin@constrefri.com", hash_password("admin123"), "administrador"),
            ("Carlos Dueño", "dueno@constrefri.com", hash_password("dueno123"), "dueño")
        ]
        
        for nombre, email, hash_contra, rol in usuarios:
            conn.execute(
                "INSERT OR IGNORE INTO usuarios (nombre, email, hash_contrasena, rol) VALUES (?, ?, ?, ?)",
                (nombre, email, hash_contra, rol)
            )
        
        conn.commit()
        print("✅ Base de datos SQLite inicializada correctamente con SHA256")
        
    except Exception as e:
        print(f"❌ Error inicializando SQLite: {e}")
    finally:
        conn.close()

# Inicializar al inicio
init_database()

@app.get("/")
def home():
    return {"mensaje": "El Unificador con Base de Datos SQLite REAL"}

@app.post("/auth/login", response_model=TokenResponse)
def login(login_data: LoginRequest):
    conn = get_db_connection()
    try:
        cursor = conn.execute(
            "SELECT id, nombre, email, hash_contrasena, rol FROM usuarios WHERE email = ? AND activo = 1",
            (login_data.username,)
        )
        user = cursor.fetchone()
        
        if not user or hash_password(login_data.password) != user["hash_contrasena"]:
            raise HTTPException(status_code=401, detail="Credenciales incorrectas")
        
        return {
            "token_acceso": f"token_db_{user['id']}",
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
    try:
        cursor = conn.execute("SELECT id, nombre, email, rol FROM usuarios WHERE activo = 1")
        usuarios = [dict(row) for row in cursor.fetchall()]
        return {"usuarios": usuarios, "base_datos": "SQLite", "hash": "SHA256"}
    finally:
        conn.close()

@app.get("/salud-db")
def salud_db():
    try:
        conn = get_db_connection()
        conn.execute("SELECT 1")
        conn.close()
        return {"estado": "conectado", "base_datos": "SQLite", "archivo": DATABASE_PATH}
    except Exception as e:
        return {"estado": "error", "detalle": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
