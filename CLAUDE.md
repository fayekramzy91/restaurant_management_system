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

# Roll back and re-run all migrations + re-seed
php artisan migrate:fresh --seed

# Seed roles, permissions, and default admin user only
php artisan db:seed --class=RolePermissionSeeder
```

**Tests** — PHPUnit is configured but there are no application-level feature tests yet:
```bash
php artisan test
```

## Architecture

### Request lifecycle

Every page load is an Inertia request. `HandleInertiaRequests` middleware shares these props to **every** page automatically:
- `auth.user` — id, name, username, email, is_active, `role{name, display_name}`, `branch{id, name}`, `permissions` (flat string array of permission keys)
- `settings` — flat key→value map from the `settings` table

In React, access these via `usePage().props`.

### Authentication

Login is **username-based** (not email). Email is optional. Default admin credentials seeded by `RolePermissionSeeder`: username `admin`, password `admin123`.

After login, users are redirected by role:
- `kitchen` → `/kitchen`
- `waiter` / `cashier` → `/pos`
- everything else → `/admin`

### RBAC — Roles & Permissions

Tables: `roles`, `permissions`, `role_permissions` (pivot). The `users` table has `role_id`, `branch_id`, `is_active`, `last_login`, `username`.

**Middleware:** `CheckPermission` is registered as the `permission` alias. Apply it per route: `->middleware('permission:orders.view')`. It calls `$user->hasPermission($key)` which lazy-loads `role.permissions` via `loadMissing`.

**Permission keys by group:**

| Group | Keys |
|---|---|
| Dashboard | `dashboard.view` |
| Orders | `orders.view`, `orders.create`, `orders.update`, `orders.cancel` |
| Payments | `payments.process`, `payments.view` |
| Menu | `menu.view`, `menu.create`, `menu.update`, `menu.delete` |
| Customers | `customers.view`, `customers.create` |
| Kitchen | `kitchen.view`, `kitchen.update` |
| Reports | `reports.view` |
| Admin | `admin.branches`, `admin.areas`, `admin.tables`, `admin.categories`, `admin.settings`, `admin.users`, `admin.roles` |

**Default role assignments** (system roles, `is_system = true`, cannot be deleted):
- **Admin** — all permissions
- **Cashier** — dashboard, orders (all), payments, menu.view, customers
- **Waiter** — dashboard, orders.view/create/update, menu.view, customers
- **Kitchen** — kitchen.view, kitchen.update

Frontend reads permissions from `usePage().props.auth.user.permissions` (array of key strings). `AdminLayout` filters its nav items using this array.

### Controller namespaces

| Namespace | Purpose |
|---|---|
| `App\Http\Controllers\Admin\*` | Admin CRUD: branches, categories, menu items, areas, tables, customers, orders (read-only), invoices, settings, payment methods, users, roles, reports |
| `App\Http\Controllers\POS\POSController` | POS: index, table order, manage order, create order, checkout, process payment |
| `App\Http\Controllers\POS\OrderController` | Order mutations: store, addItem, updateItem, updateItemAddons, removeItem, complete (send to kitchen) |
| `App\Http\Controllers\Kitchen\KitchenController` | Kitchen display screen (KDS) |

### Route structure

```
/admin/*                  Admin CRUD — requires auth + permission:admin.*
/admin/dashboard          requires permission:dashboard.view
/admin/orders             Read-only list — requires permission:reports.view
/admin/invoices           Invoice list/show — requires permission:payments.view
/admin/users              requires permission:admin.users
/admin/roles              requires permission:admin.roles
/admin/menu-items/{id}/restore        POST — restore soft-deleted item
/admin/menu-items/{id}/force-destroy  DELETE — permanent delete (guarded)
/pos                      Tables + orders queue — requires permission:orders.view
/pos/table/{id}           Dine-in order — requires permission:orders.create
/pos/order/{id}           Manage existing order — requires permission:orders.view
/pos/checkout/{id}        Payment screen — requires permission:payments.process
/kitchen                  KDS — requires permission:kitchen.view
/waiter, /waiter/table    Redirects → /pos equivalents
```

All routes require `auth` middleware. The `verified` middleware is **not used** (email is optional).

### Order lifecycle

```
pending → preparing (sent to kitchen via POST /orders/{id}/complete) → ready (kitchen marks ready) → completed (payment processed)
```

Order types: `dine_in` (requires `table_id`), `takeaway`, `delivery`.

### Financial layer — Invoice & PaymentEntry

**The `orders` table has no financial columns.** All money lives in two models:

- **`Invoice`** — one-to-one with `Order`. Holds `subtotal`, `discount`, `tax_rate`, `tax_amount`, `total`, `paid_amount`, `wallet_amount`, `status` (draft/paid/partial/void/refunded), `issued_at`. `Order::getPaymentStatusAttribute()` derives payment state by reading the associated invoice.
- **`PaymentEntry`** — append-only ledger rows per invoice. Each row is a `payment` or `refund`. No `updated_at` (immutable). `PaymentEntry::created()` observer calls `$invoice->recalculatePaidAmount()` automatically.
- **`InvoiceItem`** — immutable snapshot of every order line item at invoice creation time. No `updated_at`. Created atomically in `POSController::processPayment()` via `InvoiceItemSnapshotter::snapshot()`.

**`InvoiceItemSnapshotter`** (`app/Services/InvoiceItemSnapshotter.php`):
- Call `app(InvoiceItemSnapshotter::class)->snapshot($invoice)` inside a DB transaction after `Invoice::create()`.
- Idempotent — safe to call multiple times (skips if `invoice_items` already exist for that invoice).
- Snapshots `order.items` as parent rows and `order_item.addons` as child rows linked via `parent_invoice_item_id`.

When displaying invoice line items, prefer `invoice.items` (the snapshot) over `invoice.order.items` (live data). For backward-compat with invoices created before the snapshot system, fall back to `invoice.order?.items`.

### Menu items — soft deletes & data integrity

`MenuItem` uses `SoftDeletes`. **`$menuItem->delete()` is a soft delete, not a hard delete** — it sets `deleted_at` and hides the item from all queries. The image file is preserved so the item can be restored.

- Soft-deleted items are excluded from POS menus automatically (global scope).
- Admin restore: `MenuItem::withTrashed()->find($id)->restore()`.
- Admin force-delete: `MenuItem::withTrashed()->find($id)->forceDelete()` — check for `InvoiceItem` references first.
- `order_items.menu_item_id` and `order_item_addons.menu_item_id` are **nullable** with `onDelete('set null')` (not cascade). The FK is informational; the `name` column is the authoritative display source.

**Name snapshot pattern** — both `order_items` and `order_item_addons` have a `name` column capturing the item name at order time. When displaying item names in any order/invoice/kitchen view, always use:
```js
item.name ?? item.menu_item?.name ?? '[صنف محذوف]'
```
`OrderItem::menuItem()` and `OrderItemAddon::menuItem()` both use `->withTrashed()` so admin views can still resolve archived items by FK.

### Menu items & addons

`menu_items` has a boolean `is_addon` flag. Regular items (`is_addon = false`) appear in the ordering grid. Addon items (`is_addon = true`) appear in the addon modal, attached to an `OrderItem` via `order_item_addons`. Both types share the same `menu_items` table and pricing logic.

When creating order items in `OrderController`, always include `'name' => $menuItem->name` in the `create()` payload. Validation must exclude soft-deleted items: `'menu_item_id' => 'required|exists:menu_items,id,deleted_at,NULL'`.

### Settings

`Setting` model stores key/value pairs. Use `Setting::getValue($key, $default)` server-side. All settings are in `usePage().props.settings` on every page. Currency defaults to `ILS` (₪).

---

## Two UI layers — Admin vs POS/Kitchen

The codebase intentionally uses **two different UI stacks**. Do not mix them.

### Admin (`resources/js/Pages/Admin/`, `resources/js/Layouts/AdminLayout.jsx`)

Uses **shadcn/ui** components built on Radix UI primitives.

- Component library: `resources/js/Components/ui/` — `button`, `badge`, `card`, `dialog`, `input`, `label`, `table`, `separator`, `avatar`, `dropdown-menu`
- Always use `cn()` from `resources/js/lib/utils.js` for conditional class merging
- CSS variables in `resources/css/app.css` using `@theme inline` (Tailwind v4). Primary brand colour `#ee1d23` → `--primary`
- All admin pages use `AdminLayout`, which renders the collapsible dark sidebar and sticky header. The sidebar filters nav items by the current user's permissions.

**Typical admin page pattern:**
```jsx
import { Card } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
// Single file: CRUD state + useForm hook + list table + create/edit modal
```

### POS & Kitchen (`resources/js/Pages/POS/`, `resources/js/Pages/Kitchen/`)

Uses **custom Tailwind classes only** — no shadcn components, no `cn()`. Touch-optimised.
- Brand colours as arbitrary values: `bg-[#ee1d23]`, `bg-[#6f272a]`
- Animations via `framer-motion`
- Icons via `lucide-react`
- `dir="rtl"` on root container, `font-Cairo` on page root

---

## UI Conventions (shared)

- All UI is **Arabic RTL**
- Brand colours: `#ee1d23` (primary red), `#6f272a` (dark red), `#feca0b` (accent yellow)
- Icons: `lucide-react` throughout
- `@` path alias → `resources/js/`

---

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
