# Login for /dashboard
Branch: feat/login-dashboard. Whole app behind login, accounts managed in-app by admins.
Stack: Next.js 15 (App Router), libsql/Turso, hexagonal (core/domain, core/application, infrastructure, app).

## Specs
- S1: "Varias cuentas, cada una con su acceso" — each person has their own username and password.
- S2: "Proteger todo, incluida Asignaciones" — dashboard, publicadores, grupos, asignaciones, informes AND their /api routes require a session; without one only the login screen is reachable (pages redirect to login, APIs answer 401).
- S3: "Con una pantalla dentro de la aplicación" — accounts are created and deactivated from an in-app screen.
- S4: "Solo administradores (recomendado)" — two account types (administrador, normal); only administrators see and use the accounts screen; the first administrator is created once with a command at install time.
- S5: "Se cambia a mano, sin pantalla (Recomendado)" — forgotten password: reset by hand with a command, no self-service recovery screen, no email.
- S6: Deactivating an account must cut access (no valid session survives deactivation).

## Tasks
- T1 (S1,S6) Account + session persistence, password hashing, tests — route: inline — commit: af84f1c
- T2a (S1,S6) Login/logout/validate use cases + token service — route: inline — commit: 00707a5
- T2b (S1,S6) DI wiring, session cookie, /api/auth routes — route: inline — commit: 7bbd582
- T2c (S1) /login page + browser check — route: inline — commit: ee9c52b (code only; browser check pending, needs T5b account)
- T3a (S2) Shared guards (access policy, withAuth, requireAccount) + structural tests that fail on any unguarded route/page — route: inline — commit: 42941b4 (guards); structural test lands with T3b/T3c
- T3b (S2) Guard the 18 non-auth /api routes, adapt existing route tests — route: worker (disjoint surface: src/app/api) — commit: c35664d
- T3c (S2) Guard pages (server: requireAccount; client: guarded section layout) and wire the fast cookie gate (middleware) — route: worker — commit: 67aaba4
- T3d (S2) Independent security verification + differential check vs base — route: gentle-ai-verify (Risk items 2,3) — commit: n/a
- T4a (S3,S4,S6) Deactivate/reactivate use cases, last-active-admin rule — route: inline — commit: 4029070
- T4b (S3,S4) /api/cuentas routes (withAuth role administrador) + DI wiring — route: inline, after T3b releases src/app/api — commit: dcef3ff
- T4c (S3,S4) Accounts screen (admin only) — route: inline, after T3c — commit: pending
- T5a (S3,S4,S5) Create-account and reset-password use cases — route: inline — commit: e771593
- T5b (S4,S5) Terminal command: first admin / reset password — route: inline — commit: 2c123a8
- T6 (S1-S6) Schema in src/db.sql, .env.example, docs, end-to-end check — route: inline — commit: pending

## Slices
- Slice 1: T1 (af84f1c, 484 lines incl. feature doc and tests) — past the ~400 guide; boundary recorded here, later tasks start slice 2.
- Slice 2: T2a (00707a5) + T2b (7bbd582), ~600 authored lines incl. tests; boundary recorded, T2c starts slice 3.
- Slice 3: T2c code (ee9c52b) + T5a (e771593), ~330 authored lines incl. tests; boundary recorded, T5b starts slice 4.
- Slice 6: T4b (dcef3ff); T4c, T3d findings, T6 follow in slice 7.
- Slice 5: T3c (67aaba4) + T3b (c35664d); T3d verification, T4b/T4c, T6 start slice 6.
- Slice 4: T5b (2c123a8) + T3a guards (42941b4) + T4a (4029070); T3b/T3c/T4b/T4c start slice 5.

## Log
- L1: "vamos a crear un login para iniciar sesión en /dashboard"
- L2: Q "¿Quién va a iniciar sesión en el dashboard?" -> "Varias cuentas, cada una con su acceso"
- L3: Q "¿Qué querés que quede detrás del login?" -> "Solo /dashboard y lo que cuelga de él", later revised to "Proteger todo, incluida Asignaciones" (latter wins; datos de personas quedan expuestos por /api si no).
- L4: Q "¿Qué pasa si alguien olvida su contraseña?" -> "Se cambia a mano, sin pantalla (Recomendado)"
- L5: Q "¿Cómo querés dar de alta y baja a las cuentas?" -> "Con una pantalla dentro de la aplicación"
- L6: Q "¿Quién puede crear y desactivar cuentas?" -> "Solo administradores (recomendado)"
- Note: applying the new tables to production Turso (db:push --prod) is NOT authorized yet; ask before doing it.
- L7 (design, agent): two layers. (1) Edge middleware = cookie-presence gate only (no DB in Edge on Next 15.3): pages without cookie redirect to /login?next=<path>, /api without cookie answer 401; public = /login, /api/auth/login, /api/auth/logout, static assets. (2) The real check is server-side: withAuth(handler) on every route (401 no session, 403 wrong role, 500 fail-closed if validation errors) and requireAccount() on server pages; client pages sit under a section layout that calls requireAccount(). Structural tests scan src/app and fail on any unguarded route.ts / page.tsx. Server pages must self-guard (layouts and pages render in parallel in Next).
