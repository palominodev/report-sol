# Tasks: Enforce Single Preaching Role

## Phase 1: Domain & Application Core

- [x] **1.1** Update `User.ts` domain entity types (`PreachingRole`, `AppointmentRole`) and validation logic.
- [x] **1.2** Add domain validation logic in `CreateUserUseCase.ts` (enforce 1 preaching role, default to `publicador`, disallow incompatible appointments).
- [x] **1.3** Add domain validation logic in `UpdateUserUseCase.ts` (same rules).

## Phase 2: Database Data Migration

- [x] **2.1** Create migration script `scripts/migrate-user-roles.ts` to cleanup mixed roles (prioritizing `regular` > `auxiliar` > `publicador`) and populate missing `publicador` roles.
- [x] **2.2** Run `scripts/migrate-user-roles.ts` against database and verify 0 mixed preaching roles remain.

## Phase 3: Presentation / UI

- [x] **3.1** Refactor `FormularioUsuario.tsx` to separate Preaching Roles (Radio buttons) and Appointments (Checkboxes).
- [x] **3.2** Verify user creation and user editing workflows in UI.

## Phase 4: Quality & Verification

- [x] **4.1** Run `pnpm lint` and `pnpm exec tsc --noEmit` to ensure type safety and code quality.
- [x] **4.2** Run unit tests (`pnpm test`) to verify domain/application layer invariants.

