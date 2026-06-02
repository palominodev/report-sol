## Exploration: Congregation Reporting Platform Extensions

### Current State
The platform is built as a Next.js 15.3.8 (App Router) project using React 19.0.1, Tailwind CSS v4, and TypeScript.
It operates under a clean **Hexagonal Architecture** structure:
- **Domain Layer (`src/core/domain`)**: Pure logic definitions for users (`User.ts`), database records, repository interfaces (`IInformeRepository`, `IUserRepository`, `IGrupoRepository`), and publisher statistics (`PublisherStats.ts`).
- **Application Layer (`src/core/application/use-cases`)**: Pure business logic workflows (e.g., `GetPublisherStatsUseCase`, `CreateInformeUseCase`).
- **Infrastructure Layer (`src/infrastructure/persistence`)**: Concrete database adapters (`turso-user.repository.ts`, `turso-informe.repository.ts`, etc.) querying Turso/LibSQL databases.
- **Presentation Layer (`src/app` / `src/components`)**: UI components and API routes.

**Key Architecture Issues Identified**:
- **Credentials Leak on Client**: `src/components/ListaInformes.tsx` connects directly to Turso DB with hardcoded secrets (`url` and `token` constants) instead of querying a server-side route or server action. This exposes the database keys on the client-side bundle and bypasses the repository/use-case hexagonal boundaries.

### Affected Areas
- `src/components/ListaInformes.tsx` — Querying DB directly in client-side code with hardcoded credentials; must be refactored to fetch from an API route or server component/action using Hexagonal repositories.
- `src/app/api/` — API routes need security and permission validation once auth is added.
- `src/core/domain/repositories/` — Repository interfaces need extensions to support aggregated reports or filtered analytics.
- `src/infrastructure/persistence/` — Repository implementations need queries for group-level averages, congregation active/inactive ratios, or token-based submissions.

### Approaches

1. **Authentication & Role-Based Access Control (RBAC)** — Restrict access to administrators (Secretary, Coordinator, Group Overseers) and publishers.
   - **Pros**: Secures sensitive publisher activity reports, protects the system against unauthorized deletes/writes, and complies with privacy regulations.
   - **Cons**: Adds complexity in session handling, login page creation, and roles management in DB.
   - **Effort**: Medium

2. **Secure Public Self-Reporting (Token-Based Links)** — Allow publishers to submit their monthly reports via a secure temporary link (e.g. sent by SMS/WhatsApp) without needing a full password/account setup.
   - **Pros**: Reduces manual entry burden for secretaries, prevents general access, and avoids registration/login password fatigue for older users.
   - **Cons**: Requires generating and validating temporary tokens, sending links via communication protocols, and handling token expiration.
   - **Effort**: Medium

3. **Group & Congregation Analytics Dashboard** — Implement aggregated statistics (active/inactive ratio, monthly group average hours/reports) for the coordinator/secretary to view overall congregation progress.
   - **Pros**: Provides visual indicators of the congregation's status, helps track group-level trends, and fits cleanly with existing use cases.
   - **Cons**: Requires designing and coding complex charts (using recharts) and writing aggregated SQL queries.
   - **Effort**: Low/Medium

### Recommendation
I recommend starting with **Authentication & Role-Based Access Control (RBAC)** first, as it is a prerequisite for any secure user-specific features (including self-reporting and analytics access). Concurrently, we **MUST** address the security leakage in `ListaInformes.tsx` by route delegation, ensuring credentials are secure on the server side.

### Risks
- **Leaked Database Secrets**: Client-side bundling of the Turso database token in `ListaInformes.tsx` makes the entire database vulnerable to extraction.
- **Access Control Over-complexity**: Introducing too many roles could complicate route middleware.
- **Older User Usability**: Adding passwords might make the platform hard to use for some publishers, indicating a token-based link approach is better for submissions.

### Ready for Proposal
Yes — The orchestrator should proceed with writing a proposal for securing the Turso credentials first, followed by establishing authentication/authorization pathways.
