# Sales Ledger, Installment CRM & Website Intelligence — Design Spec
**Date:** 2026-04-20  
**Status:** Approved  

---

## Overview

Three sub-projects that share a single data source:

| Sub-project | Deliverable |
|---|---|
| 1. Sales Ledger | Admin entry for cash + installment sales, backdate, edit, discount |
| 2. Installment CRM | Payment scheduling, overdue flags, penalties, WhatsApp shortcuts |
| 3. Website Intelligence | Activity ticker, product badges, price history, buying guide ranking |

Architecture: **Supabase tables + DB view** (Approach B). Raw sales data stays private; the website reads only a `product_stats` view — never raw sales tables.

---

## Sub-project 1: Sales Ledger

### Data Model

#### `customers` table
Reusable customer records. Created for installment buyers; cash sales skip this.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | |
| phone | text | |
| cnic | text | nullable |
| area | text | neighbourhood/locality |
| created_at | timestamptz | |

#### `sales` table
One row per transaction.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| sale_date | date | backdatable, defaults to today |
| sale_type | enum(`cash`,`installment`) | |
| product_id | uuid FK → products | |
| product_name | text | snapshot at time of sale |
| customer_id | uuid FK → customers | nullable (cash sales) |
| customer_name | text | cash sales only |
| customer_phone | text | cash sales only |
| customer_area | text | area for both types — feeds ticker |
| list_price | integer | cash_floor at time of sale |
| discount_pct | numeric(5,2) | 0 if none |
| discount_amt | integer | computed or manually overridden |
| final_price | integer | actual amount charged |
| plan_key | text | `cash`,`2m`,`3m`,`6m`,`12m` |
| advance_paid | integer | installment only |
| notes | text | |
| created_by | text | admin user email |
| created_at | timestamptz | |

#### `installment_schedules` table
Auto-generated when an installment sale is saved. One row per expected payment.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| sale_id | uuid FK → sales | |
| due_date | date | |
| amount_due | integer | |
| status | enum(`pending`,`paid`,`overdue`) | |
| penalty_amt | integer | accrued days × penalty rate |

#### `installment_payments` table
Actual payments received against a scheduled instalment.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| schedule_id | uuid FK → installment_schedules | |
| sale_id | uuid FK → sales | |
| paid_date | date | backdatable |
| amount_paid | integer | |
| notes | text | |

#### `product_stats` view (website-facing)
Aggregated stats the website reads. Never exposes raw sales or customer data.

| Column | Derived from |
|---|---|
| product_id | sales |
| units_sold_30d | count of sales in last 30 days |
| units_sold_all | count of all sales |
| last_sold_price | most recent final_price |
| min_sold_price | lowest final_price ever |
| price_history | JSON array of {date, price} (monthly buckets) |
| trending_score | units_sold_30d / units_sold_90d ratio |
| most_popular_plan | mode of plan_key for this product |
| recent_areas | JSON array of recent customer_area values (for ticker) |

---

### Admin UI — "Sales" Tab

New tab added to AdminPortal between `orders` and `enquiries`.

#### Sub-tab 1: Ledger

**Entry form (top, always visible):**
- Sale date picker — defaults to today, fully backdatable
- Sale type toggle: Cash / Installment
- Product search — typeahead from catalog
- List price — auto-filled from product's cash_floor, editable
- Discount row: percentage field ↔ amount field (live-linked; changing one updates the other)
- Final price — computed and shown prominently, editable as override
- Area/neighbourhood field — free text, used for ticker
- **Cash only:** customer name + phone (plain fields, no DB record)
- **Installment only:**
  - Customer lookup (by phone) or create new (name, phone, CNIC, area)
  - Plan selector: 2m / 3m / 6m / 12m
  - Auto-shows: advance amount, monthly amount, total, payment schedule preview
  - Schedule auto-generated on save
- Notes field
- Save button

**Ledger table (below form):**
- Columns: Date · Customer/Name · Area · Product · Type · Final Price · Plan · Actions
- Inline edit — pencil icon re-opens form pre-filled
- Filter by: date range, sale type, product, customer name/phone
- Export to Excel

