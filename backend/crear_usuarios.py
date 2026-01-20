from app.modelos.base_datos import SesionLocal, Usuario
from app.core.seguridad import obtener_hash_contrasena

def crear_usuarios_prueba():
    bd = SesionLocal()
    try:
        empleado = Usuario(
            nombre='Juan Empleado',
            email='empleado@constrefri.com',
            hash_contrasena=obtener_hash_contrasena('empleado123'),
            rol='empleado'
        )
        
        admin = Usuario(
            nombre='Maria Administradora',
            email='admin@constrefri.com', 
            hash_contrasena=obtener_hash_contrasena('admin123'),
            rol='administrador'
        )
        
        dueno = Usuario(
            nombre='Carlos Dueño',
            email='dueno@constrefri.com',
            hash_contrasena=obtener_hash_contrasena('dueno123'),
            rol='dueño'
        )
        
        bd.add_all([empleado, admin, dueno])
        bd.commit()
        print('Usuarios de prueba creados exitosamente!')
        
    except Exception as e:
        print(f'Error: {e}')
        bd.rollback()
    finally:
        bd.close()

if __name__ == '__main__':
    crear_usuarios_prueba()
