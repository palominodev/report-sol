# Tasks: Secure Credentials Leak

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 180-220 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Secure credentials leak implementation | Single PR | All changes are lightweight and low-risk |

## Phase 1: Foundation/Infrastructure

- [x] 1.1 Add optional `roles?: string` and `notas?: string | null` to `InformeRow` in `src/core/domain/PublisherStats.ts`
- [x] 1.2 Update row mapping in `findAllWithUsersFilter` in `src/infrastructure/persistence/turso-informe.repository.ts` to include `roles` and `notas` fields

## Phase 2: Core/Use Cases

- [x] 2.1 Implement `GetInformesUseCase` in `src/core/application/use-cases/GetInformesUseCase.ts` accepting `año`, `mes`, `rol`, and `grupo` filters
- [x] 2.2 Export `GetInformesUseCase` in `src/core/application/use-cases/index.ts`

## Phase 3: Wiring/API/Client

- [x] 3.1 Add `GET` endpoint in `src/app/api/informe/route.ts` validating parameter types and executing `GetInformesUseCase`
- [x] 3.2 Remove `@libsql/client` import and hardcoded credentials (URL/token) from `src/components/ListaInformes.tsx`
- [x] 3.3 Replace direct DB queries in `src/components/ListaInformes.tsx` with asynchronous `fetch` calls to `/api/informe` and `/api/grupos`

## Phase 4: Testing/Verification

- [x] 4.1 Run typescript compiler check `npx tsc --noEmit` and code linter `npm run lint` to verify types and code syntax
- [x] 4.2 Validate API route responses via curl or manual requests with valid/invalid parameters
- [x] 4.3 Test component data fetching and filtering in the browser to ensure no regressions in list view or group selection

## Phase 5: Cleanup

- [x] 5.1 Remove any unused imports and dead query code from `src/components/ListaInformes.tsx`
