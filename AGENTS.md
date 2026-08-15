<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Signal13F typography system

Typography is part of the product's data legibility contract. New UI must use the semantic tokens defined in `src/app/globals.css`; do not introduce text below 10px.

| Level | CSS token | Intended size | Use |
| --- | --- | --- | --- |
| Display | `--type-display` | 42–69px responsive | Page and manager names only |
| Critical | `--type-critical` | 34–46px responsive | Portfolio values, position counts, dates, chart-center totals |
| Section | `--type-section` | 26–32px responsive | `Holdings Allocation`, `Reported Holdings`, source and activity section headings |
| Card title | `--type-card-title` | 26px | Manager names on overview cards |
| Body | `--type-body` | 14px | Explanatory copy and source notes |
| Data | `--type-data` | 13px | Holdings rows, chart legends, values and interactive controls |
| Label | `--type-label` | 11px | Table headers, KPI labels, filters, filing metadata and navigation |
| Metadata | `--type-meta` | 10px minimum | CIKs, table identifiers and secondary captions only |

Rules:

- Critical financial values must never be smaller than 34px on desktop or 30px on mobile.
- Section headings must never be smaller than 26px.
- Holdings table body text and allocation legends must use at least `--type-data`.
- Table headers, filters, search fields and KPI labels must use at least `--type-label`.
- Text at `--type-meta` is supplementary only; never use it for a value required to understand a chart or table.
- Preserve the Bloomberg-style density through spacing, rules and monospace labels—not by shrinking important text.
- Validate desktop and mobile layouts for clipping and horizontal page overflow after typography changes.
