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
- T2c (S1) /login page + browser check — route: inline — commit: pending
- T3 (S2) Guard all pages and /api routes (middleware + server check) — route: inline — commit: pending
- T4 (S3,S4) Accounts admin screen + API, admin-only — route: inline — commit: pending
- T5 (S4,S5) Command: create first admin / reset password — route: inline — commit: pending
- T6 (S1-S6) Schema in src/db.sql, .env.example, docs, end-to-end check — route: inline — commit: pending

## Slices
- Slice 1: T1 (af84f1c, 484 lines incl. feature doc and tests) — past the ~400 guide; boundary recorded here, later tasks start slice 2.

## Log
- L1: "vamos a crear un login para iniciar sesión en /dashboard"
- L2: Q "¿Quién va a iniciar sesión en el dashboard?" -> "Varias cuentas, cada una con su acceso"
- L3: Q "¿Qué querés que quede detrás del login?" -> "Solo /dashboard y lo que cuelga de él", later revised to "Proteger todo, incluida Asignaciones" (latter wins; datos de personas quedan expuestos por /api si no).
- L4: Q "¿Qué pasa si alguien olvida su contraseña?" -> "Se cambia a mano, sin pantalla (Recomendado)"
- L5: Q "¿Cómo querés dar de alta y baja a las cuentas?" -> "Con una pantalla dentro de la aplicación"
- L6: Q "¿Quién puede crear y desactivar cuentas?" -> "Solo administradores (recomendado)"
- Note: applying the new tables to production Turso (db:push --prod) is NOT authorized yet; ask before doing it.
