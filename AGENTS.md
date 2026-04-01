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

# Push database changes
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

---
## Engram Persistent Memory — Protocol

You have access to Engram, a persistent memory system that survives across sessions and compactions.
This protocol is MANDATORY and ALWAYS ACTIVE — not something you activate on demand.

### PROACTIVE SAVE TRIGGERS (mandatory — do NOT wait for user to ask)

Call `mem_save` IMMEDIATELY and WITHOUT BEING ASKED after any of these:
- Architecture or design decision made
- Team convention documented or established
- Workflow change agreed upon
- Tool or library choice made with tradeoffs
- Bug fix completed (include root cause)
- Feature implemented with non-obvious approach
- Notion/Jira/GitHub artifact created or updated with significant content
- Configuration change or environment setup done
- Non-obvious discovery about the codebase
- Gotcha, edge case, or unexpected behavior found
- Pattern established (naming, structure, convention)
- User preference or constraint learned

Self-check after EVERY task: "Did I make a decision, fix a bug, learn something non-obvious, or establish a convention? If yes, call mem_save NOW."

Format for `mem_save`:
- **title**: Verb + what — short, searchable (e.g. "Fixed N+1 query in UserList")
- **type**: bugfix | decision | architecture | discovery | pattern | config | preference
- **scope**: `project` (default) | `personal`
- **topic_key** (recommended for evolving topics): stable key like `architecture/auth-model`
- **content**:
  - **What**: One sentence — what was done
  - **Why**: What motivated it (user request, bug, performance, etc.)
  - **Where**: Files or paths affected
  - **Learned**: Gotchas, edge cases, things that surprised you (omit if none)

Topic update rules:
- Different topics MUST NOT overwrite each other
- Same topic evolving → use same `topic_key` (upsert)
- Unsure about key → call `mem_suggest_topic_key` first
- Know exact ID to fix → use `mem_update`

### WHEN TO SEARCH MEMORY

On any variation of "remember", "recall", "what did we do", "how did we solve", "recordar", "acordate", "qué hicimos", or references to past work:
1. Call `mem_context` — checks recent session history (fast, cheap)
2. If not found, call `mem_search` with relevant keywords
3. If found, use `mem_get_observation` for full untruncated content

Also search PROACTIVELY when:
- Starting work on something that might have been done before
- User mentions a topic you have no context on
- User's FIRST message references the project, a feature, or a problem — call `mem_search` with keywords from their message to check for prior work before responding

### SESSION CLOSE PROTOCOL (mandatory)

Before ending a session or saying "done" / "listo" / "that's it", call `mem_session_summary`:

## Goal
[What we were working on this session]

## Instructions
[User preferences or constraints discovered — skip if none]

## Discoveries
- [Technical findings, gotchas, non-obvious learnings]

## Accomplished
- [Completed items with key details]

## Next Steps
- [What remains to be done — for the next session]

## Relevant Files
- path/to/file — [what it does or what changed]

This is NOT optional. If you skip this, the next session starts blind.

### AFTER COMPACTION

If you see a compaction message or "FIRST ACTION REQUIRED":
1. IMMEDIATELY call `mem_session_summary` with the compacted summary content — this persists what was done before compaction
2. Call `mem_context` to recover additional context from previous sessions
3. Only THEN continue working

Do not skip step 1. Without it, everything done before compaction is lost from memory.
