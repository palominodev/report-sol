# Design: Secure Credentials Leak

## Technical Approach

Remove all database connection imports (`@libsql/client`), local tokens, and URL constants from client-side component `ListaInformes.tsx`. Instead, delegate all data querying to Next.js API endpoints (`/api/informe` and `/api/grupos`), resolving database connection details entirely on the server-side via environment variables (`TURSO_URL`, `TURSO_TOKEN`). Introduce `GetInformesUseCase` in the application layer to fetch the reports using `IInformeRepository`.

## Architecture Decisions

### Decision: Data Fetching Protocol
| Option | Tradeoff | Decision |
|---|---|---|
| **API Routes** | Requires maintaining api routes, but standard REST approach and decoupling | **Chosen**: Create a GET handler in `/api/informe/route.ts` and fetch groups from existing `/api/grupos` |
| **Server Actions** | Next.js specific coupling, harder to cache and handle clean client state | **Rejected**: API Route is cleaner for standard data fetching |

### Decision: Hexagonal Layer Coupling
| Option | Tradeoff | Decision |
|---|---|---|
| **Use Case Delegation** | Introduces `GetInformesUseCase`, conforming to the clean dependency rule | **Chosen**: Add use case to mediate request to the repository |
| **Direct Repo Call** | Fewer files, but violates Hexagonal rules by skipping application layer | **Rejected**: Violates project's Clean Architecture conventions |

## Data Flow

```text
┌───────────────────────────────────────┐
│     Client: ListaInformes (UI)        │
└───────────┬───────────────────▲───────┘
            │                   │
  GET /api/informe?año=...   200 OK (JSON)
            │                   │
┌───────────▼───────────────────┴───────┐
│      API Route: GET /api/informe      │
└───────────┬───────────────────▲───────┘
            │                   │
     .execute(filters)     InformeRow[]
            │                   │
┌───────────▼───────────────────┴───────┐
│      UseCase: GetInformesUseCase      │
└───────────┬───────────────────▲───────┘
            │                   │
 .findAllWithUsersFilter()  InformeRow[]
            │                   │
┌───────────▼───────────────────┴───────┐
│  Port: IInformeRepository (Interface) │
└───────────┬───────────────────▲───────┘
            │                   │
        delegates           returns
            │                   │
┌───────────▼───────────────────┴───────┐
│ Adapter: TursoInformeRepository       │
└───────────┬───────────────────▲───────┘
            │                   │
        SQL Query            Results
            │                   │
┌───────────▼───────────────────┴───────┐
│            Turso Database             │
└───────────────────────────────────────┘
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/core/application/use-cases/GetInformesUseCase.ts` | Create | Use case to orchestrate report retrieval with filter parameters. |
| `src/core/application/use-cases/index.ts` | Modify | Export `GetInformesUseCase`. |
| `src/core/domain/PublisherStats.ts` | Modify | Add optional `roles` and `notas` fields to `InformeRow` interface. |
| `src/infrastructure/persistence/turso-informe.repository.ts` | Modify | Update mapping in `findAllWithUsersFilter` to map `roles` and `notas` fields. |
| `src/app/api/informe/route.ts` | Modify | Add GET handler to receive query parameters, instantiate the usecase, and return reports. |
| `src/components/ListaInformes.tsx` | Modify | Remove Turso DB client imports and credentials. Use `fetch` to retrieve reports and groups. |

## Interfaces / Contracts

### Use Case DTO
```typescript
export interface GetInformesInput {
  año: number | null;
  mes: string | null;
  rol: string | null;
  grupo: number | null;
}
```

### API Endpoint (`GET /api/informe`)
- **Query Parameters**:
  - `año` (optional, integer)
  - `mes` (optional, string)
  - `rol` (optional, string)
  - `grupo` (optional, integer)
- **Response**: `200 OK` with JSON array of `InformeRow` objects. `400 Bad Request` if `año` or `grupo` parameter parsing fails.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| **Use Case** | Filter parameters delegation | Mock repository and assert correct arguments passed to `findAllWithUsersFilter`. |
| **API Endpoint** | Validation and serialization | Send requests with valid/invalid parameters to `/api/informe` and assert status codes. |
| **UI Component** | Fetching and state updating | Mock browser `fetch` to return stubbed reports and verify correct lists are rendered. |

## Migration / Rollout

No database migrations are required. 

### Rollback Plan
Revert git commit(s) of this change to restore client-side direct database queries.

## Open Questions

None.
