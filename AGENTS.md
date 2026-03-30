# Repository Guidelines

## How to Use This Guide

- Start here for project-specific norms and development workflows.
- `report_sol` follows **Hexagonal Architecture** principles.
- Use the available skills to ensure consistency across the codebase.

---

## Available Skills

Use these skills for detailed patterns on-demand:

### Core Architecture & Logic
| Skill | Description | URL |
|-------|-------------|-----|
| `clean-ddd-hexagonal` | Domain Driven Design, Hexagonal patterns, Ports & Adapters | [.agents/skills/clean-ddd-hexagonal/SKILL.md](.agents/skills/clean-ddd-hexagonal/SKILL.md) |
| `sqlite-database-expert` | Expert in SQL queries, indexing, and Turso/libsql optimization | [.agents/skills/sqlite-database-expert/SKILL.md](.agents/skills/sqlite-database-expert/SKILL.md) |
| `typescript-advanced-types`| Advanced TS type system (generics, mapped types, conditional types) | [.agents/skills/typescript-advanced-types/SKILL.md](.agents/skills/typescript-advanced-types/SKILL.md) |

### UI & Frontend Performance
| Skill | Description | URL |
|-------|-------------|-----|
| `vercel-react-best-practices` | React 19 & Next.js 15 performance optimization (Vercel engineering) | [.agents/skills/vercel-react-best-practices/SKILL.md](.agents/skills/vercel-react-best-practices/SKILL.md) |
| `web-design-guidelines` | UI/UX auditing, accessibility, and modern design standards | [.agents/skills/web-design-guidelines/SKILL.md](.agents/skills/web-design-guidelines/SKILL.md) |

### Workflow & Planning
| Skill | Description | URL |
|-------|-------------|-----|
| `brainstorming` | Explore intent and design BEFORE implementation | [.agents/skills/brainstorming/SKILL.md](.agents/skills/brainstorming/SKILL.md) |
| `skill-creator` | Create, modify, and optimize AI agent skills | [.agents/skills/skill-creator/SKILL.md](.agents/skills/skill-creator/SKILL.md) |

---

## Auto-invoke Skills

When performing these actions, ALWAYS invoke the corresponding skill FIRST:

| Action | Skill |
|--------|-------|
| Designing Domain Entities, Ports, or Use Cases | `clean-ddd-hexagonal` |
| Implementing Repositories or writing SQL with LibSQL | `sqlite-database-expert` |
| Creating or refactoring complex TypeScript types/interfaces | `typescript-advanced-types` |
| Creating/modifying Next.js Server Components or Server Actions | `vercel-react-best-practices` |
| Building or reviewing UI components and layouts | `web-design-guidelines` |
| Planning a new feature or complex refactoring | `brainstorming` |
| Drafting or updating agent skills | `skill-creator` |

---

## Project Overview

`report_sol` is a web application built with a modern stack focusing on clean code and performance.

| Component | Location | Tech Stack |
|-----------|----------|------------|
| Core Logic | `src/core/` | Hexagonal Architecture (Domain & Application) |
| Persistence | `src/infrastructure/` | Turso (libsql/SQLite) |
| UI/API | `src/app/` | Next.js 15 (App Router), React 19, Tailwind CSS 4 |

### Architectural Layers
- **`src/core/domain`**: Pure business logic (Entities and Repository Interfaces).
- **`src/core/application`**: Orchestrated business logic (Use Cases).
- **`src/infrastructure`**: Concrete implementations of external tools (DB Client, Repositories).
- **`src/app`**: Entry points (API Routes and Next.js Pages).

---

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run linting
npm run lint

# Build for production
npm run build

# Run seed
npm run db:seed


npm run db:push

```


---

## Commit & Pull Request Guidelines

Follow conventional-commit style: `<type>(scope): <description>`

**Types:** `feat`, `fix`, `docs`, `chore`, `perf`, `refactor`, `style`, `test`

Before finalizing changes:
1. Ensure the Hexagonal Architecture boundaries are respected.
2. Run `npm run lint` to catch stylistic or type issues.
3. Validate database changes against `sqlite-database-expert` guidelines.
