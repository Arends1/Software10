from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

users = {
    "empleado@constrefri.com": {"password": "empleado123", "rol": "empleado", "nombre": "Juan Empleado", "id": 1},
    "admin@constrefri.com": {"password": "admin123", "rol": "administrador", "nombre": "Maria Admin", "id": 2},
    "dueno@constrefri.com": {"password": "dueno123", "rol": "dueño", "nombre": "Carlos Dueño", "id": 3}
}

@app.route('/')
def home():
    return jsonify({"mensaje": "Backend FLASK funcionando!"})

@app.route('/auth/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        return '', 200
    
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    user = users.get(username)
    if user and user['password'] == password:
        return jsonify({
            "token_acceso": f"token_{user['id']}",
            "tipo_token": "bearer",
            "usuario": {
                "id": user['id'],
                "nombre": user['nombre'],
                "email": username,
                "rol": user['rol']
            }
        })
    else:
        return jsonify({"detail": "Credenciales incorrectas"}), 401

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=False)
