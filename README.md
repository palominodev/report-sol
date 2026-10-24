# Sistema de Informes de Participación

Este es un sistema web desarrollado con Next.js para la gestión de informes de participación de publicadores y auxiliares en grupos de estudio.

## Características Principales

- Gestión de usuarios (publicadores, auxiliares, regulares)
- Administración de grupos de estudio
- Registro de informes mensuales
- Dashboard con filtros avanzados
- Sistema de roles y permisos

## Asignaciones de la reunión

En `/asignaciones`, abrí una semana para generar, revisar y confirmar sus asignaciones.

La página semanal completa reutiliza el [diseño de la vista principal](file:///home/palominodev/Proyectos/report-sol/design-system/report-sol/MASTER.md): fondo oscuro, paneles planos, bordes rectos y acentos azules, incluidos formularios, mensajes y diálogos. El programa imprimible comparte el tema oscuro en pantalla; al imprimir o guardar como PDF, usa fondo blanco y texto oscuro y oculta la navegación de salas y el enlace de vuelta. En móvil, las tarjetas del historial se ajustan al ancho disponible y la barra horizontal acompaña el tema oscuro.
Las acciones están debajo del título; sus mensajes aparecen en un área separada.

Cada persona asignada muestra su **Historial de asignaciones**, con todas las semanas anteriores en una fila horizontal, de la más reciente a la más antigua. Si no entran, podés desplazarte horizontalmente dentro del recuadro. Al hacer clic en una fecha se cargan y despliegan la parte, el rol y la sala de esa asignación; los detalles no se descargan al abrir la semana. Podés cerrar y volver a abrir una entrada ya cargada sin otra petición. Si falla la carga, aparece un mensaje con **Reintentar**. Al elegir un reemplazo se muestra también su historial antes de pulsar **Asignar**.

Se incluyen todas las asignaciones confirmadas o manuales de semanas anteriores a la que estás preparando, sin límite de antigüedad; no se cuentan borradores ni esa semana ni las posteriores. Si no hay datos, aparece **Sin antecedentes registrados**; si se desconoce la sala histórica, **Sala no registrada**. Son asignaciones registradas, no una confirmación de asistencia. Las reglas de generación no cambian.

Los detalles se consultan con `GET /api/asignaciones/semana/:id/historial/:assignmentId`: devuelve `200` con parte, rol, sala e identificadores/fechas; `400` para identificadores inválidos; `404` para semanas inexistentes o asignaciones fuera del historial; y `500` ante un fallo. Es una consulta de solo lectura.

- **Generar / Regenerar:** propone asignaciones automáticas y conserva las manuales.
- **Descartar generación:** abre un diálogo dentro de la página con **Cancelar** y **Eliminar asignaciones**. Cancelar o presionar Escape cierra el diálogo sin borrar. Confirmar elimina **todas** las asignaciones de esa semana y ambas salas, incluidas las manuales y las confirmadas. Conserva las partes y sus salas y devuelve la semana a **No generada**. No se puede deshacer; volver a generar no recupera las elecciones manuales anteriores.
- **Ver programa imprimible:** abre el programa para imprimir.
- **Confirmar semana:** confirma cuando todos los lugares están cubiertos.

La API de descarte es `DELETE /api/asignaciones/semana/:id/descartar`: devuelve `200 { discarded: number }`, `400` si el identificador no es un entero positivo seguro, `404` si no existe la semana y `500` ante un fallo. La eliminación y el cambio de estado se ejecutan en una única transacción; un fallo no deja un descarte parcial.

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

## Acceso y cuentas

Toda la aplicación (páginas y API) exige iniciar sesión. Sin sesión solo se ve `/login`.

- Cada persona tiene su propio usuario y contraseña. Hay dos tipos de cuenta: **administrador** y **normal**.
- Solo los administradores ven la pantalla **Cuentas** (`/dashboard/cuentas`), donde crean y desactivan cuentas. Desactivar una cuenta le corta el acceso al instante y cierra sus sesiones. El último administrador activo no se puede desactivar.
- La sesión dura 7 días. Se cierra con **Cerrar sesión** en la barra superior del dashboard.
- No hay recuperación de contraseña por correo: la restablece una persona con acceso a la terminal (ver abajo).

### Crear la primera cuenta administradora

La primera cuenta se crea una sola vez desde la terminal, después de aplicar el esquema (`pnpm db:push`):

```bash
pnpm account create <usuario>
```

La contraseña (mínimo 10 caracteres) se pide por teclado, sin mostrarla, y nunca se pasa como argumento para que no quede en el historial del shell. Si no existe ninguna cuenta, la primera es administradora; usá `--role administrador|normal` para elegir.

### Restablecer una contraseña olvidada

```bash
pnpm account reset-password <usuario>
```

Cambia la contraseña y cierra todas las sesiones abiertas de esa cuenta.

### Base de datos de destino

Por defecto el comando usa la base local (`data/local.db`). Para producción hay que pasar `--prod` explícitamente: usa `TURSO_URL` y `TURSO_TOKEN` de `.env`, muestra el destino y pide escribir `yes` antes de escribir. Para uso no interactivo, la contraseña puede venir de la variable de entorno `ACCOUNT_PASSWORD`.

### Notas de despliegue

- En producción la cookie de sesión se marca `Secure`: el navegador solo la envía por **HTTPS**. Detrás de HTTP plano (por ejemplo `docker compose` en `http://localhost:3000` o una IP de red local) no se puede iniciar sesión. Poné un proxy con HTTPS delante.
- Las tablas `cuenta` y `sesion` se crean con `pnpm db:push` (local) o `pnpm db:push --prod`.

## Tecnologías Utilizadas

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Base de Datos**: SQLite (Turso)
- **Autenticación**: sesiones propias con cookie (ver [Acceso y cuentas](#acceso-y-cuentas))
- **Estilos**: Tailwind CSS
- **Tipado**: TypeScript

## Instalación

> Este proyecto usa **pnpm** como gestor de paquetes. Instalalo con `curl -fsSL https://get.pnpm.io/install.sh | sh -`.

1. Clonar el repositorio:
```bash
git clone [url-del-repositorio]
```

2. Instalar dependencias:
```bash
pnpm install
```

3. Configurar variables de entorno:
```bash
cp .env.example .env.local
```

4. Iniciar el servidor de desarrollo:
```bash
pnpm dev
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
