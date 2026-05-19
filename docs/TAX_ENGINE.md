# Tax Engine — Technical Reference

**Last updated:** 2026-05-18

---

## Overview

The Tax Engine calculates, persists, and displays sales tax on invoices. It is **pure on the calculation path** (no DB writes inside `TaxCalculator`) and uses an **immutable ledger pattern** for persistence (invoice_taxes and invoice_item_taxes rows are written once at checkout and never updated).

---

## How to Add a New Tax Rate (Admin Guide)

### Step 1 — Navigate to Taxes

Sidebar → **الضرائب** (requires `admin.taxes` permission).

### Step 2 — Click "إضافة ضريبة"

Fill in the form:

| Field | Required | Notes |
|---|---|---|
| الاسم | ✓ | Display name, e.g. `ضريبة القيمة المضافة` |
| الكود | ✓ | Short code, e.g. `VAT`. Used in receipt/invoice line. |
| النسبة % | ✓ | Numeric, e.g. `15` for 15%. Stored as `decimal(8,4)`. |
| ترتيب التطبيق | — | Integer. Lower = applied first. Default 0. **Critical for compound taxes.** |
| ضريبة مركبة | — | Toggle. When ON, this tax's base includes all preceding taxes. |
| فعّالة | — | Only active taxes appear in checkout calculations. |
| افتراضية | — | When ON, automatically assigned to new menu items. |

### Step 3 — Assign to Menu Items

Go to **قائمة الطعام** → edit each item → scroll to **الضرائب المطبقة** section → check the applicable rates.

New items created while a tax has **افتراضية = ON** are automatically assigned it.

### Step 4 — (Optional) Enable Settings

Go to **الإعدادات** → **إعدادات الضرائب** and configure as needed.

---

## Compound Tax Calculation — How It Works

### Non-compound (simple) taxes

Each tax is applied independently to the pre-tax base amount. Order doesn't matter.

**Example:** Base = 100, Tax A = 10%, Tax B = 5%

```
Tax A: 100 × 10% =  10.00
Tax B: 100 × 5%  =   5.00
Total tax:           15.00
Grand total:        115.00
```

### Compound taxes

Each compound tax is applied to the **running total** (base + all previously calculated taxes). The `apply_order` column determines the sequence.

**Example:** Base = 100, Service Tax = 10% (apply_order=0, non-compound), VAT = 16% (apply_order=1, **compound**)

```
1. Service Tax (non-compound, apply_order=0):
   taxable = base = 100
   tax     = 100 × 10% = 10.00
   running = 100 + 10 = 110.00

2. VAT (compound, apply_order=1):
   taxable = running = 110         ← compound: uses accumulated total
   tax     = 110 × 16% = 17.60
   running = 110 + 17.60 = 127.60

Total tax:    27.60
Grand total: 127.60
```

> **Why this matters:** VAT is effectively calculated on "cost + service charge", which is the legally correct basis in many jurisdictions. If both taxes were non-compound, VAT would only be 16.00 (16% of 100), not 17.60.

### Prices-inclusive calculation (reverse extraction)

When **الأسعار شاملة الضريبة** is ON, the menu item price is assumed to already include all taxes. The engine reverse-extracts the pre-tax base.

**Non-compound reverse extraction:**
```
total_rate = sum of all rates / 100
base = price / (1 + total_rate)

Example: price=127.60, rates=[10%, 16%] (non-compound)
base = 127.60 / (1 + 0.26) = 127.60 / 1.26 = 101.27
```

**Compound reverse extraction:**
```
compound_factor = ∏(1 + rate_N/100) for each tax in order
base = price / compound_factor

Example: price=127.60, rates=[10% non-compound, 16% compound]
compound_factor = (1 + 0.10) × (1 + 0.16) = 1.10 × 1.16 = 1.276
base = 127.60 / 1.276 = 100.00
```

---

## Tax Settings Reference

All settings stored in the `settings` table with `key` prefix `tax.`.

| Key | Type | Default | Effect |
|---|---|---|---|
| `tax.prices_include_tax` | bool | `false` | Prices are tax-inclusive; base is reverse-extracted at checkout |
| `tax.compound_taxes_enabled` | bool | `false` | Enable compound calculation (each compound-flagged rate uses the running total as its base) |
| `tax.exempt_takeaway` | bool | `false` | All takeaway orders are completely tax-exempt |
| `tax.exempt_delivery` | bool | `false` | All delivery orders are completely tax-exempt |
| `tax.rounding_mode` | string | `per_line` | `per_line`: round each line's tax to 2dp before accumulating. `per_invoice`: accumulate raw floats, round only at the end |
| `tax.display_breakdown` | bool | `false` | Show per-rate tax lines on invoices and item rows in the admin view |

