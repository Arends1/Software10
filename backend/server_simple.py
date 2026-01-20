import http.server
import socketserver
import json

class SimpleHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'mensaje': 'Backend FUNCIONANDO!'}).encode())
        else:
            super().do_GET()
    
    def do_POST(self):
        if self.path == '/auth/login':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            login_data = json.loads(post_data)
            
            users = {
                'empleado@constrefri.com': {'password': 'empleado123', 'rol': 'empleado', 'nombre': 'Juan Empleado', 'id': 1},
                'admin@constrefri.com': {'password': 'admin123', 'rol': 'administrador', 'nombre': 'Maria Admin', 'id': 2},
                'dueno@constrefri.com': {'password': 'dueno123', 'rol': 'dueño', 'nombre': 'Carlos Dueño', 'id': 3}
            }
            
            user = users.get(login_data['username'])
            if user and user['password'] == login_data['password']:
                response = {
                    'token_acceso': 'token_' + login_data['username'],
                    'tipo_token': 'bearer',
                    'usuario': {
                        'id': user['id'],
                        'nombre': user['nombre'],
                        'email': login_data['username'],
                        'rol': user['rol']
                    }
                }
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(response).encode())
            else:
                self.send_response(401)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'detail': 'Credenciales incorrectas'}).encode())
        else:
            self.send_response(404)
            self.end_headers()

PORT = 8000
with socketserver.TCPServer(('', PORT), SimpleHandler) as httpd:
    print(f'Backend ejecutándose en http://localhost:{PORT}')
    print('Presiona Ctrl+C para detener')
    httpd.serve_forever()