---

## Sub-project 2: Installment CRM

#### Sub-tab 2: Collections

**Summary strip:**
- Total outstanding · Overdue amount · Due this week · Due this month

**Payment schedule table:**
- One row per scheduled payment across all active installment sales
- Columns: Customer · Area · Product · Due Date · Amount Due · Status · Penalty · Actions
- Status badges: `Pending` (grey) · `Paid` (green) · `Overdue` (red)
- Overdue rows show accrued penalty (days overdue × penalty rate per installment policy)
- **Mark Paid** button → mini-form: paid date (backdatable) + amount received + notes → saves to `installment_payments`, marks schedule row `paid`
- **WhatsApp** button → opens WhatsApp with pre-filled message:
  > *"Dear [Name], your installment of Rs [X] for [Product] was due on [Date]. Kindly arrange payment. A penalty of Rs [Y] applies. — Reliance"*
- Sort: due date ascending by default; overdue rows float to top

#### Sub-tab 3: Analytics

- Revenue split: Cash vs Installment bar chart by month
- Top 10 products by units sold
- Discount analysis: average discount %, which products discounted most
- Outstanding receivables aging: 0–30d / 31–60d / 61–90d / 90d+
- Plan popularity: 2m / 3m / 6m / 12m pie chart
- Export monthly summary (Excel) for accounting/NTN filing

---

## Sub-project 3: Website Intelligence

### Activity Ticker

**Placement:** Below hero / above featured products on homepage. On mobile: fixed bottom strip, never overlaps WhatsApp or Add to Cart buttons.

**Framing:** "Recent Deliveries" — factually true even if sale was 2 days ago.

**Format:**
> *Serving [Area]: [Product] delivered to [Neighbourhood]*
> *Join 14,000+ happy households.*

**Logic:**
- Source: `sales` rows where `customer_area` is not null, last 90 days
- Weighted display: 70% core appliances (ACs, fridges, washing machines) · 30% solar/EV
- Randomized order — no fixed sequence (prevents repeat visitors noticing pattern)
- Interval: 30–60 seconds between notifications (random within range)
- Pause on hover (desktop)
- Only entries with an area are eligible — no area = excluded

### Product Cards

- **"Best Seller"** badge — top 10 by `units_sold_all` within their category
- **"Trending"** badge — `trending_score` > 1.5 (selling faster this month than last)
- **"X sold this month"** counter — shown only if `units_sold_30d` ≥ 3
- Badge priority: Best Seller > Trending (mutually exclusive display)

### Product Detail Page

- **"Most chosen plan"** line under installment options — from `most_popular_plan`
  > *"6-month plan chosen by most buyers"*
- **Price History** (collapsible) — line chart from `price_history` JSON, last 12 months of actual sold prices with "Current price" marker
- **Social proof line** near CTA — *"X people bought this"* (only if ≥ 3)

### Buying Guide

- Category recommendations sorted by `units_sold_all` descending by default
- "Most Sold" tag replaces manual "Staff Pick" where sales data backs it

### Privacy & Thresholds

- No customer names, CNIC, or individual prices ever exposed publicly
- Counts only shown when ≥ 3 to avoid revealing single sales
- Area displayed is neighbourhood-level only (never full address)
- All stats read from `product_stats` view — zero direct access to sales tables from frontend

---

## Implementation Sequence

1. Supabase schema — create 4 tables + product_stats view + RLS policies
2. `api.ts` — CRUD functions for sales, customers, schedules, payments
3. Admin `SalesTab` component — Ledger sub-tab
4. Admin `CollectionsTab` component — payment tracking + WhatsApp
5. Admin `SalesAnalyticsTab` component — charts + export
6. `product_stats` hook — `useProductStats(productId)`
7. Product card badges — Best Seller, Trending, sold count
8. Product detail — price history chart + most popular plan + social proof
9. Activity ticker component — homepage + mobile positioning
10. Buying guide — sort by sales rank