> ⚠️ **Changing `tax.prices_include_tax`** affects all *new* invoices created after the change. Existing invoices stored the `prices_included_tax` boolean at creation time and are unaffected.

---

## Code Architecture

```
app/Services/Tax/
├── TaxCalculator.php           Pure service. Accepts Collection of order items,
│                               order type, and settings array. Returns a DTO.
│                               Registered as singleton in AppServiceProvider.
│
└── TaxCalculationResult.php    Immutable DTO. Holds itemBreakdowns and
                                invoiceTaxes. Exposes toInvoiceTaxesData()
                                and toItemBreakdownsData() for DB persistence.

app/Services/
└── InvoiceItemSnapshotter.php  Writes invoice_items + invoice_item_taxes rows.
                                Accepts optional TaxCalculationResult for tax
                                fields. Backward-compatible: null = old behaviour.

app/Http/Controllers/POS/
└── POSController.php           processPayment(): runs the full flow inside a
                                DB::transaction. Calls TaxCalculator, creates
                                Invoice, calls Snapshotter, inserts InvoiceTax rows.
                                calculateTaxPreview(): read-only endpoint for the
                                Checkout live preview (POST /pos/calculate-tax-preview).
```

### Database schema (new tables)

```
tax_rates              — Rate definitions (name, code, rate, is_compound, apply_order)
menu_item_tax_rates    — pivot: menu_items ↔ tax_rates
invoice_taxes          — Invoice-level tax totals (snapshot at checkout time)
invoice_item_taxes     — Per-item tax breakdown (snapshot at checkout time)
```

### Key columns added to existing tables

| Table | Column | Purpose |
|---|---|---|
| `invoices` | `prices_included_tax` | Was price inclusive at invoice creation? |
| `invoices` | `tax_breakdown_json` | Full `TaxCalculationResult::toArray()` for audit |
| `invoice_items` | `subtotal_before_tax` | Pre-tax line total |
| `invoice_items` | `tax_amount` | Tax on this line |
| `invoice_items` | `subtotal_after_tax` | Post-tax line total |
| `menu_items` | `is_tax_exempt` | Item-level exemption flag |

---

## Known Limitations

### 1. Addon tax treatment
Order item addons (extra toppings, sides) are snapshotted as child `invoice_items` but do **not** get separate `invoice_item_taxes` rows. Their value is included in the parent item's total before tax is calculated. Addons should have the same tax rates as their parent item for correct fiscal treatment — this is not enforced by the system.

### 2. Re-checkout does not recalculate taxes
If a cashier partially pays an invoice and returns to the checkout screen, the existing invoice's tax rows are preserved. Tax settings changed between the first and second checkout attempt do not affect the stored invoice. This is by design (immutable ledger), but operators should be aware.

### 3. Rounding mode `per_invoice` not yet surfaced in UI
The setting `tax.rounding_mode = 'per_invoice'` is implemented in `TaxCalculator` but the Settings UI radio group currently persists it correctly. However, there is no validation warning if switching modes mid-day creates inconsistencies between preview and final invoice amounts.

### 4. `invoice_taxes.tax_rate_id` set to NULL on hard-delete
The `invoice_taxes.tax_rate_id` FK is defined with `onDelete('set null')`. A **hard** delete of a `TaxRate` record will null-out the FK on historical invoice rows. The snapshot columns (`tax_name`, `tax_code`, `rate`) are preserved regardless. Soft-deleting is always preferred — the admin UI uses soft-delete for this reason.

### 5. No multi-currency tax
All tax amounts are calculated in the restaurant's single base currency. There is no per-currency tax configuration.

### 6. Discount applied after tax
The discount field in checkout is subtracted from `totalAfterTax`, not from the taxable base. Tax is always computed on the full item price. See "Discount Handling" below.

---

## Discount Handling

> ⚠️ **Tax is calculated BEFORE discount.** The discount reduces the final invoice total, not the taxable base.

```
invoiceTotal = max(0, taxResult->totalAfterTax - discount)
```

Example: item=100, service_tax=10%, discount=20
```
subtotal  = 100
tax       = 100 × 10% = 10.00    ← tax on full 100, not on 80
after_tax = 110.00
total     = 110.00 - 20.00 = 90.00

invoice.subtotal   = 100.00
invoice.tax_amount = 10.00
invoice.discount   = 20.00
invoice.total      = 90.00
```

---

## Files Modified / Created

### New files

