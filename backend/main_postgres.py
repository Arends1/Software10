import os
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from passlib.context import CryptContext
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Configuración de PostgreSQL
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/el_unificador_db")

# Crear engine y sesión
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Modelo de Usuario
class Usuario(Base):
    __tablename__ = "usuarios"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    hash_contrasena = Column(String(255), nullable=False)
    rol = Column(String(20), nullable=False)
    activo = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)

# Crear tablas
Base.metadata.create_all(bind=engine)

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

# Dependencia de base de datos
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Crear usuarios de prueba
def crear_usuarios_prueba():
    db = SessionLocal()
    try:
        # Verificar si ya existen usuarios
        usuarios_existentes = db.query(Usuario).count()
        if usuarios_existentes == 0:
            usuarios = [
                Usuario(
                    nombre="Juan Empleado",
                    email="empleado@constrefri.com",
                    hash_contrasena=pwd_context.hash("empleado123"),
                    rol="empleado"
                ),
                Usuario(
                    nombre="Maria Administradora", 
                    email="admin@constrefri.com",
                    hash_contrasena=pwd_context.hash("admin123"),
                    rol="administrador"
                ),
                Usuario(
                    nombre="Carlos Dueño",
                    email="dueno@constrefri.com", 
                    hash_contrasena=pwd_context.hash("dueno123"),
                    rol="dueño"
                )
            ]
            db.add_all(usuarios)
            db.commit()
            print("✅ Usuarios de prueba creados en PostgreSQL")
    except Exception as e:
        print(f"❌ Error creando usuarios: {e}")
    finally:
        db.close()

@app.on_event("startup")
def startup_event():
    crear_usuarios_prueba()

@app.get("/")
def home():
    return {"mensaje": "El Unificador con PostgreSQL - SQLAlchemy"}

@app.post("/auth/login", response_model=TokenResponse)
def login(login_data: LoginRequest, db = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.email == login_data.username, Usuario.activo == True).first()
    
    if not usuario or not pwd_context.verify(login_data.password, usuario.hash_contrasena):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    
    return {
        "token_acceso": f"token_pg_{usuario.id}",
        "tipo_token": "bearer",
        "usuario": {
            "id": usuario.id,
            "nombre": usuario.nombre,
            "email": usuario.email,
            "rol": usuario.rol
        }
    }

@app.get("/usuarios")
def obtener_usuarios(db = Depends(get_db)):
    usuarios = db.query(Usuario).filter(Usuario.activo == True).all()
    return {"usuarios": [
        {"id": u.id, "nombre": u.nombre, "email": u.email, "rol": u.rol} 
        for u in usuarios
    ]}

@app.get("/salud-db")
def salud_db(db = Depends(get_db)):
    try:
        db.execute("SELECT 1")
        return {"estado": "conectado", "base_datos": "PostgreSQL"}
    except Exception as e:
        return {"estado": "error", "detalle": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
