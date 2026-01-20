import http.server
import socketserver
import json

PORT = 8000

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        if self.path == '/':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response = {'mensaje': 'Backend Python HTTP funcionando!'}
            self.wfile.write(json.dumps(response).encode())
        else:
            super().do_GET()
    
    def do_POST(self):
        if self.path == '/auth/login':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            users = {
                'empleado@constrefri.com': {'password': 'empleado123', 'rol': 'empleado', 'nombre': 'Juan Empleado', 'id': 1},
                'admin@constrefri.com': {'password': 'admin123', 'rol': 'administrador', 'nombre': 'Maria Admin', 'id': 2},
                'dueno@constrefri.com': {'password': 'dueno123', 'rol': 'dueño', 'nombre': 'Carlos Dueño', 'id': 3}
            }
            
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            login_data = json.loads(post_data)
            
            username = login_data.get('username')
            password = login_data.get('password')
            
            user = users.get(username)
            if user and user['password'] == password:
                response = {
                    'token_acceso': f'token_{user["id"]}',
                    'tipo_token': 'bearer',
                    'usuario': {
                        'id': user['id'],
                        'nombre': user['nombre'],
                        'email': username,
                        'rol': user['rol']
                    }
                }
            else:
                response = {'detail': 'Credenciales incorrectas'}
            
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(404)
            self.end_headers()

print(f'Iniciando servidor en puerto {PORT}...')
with socketserver.TCPServer(('', PORT), Handler) as httpd:
    print(f'✅ Backend ejecutándose en: http://localhost:{PORT}')
    print('Presiona Ctrl+C para detener')
    httpd.serve_forever()
