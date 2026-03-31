# Agent Skills Registry

## User Skills

- **branch-pr**: PR creation workflow for Agent Teams Lite following the issue-first enforcement system
- **go-testing**: Go testing patterns for Gentleman.Dots, including Bubbletea TUI testing
- **sdd-init**: Initialize Spec-Driven Development context in any project
- **sdd-design**: Create technical design document with architecture decisions and approach
- **sdd-spec**: Write specifications with requirements and scenarios (delta specs for changes)
- **issue-creation**: Issue creation workflow for Agent Teams Lite following the issue-first enforcement system
- **sdd-apply**: Implement tasks from the change, writing actual code following the specs and design
- **sdd-propose**: Create a change proposal with intent, scope, and approach
- **judgment-day**: Parallel adversarial review protocol that launches two independent blind judge sub-agents simultaneously to review the same target
- **skill-creator**: Creates new AI agent skills following the Agent Skills spec
- **sdd-archive**: Sync delta specs to main specs and archive a completed change
- **sdd-verify**: Validate that implementation matches specs, design, and tasks
- **sdd-explore**: Explore and investigate ideas before committing to a change
- **sdd-tasks**: Break down a change into an implementation task checklist

## Project Skills

*No project-specific skills found*

## Convention Files

- AGENTS.md - Repository guidelines and available skills
- .agents/skills/brainstorming/SKILL.md - Explore intent and design BEFORE implementation
- .agents/skills/clean-ddd-hexagonal/SKILL.md - Domain Driven Design, Hexagonal patterns, Ports & Adapters
- .agents/skills/sqlite-database-expert/SKILL.md - Expert in SQL queries, indexing, and Turso/libsql optimization
- .agents/skills/typescript-advanced-types/SKILL.md - Advanced TS type system (generics, mapped types, conditional types)
- .agents/skills/vercel-react-best-practices/SKILL.md - React 19 & Next.js 15 performance optimization (Vercel engineering)
- .agents/skills/web-design-guidelines/SKILL.md - UI/UX auditing, accessibility, and modern design standards
- .agents/skills/skill-creator/SKILL.md - Create, modify, and optimize AI agent skills
- .agents/skills/git-commit/SKILL.md - Execute git commit with conventional commit message analysis, intelligent staging, and message generation

## Auto-invoke Skills Triggers

| Action | Skill |
|--------|-------|
| Designing Domain Entities, Ports, or Use Cases | `clean-ddd-hexagonal` |
| Implementing Repositories or writing SQL with LibSQL | `sqlite-database-expert` |
| Creating or refactoring complex TypeScript types/interfaces | `typescript-advanced-types` |
| Creating/modifying Next.js Server Components or Server Actions | `vercel-react-best-practices` |
| Building or reviewing UI components and layouts | `web-design-guidelines` |
| Planning a new feature or complex refactoring | `brainstorming` |
| Drafting or updating agent skills | `skill-creator` |