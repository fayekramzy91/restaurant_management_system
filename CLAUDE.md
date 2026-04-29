# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

**Laravel 11 + React (Inertia.js) + Tailwind CSS v4 + Vite**

There is no separate API layer. The backend renders Inertia responses that hydrate React pages directly. All data flows through controller → `Inertia::render()` → React page props.

## Development Commands

This project runs under MAMP (MySQL on port 8889). The PHP server is MAMP's built-in Apache — `php artisan serve` is not needed in the normal workflow.

```bash
# Frontend dev server (hot reload)
npm run dev

# Production build
npm run build

# Run migrations
php artisan migrate

# Roll back and re-run all migrations
php artisan migrate:fresh
```

**Tests** — PHPUnit is configured but there are no application-level feature tests yet:
```bash
php artisan test
```

## Architecture

### Request lifecycle

Every page load is an Inertia request. `HandleInertiaRequests` middleware shares two props to **every** page automatically:
- `auth.user` — the authenticated user
- `settings` — a flat key→value map from the `settings` table (restaurant name, currency, phone, etc.)

In React, access these via `usePage().props`.

### Controller namespaces

| Namespace | Purpose |
|---|---|
| `App\Http\Controllers\Admin\*` | Admin dashboard: branches, categories, menu items, areas, tables, orders (read-only list), settings, payment methods |
| `App\Http\Controllers\POS\POSController` | Unified POS: index, table order, manage order, create order, checkout, process payment |
| `App\Http\Controllers\POS\OrderController` | Order mutation endpoints: store, addItem, updateItem, updateItemAddons, removeItem, complete |
| `App\Http\Controllers\Kitchen\KitchenController` | Kitchen display screen |

### Route structure

```
/admin/*              Admin CRUD (branches, categories, menu-items, areas, tables, settings)
/admin/orders         Admin orders list — read-only, search/filter/sort/paginate
/pos                  Unified POS — tables tab + orders queue tab
/pos/table/{id}       Manage/create a dine-in order for a table
/pos/order/{id}       Manage an existing order (any type)
/pos/new-order        POST — create a takeaway/delivery order, redirects to /pos/order/{id}
/pos/checkout/{id}    Payment screen
/pos/payment/{id}     POST — process payment
/kitchen              KDS screen
/waiter               Redirects → /pos
/waiter/table/{id}    Redirects → /pos/table/{id}
```

All routes require `auth` + `verified` middleware.

### Order lifecycle

```
pending → preparing (sent to kitchen) → ready (kitchen marks ready) → completed (payment processed)
```

Payment status is separate: `unpaid | partially_paid | paid`. An order can be marked `completed` even if partially paid.

Order types: `dine_in` (requires `table_id`), `takeaway`, `delivery`.

### Menu items & addons

`menu_items` has a boolean `is_addon` flag. Regular items (`is_addon = false`) appear in the ordering grid. Addon items (`is_addon = true`) appear in the addon modal, attached to an `OrderItem` via `order_item_addons`. Both types share the same `menu_items` table and pricing logic.

### Settings

`Setting` model stores key/value pairs. Use `Setting::getValue($key, $default)` to read a single value server-side. Client-side, all settings are available via `usePage().props.settings['key']` on every page.

---

## Two UI layers — Admin vs POS/Kitchen

The codebase intentionally uses **two different UI stacks**. Do not mix them.

### Admin (`resources/js/Pages/Admin/`, `resources/js/Layouts/AdminLayout.jsx`)

Uses **shadcn/ui** components built on Radix UI primitives.

- Component library lives in `resources/js/Components/ui/`: `button`, `badge`, `card`, `dialog`, `input`, `label`, `table`, `separator`, `avatar`, `dropdown-menu`
- `cn()` utility is in `resources/js/lib/utils.js` — always use it for conditional class merging in admin components
- CSS variables for theming are defined in `resources/css/app.css` using `@theme inline` (Tailwind v4 syntax). Primary brand colour `#ee1d23` is mapped to `--primary`
- Tailwind utility classes like `bg-primary`, `text-muted-foreground`, `border-border` all resolve via those CSS variables
- All admin pages share `AdminLayout` which provides the collapsible dark sidebar and sticky header

**Typical admin page pattern:**
```jsx
import { Card } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
// CRUD state, useForm hook, list + modal in a single file
```

### POS & Kitchen (`resources/js/Pages/POS/`, `resources/js/Pages/Kitchen/`)

Uses **custom Tailwind classes only** — no shadcn components, no `cn()`. These screens are used on touch devices at high frequency so they must stay lightweight.
- Brand colours used as Tailwind arbitrary values: `bg-[#ee1d23]`, `bg-[#6f272a]`
- Animations via `framer-motion`
- Icons via `lucide-react`
- `dir="rtl"` on the root container, `font-Cairo` on the page root

---

## UI Conventions (shared)

- All UI is Arabic RTL
- Brand colours: `#ee1d23` (primary red), `#6f272a` (dark red), `#feca0b` (accent yellow)
- Icons: `lucide-react` throughout
- The `@` path alias resolves to `resources/js/`

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
