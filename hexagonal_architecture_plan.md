# Plan de Implementación: Arquitectura Hexagonal

Este plan detalla los pasos para refactorizar la base de código actual hacia una **Arquitectura Hexagonal (Puertos y Adaptadores)**. El objetivo es desacoplar la lógica de negocio del acceso a datos (Turso) y del framework (Next.js).

## 1. Nueva Estructura de Directorios

Se reorganizará la carpeta `src/` de la siguiente manera:

```text
src/
├── core/                # El "Hexágono" central
│   ├── domain/          # Entidades y Puertos (Interfaces)
│   │   ├── entities/    # Lógica de datos pura (User, Grupo, etc.)
│   │   └── repositories/ # Puerto de salida: Interfaces de base de datos
│   └── application/     # Casos de Uso (Lógica de negocio orquestada)
│       ├── use-cases/   # CreateUser, GetGroups, etc.
│       └── services/    # Servicios de apoyo (opcional)
├── infrastructure/      # Adaptadores de salida
│   ├── persistence/     # Implementaciones concretas de repositorios (Turso)
│   └── external-apis/   # Otros servicios externos
├── app/                 # Adaptador de entrada (Next.js Framework)
│   ├── api/             # Controladores que invocan Casos de Uso
│   └── (routes)/        # Componentes de UI
└── components/          # UI puramente visual
```

---

## 2. Fases de Ejecución

### Fase 1: Configuración de Infraestructura y Seguridad
> [!IMPORTANT]
> Antes de mover código, debemos resolver la exposición de credenciales detectada.
- [ ] Crear archivo `.env.local` con `TURSO_URL` y `TURSO_TOKEN`.
- [ ] Crear un `infrastructure/persistence/database.client.ts` centralizado que use las variables de entorno.

### Fase 2: Definición del Dominio (Puertos)
- [ ] Aprovechar las entidades existentes en `src/domain/entities`.
- [ ] Definir interfaces de repositorio en `src/core/domain/repositories/`:
    - `IUserRepository`: `create`, `findById`, `update`, etc.
    - `IGrupoRepository`: `findAll`, `findById`, etc.

### Fase 3: Implementación de Adaptadores (Infraestructura)
- [ ] Mover la lógica de SQL de `route.ts` y `lib/` a implementaciones concretas:
    - `infrastructure/persistence/turso-user.repository.ts`
    - `infrastructure/persistence/turso-grupo.repository.ts`

### Fase 4: Creación de Casos de Uso (Aplicación)
- [ ] Crear clases o funciones que encapsulen la lógica de negocio sin depender de Turso.
    - Ejemplo: `CreateUserUseCase` recibirá un `IUserRepository` por inyección de dependencias.

### Fase 5: Refactorización de Capa de Entrada (Next.js)
- [ ] **API Routes**: Cambiar el código de `src/app/api/.../route.ts` para que solo instancie el repositorio y ejecute el Caso de Uso.
- [ ] **Server Components**: Refactorizar `src/app/page.tsx` para que use el Caso de Uso (o el repositorio directamente si es una consulta simple de lectura).

---

## 3. Ejemplo de Refactorización (Caso de Uso: Crear Usuario)

### Antes (Mezclado en `route.ts`):
```typescript
// src/app/api/usuario/route.ts
const client = createClient({ ... });
await client.execute('INSERT INTO usuario ...');
await client.execute('INSERT INTO grupo_usuario ...');
```

### Después (Casos de Uso):

#### 1. Puerto (Interface)
```typescript
interface IUserRepository {
  save(user: User): Promise<void>;
  assignToGroup(userId: number, groupId: number, role: string): Promise<void>;
}
```

#### 2. Caso de Uso
```typescript
class CreateUserUseCase {
  constructor(private userRepo: IUserRepository) {}
  
  async execute(data: CreateUserDTO) {
    const user = new User(data);
    await this.userRepo.save(user);
    await this.userRepo.assignToGroup(user.id, data.groupId, data.role);
  }
}
```

#### 3. Adaptador de Entrada (Next.js)
```typescript
export async function POST(req: Request) {
  const data = await req.json();
  const repo = new TursoUserRepository(); // Adaptador de salida
  const useCase = new CreateUserUseCase(repo);
  await useCase.execute(data);
  return NextResponse.json({ success: true });
}
```

---

## 4. Beneficios Esperados
1. **Seguridad**: Centralización de acceso a datos y fin de las credenciales hardcodeadas.
2. **Testeabilidad**: Se podrán hacer tests unitarios de la lógica de negocio (Casos de Uso) usando *mocks* de la base de datos.
3. **Mantenibilidad**: Si decidimos cambiar Turso por PostgreSQL en el futuro, solo cambiaremos un archivo en la capa de `infrastructure`, sin tocar la lógica de negocio.

> [!NOTE]
> Este plan puede ejecutarse de forma incremental para no romper la funcionalidad actual del proyecto.
