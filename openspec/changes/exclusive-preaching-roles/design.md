# Design: Enforce Single Preaching Role

## Architecture Overview (Hexagonal)

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                       │
│  - FormularioUsuario.tsx (Radio for Preaching, Checks for)  │
│  - /api/usuario routes                                      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│  - CreateUserUseCase (validates role rules + defaults)      │
│  - UpdateUserUseCase (validates role rules + defaults)      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      Domain Layer                           │
│  - User Entity (actualizarRolCongregacion / validation)     │
│  - PreachingRole ('publicador' | 'auxiliar' | 'regular')    │
│  - AppointmentRole ('anciano' | 'siervo' | 'secretario'...) │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Infrastructure Layer                        │
│  - TursoUserRepository                                     │
│  - LibSQL Database Client                                   │
│  - Migration script (scripts/migrate-user-roles.ts)        │
└─────────────────────────────────────────────────────────────┘
```

## Layer Specifications

### 1. Domain Layer (`src/domain/entities/User.ts`)
- Separate types:
  ```typescript
  export type PreachingRole = 'publicador' | 'auxiliar' | 'regular';
  export type AppointmentRole = 'anciano' | 'siervo' | 'secretario' | 'coordinador';
  export type RolCongregacion = PreachingRole | AppointmentRole;
  ```
- Validation function / method in `User`:
  - Exactly one `PreachingRole` allowed.
  - Cannot have both `'anciano'` and `'siervo'`.
  - Max roles validation adjusted to accommodate 1 preaching role + appointments.

### 2. Application Layer
- `CreateUserUseCase` (`src/core/application/use-cases/CreateUserUseCase.ts`):
  - Check if any `PreachingRole` is in `data.roles`.
  - If none, auto-append `'publicador'`.
  - Validate that exactly 1 `PreachingRole` is present (throw `ValidationError` or `Error` if > 1).
  - Validate that `'anciano'` and `'siervo'` are not both present.
- `UpdateUserUseCase` (`src/core/application/use-cases/UpdateUserUseCase.ts`):
  - Same validation rules as creation.

### 3. Infrastructure & Database Layer
- Table `usuario_rol` (`id_usuario`, `id_rol`):
  - No schema modification needed.
- Data Migration (`scripts/migrate-user-roles.ts`):
  - Query all `usuario_rol` records grouped by `id_usuario`.
  - For users with multiple preaching roles (e.g. `publicador,regular`):
    - Priority: `regular` > `auxiliar` > `publicador`.
    - Delete the lower tier role from `usuario_rol`.
  - For users with 0 preaching roles:
    - Insert `id_rol = 1` (`publicador`) into `usuario_rol`.

### 4. Presentation Layer (`src/app/components/FormularioUsuario.tsx`)
- State management:
  - `rolPredicacion`: `'publicador'` | `'auxiliar'` | `'regular'` (single state string, default `'publicador'`).
  - `nombramientos`: `string[]` (array of selected appointments).
- UI Elements:
  - **Rol de Predicación** (Radio group: Publicador, Precursor Auxiliar, Precursor Regular).
  - **Nombramientos** (Checkboxes: Anciano, Siervo Ministerial, Secretario, Coordinador).
- On submit: combines `[rolPredicacion, ...nombramientos]` as the `roles` payload array sent to `/api/usuario`.
