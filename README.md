# Sistema de Informes de Participación

Este es un sistema web desarrollado con Next.js para la gestión de informes de participación de publicadores y auxiliares en grupos de estudio.

## Características Principales

- Gestión de usuarios (publicadores, auxiliares, regulares)
- Administración de grupos de estudio
- Registro de informes mensuales
- Dashboard con filtros avanzados
- Sistema de roles y permisos

## Estructura de la Base de Datos

### Tablas Principales

#### Usuarios (`usuario`)
- Almacena información de los usuarios del sistema
- Campos principales:
  - `id`: Identificador único
  - `nombre`: Nombre del usuario
  - `apellido`: Apellido del usuario
  - `email`: Correo electrónico
  - `password`: Contraseña (hasheada)
  - `fecha_creacion`: Fecha de registro

#### Grupos (`grupo`)
- Gestiona los grupos de estudio
- Campos principales:
  - `id`: Identificador único
  - `nombre`: Nombre del grupo
  - `fecha_creacion`: Fecha de creación

#### Integrantes (`integrante`)
- Relaciona usuarios con grupos
- Campos principales:
  - `id`: Identificador único
  - `id_usuario`: Referencia al usuario
  - `id_grupo`: Referencia al grupo
  - `rol_en_grupo`: Rol del usuario en el grupo
  - `fecha_ingreso`: Fecha de ingreso al grupo

#### Informes (`informe`)
- Registra los informes mensuales
- Campos principales:
  - `id`: Identificador único
  - `id_usuario`: Referencia al usuario
  - `mes`: Mes del informe
  - `año`: Año del informe
  - `horas`: Horas reportadas
  - `cursos`: Cursos completados
  - `participacion`: Estado de participación
  - `fecha_publicacion`: Fecha de publicación

## Roles del Sistema

1. **Publicador**
   - Puede registrar informes
   - No puede registrar horas
   - Acceso básico al sistema

2. **Auxiliar**
   - Puede registrar informes
   - Puede registrar horas
   - Puede gestionar grupos

3. **Regular**
   - Acceso completo al sistema
   - Puede gestionar todos los aspectos

## Tecnologías Utilizadas

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Base de Datos**: SQLite (Turso)
- **Autenticación**: NextAuth.js
- **Estilos**: Tailwind CSS
- **Tipado**: TypeScript

## Instalación

1. Clonar el repositorio:
```bash
git clone [url-del-repositorio]
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
```bash
cp .env.example .env.local
```

4. Iniciar el servidor de desarrollo:
```bash
npm run dev
```

## Estructura del Proyecto

```
src/
├── app/                    # Rutas de la aplicación
│   ├── dashboard/         # Panel de control
│   ├── grupo/            # Gestión de grupos
│   └── usuario/          # Gestión de usuarios
├── components/            # Componentes reutilizables
├── lib/                   # Utilidades y configuraciones
└── types/                # Definiciones de tipos
```

## Características de la Interfaz

- Diseño responsivo
- Filtros avanzados en el dashboard
- Formularios validados
- Notificaciones en tiempo real
- Gestión de estados de carga
- Navegación intuitiva

## Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.
