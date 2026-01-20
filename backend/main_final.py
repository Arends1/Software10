import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import hashlib

app = FastAPI(title="El Unificador - PostgreSQL")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

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

DB_CONFIG = {
    "host": "localhost",
    "database": "constrefri_db", 
    "user": "constrefri_user",
    "password": "12345",
    "port": "5432"
}

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def get_db_connection():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        print(f"❌ Error PostgreSQL: {e}")
        return None

def init_database():
    conn = get_db_connection()
    if not conn:
        print("⚠️  No se pudo conectar a PostgreSQL. Usando modo simple.")
        return False
    
    try:
        cur = conn.cursor()
        
        # Verificar si podemos crear tablas (permisos)
        try:
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
            
            # Insertar usuarios con hash SHA256
            usuarios = [
                ("Juan Empleado", "empleado@constrefri.com", hash_password("empleado123"), "empleado"),
                ("Maria Administradora", "admin@constrefri.com", hash_password("admin123"), "administrador"),
                ("Carlos Dueño", "dueno@constrefri.com", hash_password("dueno123"), "dueño")
            ]
            
            for nombre, email, hash_contra, rol in usuarios:
                cur.execute(
                    "INSERT INTO usuarios (nombre, email, hash_contrasena, rol) VALUES (%s, %s, %s, %s) ON CONFLICT (email) DO NOTHING",
                    (nombre, email, hash_contra, rol)
                )
            
            conn.commit()
            print("✅ PostgreSQL inicializado correctamente con SHA256")
            return True
            
        except Exception as e:
            print(f"⚠️  Sin permisos para crear tablas: {e}")
            print("✅ Usando tablas existentes")
            return True
            
    except Exception as e:
        print(f"❌ Error general: {e}")
        return False
    finally:
        if conn:
            conn.close()

# Inicializar base de datos
init_database()

@app.get("/")
def home():
    return {"mensaje": "El Unificador con PostgreSQL"}

@app.post("/auth/login", response_model=TokenResponse)
def login(login_data: LoginRequest):
    conn = get_db_connection()
    
    if conn:
        # Intentar con PostgreSQL
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute(
                "SELECT id, nombre, email, hash_contrasena, rol FROM usuarios WHERE email = %s AND activo = true",
                (login_data.username,)
            )
            user = cur.fetchone()
            
            if user and hash_password(login_data.password) == user["hash_contrasena"]:
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
            print(f"⚠️  Error con PostgreSQL: {e}")
        finally:
            conn.close()
    
    # Fallback a modo simple
    users_db = {
        "empleado@constrefri.com": {"id": 1, "nombre": "Juan Empleado", "password": "empleado123", "rol": "empleado"},
        "admin@constrefri.com": {"id": 2, "nombre": "Maria Administradora", "password": "admin123", "rol": "administrador"},
        "dueno@constrefri.com": {"id": 3, "nombre": "Carlos Dueño", "password": "dueno123", "rol": "dueño"}
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

@app.get("/usuarios")
def obtener_usuarios():
    conn = get_db_connection()
    if not conn:
        return {"usuarios": [], "modo": "simple"}
    
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT id, nombre, email, rol FROM usuarios WHERE activo = true")
        usuarios = cur.fetchall()
        return {"usuarios": usuarios, "modo": "postgresql"}
    except Exception as e:
        return {"usuarios": [], "modo": "error", "detalle": str(e)}
    finally:
        conn.close()

@app.get("/salud-db")
def salud_db():
    conn = get_db_connection()
    if conn:
        try:
            conn.close()
            return {"estado": "conectado", "base_datos": "PostgreSQL"}
        except:
            return {"estado": "conectado", "base_datos": "PostgreSQL"}
    else:
        return {"estado": "simple", "base_datos": "Modo respaldo"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
