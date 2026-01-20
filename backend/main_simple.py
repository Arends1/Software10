from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="El Unificador - Simple")

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

@app.get("/")
def home():
    return {"mensaje": "Backend Simple funcionando!"}

@app.post("/auth/login", response_model=TokenResponse)
def login(login_data: LoginRequest):
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

@app.get("/salud")
def salud():
    return {"estado": "perfecto", "modo": "simple"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
