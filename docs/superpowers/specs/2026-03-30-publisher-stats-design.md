# Publisher Statistics & History Design Spec

## Overview
A detailed profile view at `/dashboard/publicadores/[id]/stats` to view participation history and statistics over the last 6 to 12 months for an individual publisher.

## Feature Scope
- UI for visualizing stats (Status, Averages, Month-over-Month comparison, Pioneer List, Raw History Table).
- Application Use Case to determine active, irregular, or inactive status based on participation gaps.
- Infrastructure Repository method to retrieve past reports sorted chronologically.

## Requirements
- **Status Evaluation (Last 6 months)**:
  - Inactive: 0 participation in the last 6 months.
  - Irregular: Missed at least 1 month in the last 6 months.
  - Active: 6 continuous months of participation.
- **Month-to-Month Comparison**: Comparing last reported month vs the one preceding it (e.g., hours increased or decreased).
- **Pioneer Register**: Extracting and displaying months where `trabajo_como_auxiliar = true` or user role was regular pioneer.

## Technical Design
### Domain (`src/core/domain`)
- Define `PublisherStats` interfaces/types grouping `status`, `averages`, `comparisons`, and `history`.
- Add signature `getReportsByUserId(userId: number, limit: number)` to repository interface.

### Application (`src/core/application`)
- `GetPublisherStatsUseCase`: Orchestrates data retrieval and applies the logic to determine status and calculations. 
- *Note on Month Sorting*: Since the database uses string abbreviations ('ENE', 'FEB', etc.) for `mes`, the application layer (or SQL layer via `CASE`) will map these to numerical values to ensure chronologically accurate sorting and comparisons.

### Infrastructure (`src/infrastructure`)
- Map Turso/LibSQL queries to fetch from `informe` filtering by `id_usuario`.

### UI (`src/app`)
- Build completely responsive UI with Next.js App Router Server Components and Tailwind CSS.