| File | Description |
|---|---|
| `app/Services/Tax/TaxCalculator.php` | Core calculation engine (pure, no DB writes) |
| `app/Services/Tax/TaxCalculationResult.php` | Immutable DTO returned by TaxCalculator |
| `app/Services/InvoiceItemSnapshotter.php` | Writes `invoice_items` + `invoice_item_taxes` atomically |
| `app/Models/TaxRate.php` | TaxRate Eloquent model with soft-delete |
| `app/Models/InvoiceTax.php` | Immutable invoice-level tax ledger row (`UPDATED_AT = null`) |
| `app/Models/InvoiceItemTax.php` | Immutable item-level tax ledger row |
| `app/Http/Controllers/Admin/TaxRateController.php` | CRUD: index, store, update, destroy |
| `resources/js/Pages/Admin/Taxes/Index.jsx` | Admin tax management UI |
| `database/migrations/2026_05_08_000001_create_tax_rates_table.php` | |
| `database/migrations/2026_05_08_000002_create_menu_item_tax_rates_table.php` | |
| `database/migrations/2026_05_08_000003_create_invoice_taxes_table.php` | |
| `database/migrations/2026_05_08_000004_create_invoice_item_taxes_table.php` | |
| `database/migrations/2026_05_08_000005_add_tax_columns_to_existing_tables.php` | |
| `tests/Unit/Tax/TaxCalculatorTest.php` | 18 unit tests |
| `tests/Feature/Tax/InvoiceTaxIntegrationTest.php` | 8 HTTP integration tests |
| `tests/Feature/Tax/PaymentWithTaxTest.php` | 9 payment flow feature tests |
| `tests/Feature/Tax/TaxCalculatorEdgeCaseTest.php` | 4 edge-case feature tests |
| `tests/Feature/Admin/TaxRateManagementTest.php` | 5 admin CRUD feature tests |
| `docs/TAX_ENGINE.md` | This document |

### Modified files

| File | Change |
|---|---|
| `app/Http/Controllers/POS/POSController.php` | `processPayment()` calls TaxCalculator, creates InvoiceTax rows, tax-aware invoice totals. Added `calculateTaxPreview()` |
| `app/Http/Controllers/Admin/InvoiceController.php` | `show()` eager-loads `taxes`, passes `displayTaxBreakdown` setting |
| `app/Http/Controllers/Admin/MenuItemController.php` | `store()`/`update()` sync `tax_rate_ids`; auto-assign `is_default` rates |
| `app/Http/Controllers/Admin/SettingController.php` | Validates and saves `tax.*` settings |
| `app/Models/MenuItem.php` | `taxRates()` relationship, `is_tax_exempt` cast |
| `resources/js/Pages/Admin/Settings/Index.jsx` | "إعدادات الضرائب" section with 6 controls |
| `resources/js/Pages/Admin/MenuItems/Index.jsx` | Tax-exempt toggle + per-rate checkboxes in modal |
| `resources/js/Pages/Admin/Invoices/Show.jsx` | Per-tax breakdown lines in financial summary |
| `resources/js/Pages/POS/Checkout.jsx` | Live tax preview via `pos.tax-preview`; receipt tax breakdown |
| `resources/js/Layouts/AdminLayout.jsx` | Sidebar version badge |
| `package.json` | `"version": "1.0.0"` |
| `vite.config.js` | `__APP_VERSION__` build-time injection |
| `routes/web.php` | Tax resource routes + `pos/calculate-tax-preview` |

---

## Data Flow Summary

```
Cashier hits Pay
      │
      ▼
POSController::processPayment()
      │
      ├─ Setting::getAllAsArray()          ← reads 5 tax.* settings
      │
      ├─ $order->load(['items.taxRates',   ← eager-load via menu_item_tax_rates
      │               'items.menuItem'])       pivot using menu_item_id join key
      │
      ├─ TaxCalculator::calculateForCart() ← PURE: no DB writes
      │        │
      │        ├─ extractBaseAmount()      ← handles inclusive/exclusive + compound
      │        ├─ apply taxes in order     ← apply_order ASC, compound flag
      │        └─ returns TaxCalculationResult DTO
      │
      ├─ Invoice::create()                 ← stores tax totals + breakdown JSON
      │
      ├─ InvoiceItemSnapshotter::snapshot()
      │        ├─ InvoiceItem::create()    ← subtotal_before_tax, tax_amount, subtotal_after_tax
      │        └─ InvoiceItemTax::create() ← per-tax breakdown row per item
      │
      ├─ InvoiceTax::create() × N          ← one row per tax rate (invoice-level aggregate)
      │
      └─ PaymentEntry::create()            ← payment record
```
