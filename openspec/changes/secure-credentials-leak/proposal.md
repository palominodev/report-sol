# Proposal: Secure Credentials Leak

## Intent

Eliminate the client-side Turso credentials leak in the presentation layer. Currently, client component `ListaInformes.tsx` hardcodes the database URL and write-token, exposing them to the frontend bundle and bypassing the Hexagonal Architecture boundaries.

## Scope

### In Scope
- Create `GetInformesUseCase` to handle report retrieval with filter parameters.
- Expose a `GET` handler in `src/app/api/informe/route.ts` utilizing this use case.
- Refactor `src/components/ListaInformes.tsx` to fetch reports and groups via secure API endpoints (`/api/informe` and `/api/grupos`), removing hardcoded credentials.

### Out of Scope
- Adding authentication and role-based access control (RBAC).
- Securing hardcoded secrets in Server Components (will be addressed in a future task).

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- None

## Approach

1. Add a `GET` endpoint to `src/app/api/informe/route.ts` to accept query params (`año`, `mes`, `rol`, `grupo`).
2. Implement `GetInformesUseCase` in `src/core/application/use-cases/` delegating to `TursoInformeRepository.findAllWithUsersFilter`.
3. In `ListaInformes.tsx`, replace direct LibSQL database client queries with async HTTP calls (`fetch`) to `/api/informe` and `/api/grupos`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/ListaInformes.tsx` | Modified | Remove database credentials and replace database calls with API fetches. |
| `src/core/application/use-cases/GetInformesUseCase.ts` | New | Add use case to orchestrate filtered report fetching. |
| `src/core/application/use-cases/index.ts` | Modified | Export `GetInformesUseCase`. |
| `src/app/api/informe/route.ts` | Modified | Add GET method to handle fetch requests from components. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| API fetch fails or is slow | Low | Implement loading states and error handling in the UI. |
| Filter logic mismatch | Low | Rely on the existing, tested `TursoInformeRepository.findAllWithUsersFilter` logic. |

## Rollback Plan

Revert git commit(s) of this refactoring to restore the previous state where the client component queried the database directly. No database schema changes are introduced.

## Dependencies

- None

## Success Criteria

- [ ] No references to Turso URL or database tokens remain in `ListaInformes.tsx`.
- [ ] `ListaInformes.tsx` successfully fetches and filters reports and groups via API routes.
- [ ] Linter (`npm run lint`) and type checking (`npx tsc --noEmit`) pass cleanly.
