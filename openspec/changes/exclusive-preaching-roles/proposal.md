# Proposal: Enforce Single Preaching Role

## Intent

Enforce mutual exclusivity among preaching roles (`publicador`, `auxiliar`, `regular`). A user MUST have exactly one preaching role (defaulting to `publicador`), while service appointments (`anciano`, `siervo`, `secretario`, `coordinador`) remain optional and configurable under existing domain constraints.

## Scope

### In Scope
- **Domain Layer**: Formalize role categories (Preaching Tier vs. Service Appointments) within the `User` domain model and domain validation logic.
- **Application Layer**: Validate role exclusivity and default rules in `CreateUserUseCase` and `UpdateUserUseCase`.
- **Presentation Layer**: Refactor `FormularioUsuario.tsx` to present preaching roles as mutually exclusive radio buttons (defaulting to `publicador`) and appointments as checkboxes.
- **Data Cleanup & Migration**: Execute a data migration script to clean up legacy mixed roles in `usuario_rol` (prioritizing `regular` > `auxiliar` > `publicador`) and assign `publicador` to users with no preaching role.

### Out of Scope
- Redesigning the underlying database schema table `usuario_rol` (persists relational mapping).
- Modifying reporting logic or export queries unless directly impacted by role mapping.

## Capabilities

### New Capabilities
- Domain and UI enforcement of single preaching role selection per user.
- Automatic fallback/defaulting to `publicador` when no preaching role is selected.

### Modified Capabilities
- `CreateUserUseCase` and `UpdateUserUseCase` reject payloads with multiple or zero preaching roles.
- `FormularioUsuario` UI explicitly separates Preaching Roles (Radio Group) from Congregational Appointments (Checkboxes).

## Approach

1. **Domain Definition**:
   - Categorize roles:
     - `PreachingRole`: `'publicador' | 'auxiliar' | 'regular'` (exactly 1 required).
     - `AppointmentRole`: `'anciano' | 'siervo' | 'secretario' | 'coordinador'` (0 or more, with anciano/siervo mutual exclusivity).
   - Add explicit validation in `User` domain entity.

2. **Application Layer**:
   - Update `CreateUserUseCase` and `UpdateUserUseCase` to validate role constraints before persistence.
   - If payload lacks a preaching role, auto-assign `'publicador'`.

3. **Data Migration**:
   - Run migration script on Turso:
     - For users with multiple preaching roles, retain highest tier (`regular` > `auxiliar` > `publicador`).
     - For users with zero preaching roles (e.g. elders only), insert `'publicador'`.

4. **UI Refactoring**:
   - In `FormularioUsuario.tsx`, display:
     - "Rol de Predicación" as a Radio Group (pre-selected to `publicador`).
     - "Nombramientos / Responsabilidades" as Checkboxes.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/domain/entities/User.ts` | Modified | Update role validation rules and types. |
| `src/core/application/use-cases/CreateUserUseCase.ts` | Modified | Add role exclusivity and defaulting validation. |
| `src/core/application/use-cases/UpdateUserUseCase.ts` | Modified | Add role exclusivity and defaulting validation. |
| `src/app/components/FormularioUsuario.tsx` | Modified | Split role UI into Preaching Role (radios) and Appointments (checkboxes). |
| `scripts/migrate-user-roles.ts` | New | Cleanup existing mixed roles and assign default preaching roles in DB. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Existing reports or queries break if role string format changes | Low | Keep identical string identifiers in DB (`'publicador'`, `'auxiliar'`, `'regular'`). |
| Data inconsistency during transition | Low | Execute data cleanup script before or with code deployment. |

## Rollback Plan

1. Revert UI and UseCase changes via Git commits.
2. In case of migration issues, re-run role associations as needed.

## Success Criteria

- [ ] Every user in the database has exactly one preaching role (`publicador`, `auxiliar`, or `regular`).
- [ ] UI does not allow selecting more than one preaching role.
- [ ] Use cases throw validation errors if multiple preaching roles are submitted.
- [ ] Linter (`pnpm lint`) and type checks (`pnpm exec tsc --noEmit`) pass.
