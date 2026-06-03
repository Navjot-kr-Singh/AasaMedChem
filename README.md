# AasaMedChem — B2B Pharmaceutical Inventory & Quotation Management Platform

> A production-ready, full-stack B2B pharmaceutical marketplace where verified sellers list regulated chemical inventory, buyers submit quotation requests and place direct orders, and administrators oversee compliance, seller onboarding, and the entire transaction lifecycle — all with audit-safe, concurrency-locked, 10-decimal-precision inventory management.

**Live Deployment:** [https://aasa-med-chem.vercel.app](https://aasa-med-chem.vercel.app)  
**Repository:** [https://github.com/Navjot-kr-Singh/AasaMedChem](https://github.com/Navjot-kr-Singh/AasaMedChem)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [System Architecture](#3-system-architecture)
4. [Directory Structure](#4-directory-structure)
5. [Database Schema](#5-database-schema)
6. [Authentication & Role System](#6-authentication--role-system)
7. [Inventory Management System](#7-inventory-management-system)
8. [Unit Conversion Engine](#8-unit-conversion-engine)
9. [Pricing Engine](#9-pricing-engine)
10. [Quotation Lifecycle](#10-quotation-lifecycle)
11. [Order Lifecycle](#11-order-lifecycle)
12. [Seller Onboarding & Verification](#12-seller-onboarding--verification)
13. [Admin Panel](#13-admin-panel)
14. [File Storage — Vercel Blob](#14-file-storage--vercel-blob)
15. [Email Notifications](#15-email-notifications)
16. [Activity Audit Logs](#16-activity-audit-logs)
17. [Key Engineering Decisions](#17-key-engineering-decisions)
18. [Test Credentials](#18-test-credentials)
19. [Environment Variables](#19-environment-variables)
20. [Local Setup Guide](#20-local-setup-guide)
21. [Database Seeding](#21-database-seeding)
22. [Deployment to Vercel](#22-deployment-to-vercel)
23. [Scripts Reference](#23-scripts-reference)

---

## 1. Project Overview

AasaMedChem is a regulated B2B pharmaceutical procurement platform built to solve the critical problem of accurate, traceable, and concurrency-safe inventory and quotation management in the pharmaceutical supply chain.

The platform serves three user roles:

- **Buyers** — Pharmaceutical companies or procurement teams who browse a curated product catalog, request price quotations for bulk purchases, or place direct orders. Buyers can track every quotation and order through its full lifecycle.
- **Sellers** — Verified chemical suppliers and API manufacturers who list their products with precise inventory quantities, manage incoming quotations, and fulfil orders. A seller's account is gated behind an administrative compliance verification process before they can transact.
- **Administrators** — The platform operator who approves or rejects seller registrations, reviews all product listings, manages all orders and quotations across the platform, and manually adjusts inventory when needed.

The platform addresses specific challenges that generic e-commerce software cannot solve out of the box:

- **Floating-point precision** — Pharmaceutical quantities like `0.0001234 g` (sub-milligram API doses) or prices like `₹1,23,456.7890` per gram must be stored and calculated without any IEEE 754 rounding drift.
- **Concurrent inventory integrity** — Two buyers cannot simultaneously over-purchase the same 500 g batch of a product. Database-level row locking ensures inventory never goes negative.
- **Unit heterogeneity** — Sellers list stock in a fixed base unit (grams or millilitres), but buyers may purchase in kilograms or litres. The system converts transparently and stores both values for full auditability.
- **Price snapshotting** — A quotation or order locks in the price at the moment of transaction. If a seller changes their per-unit price afterwards, historical records are never retroactively modified.

---

## 2. Technology Stack

| Layer | Technology | Version | Purpose |
|:---|:---|:---|:---|
| **Framework** | Next.js (App Router) | 15.5.19 | Full-stack React framework with Server Actions |
| **Language** | TypeScript | 5.x | Type-safe across all layers |
| **UI Library** | React | 19.0.0 | Component rendering |
| **Styling** | Tailwind CSS | 4.x | Utility-first CSS framework |
| **UI Components** | shadcn/ui via @base-ui/react | latest | Accessible, headless component primitives |
| **Icons** | Lucide React | 1.17.0 | Consistent SVG icon set |
| **Charts** | Recharts | 3.8.1 | Admin and seller analytics dashboards |
| **Database** | Neon PostgreSQL | serverless | Managed, serverless-compatible PostgreSQL |
| **ORM** | Drizzle ORM | 0.45.2 | Type-safe SQL builder and schema manager |
| **DB Driver** | @neondatabase/serverless | 1.1.0 | HTTP-based WebSocket pool for serverless |
| **Authentication** | NextAuth (Auth.js) | 5.0.0-beta.25 | JWT-based session management |
| **Password Hashing** | bcryptjs | 3.0.3 | SHA-256 password hashing |
| **Decimal Math** | decimal.js | 10.6.0 | 40-digit arbitrary-precision arithmetic |
| **File Storage** | @vercel/blob | 2.4.0 | Seller document uploads (GST, drug licence) |
| **Email** | Nodemailer | 6.10.1 | Transactional notification emails |
| **Toast Notifications** | Sonner | 2.0.7 | UI feedback toasts |
| **Deployment** | Vercel | — | Serverless production hosting |

---

## 3. System Architecture

AasaMedChem uses a **unified full-stack architecture** with no separate backend service. All server-side logic runs as Next.js **Server Actions** and **Route Handlers** within the same deployment. This eliminates the overhead of a separate API server while keeping all sensitive operations (database queries, authentication checks, inventory mutations) completely server-side.

```
┌─────────────────────────────────────────────────────────────────┐
│                        VERCEL EDGE / SERVERLESS                  │
│                                                                   │
│  ┌─────────────────┐    ┌──────────────────────────────────┐    │
│  │   Next.js 15    │    │        Next.js Middleware         │    │
│  │  App Router     │───▶│  (JWT token validation +         │    │
│  │  (React 19)     │    │   role-based route guards)       │    │
│  └────────┬────────┘    └──────────────────────────────────┘    │
│           │                                                       │
│  ┌────────▼────────────────────────────────────┐               │
│  │              Server Actions                   │               │
│  │  actions/admin.ts   — Admin operations        │               │
│  │  actions/auth.ts    — Registration/login      │               │
│  │  actions/products.ts — Product CRUD           │               │
│  │  actions/inventory.ts — Stock management      │               │
│  │  actions/quotations.ts — Quotation lifecycle  │               │
│  │  actions/orders.ts  — Order processing        │               │
│  │  actions/queries.ts — Read/fetch queries      │               │
│  │  actions/seller.ts  — Seller onboarding       │               │
│  │  actions/dashboards.ts — Analytics queries    │               │
│  │  actions/logging.ts — Activity logging        │               │
│  └────────┬────────────────────────────────────┘               │
│           │                                                       │
│  ┌────────▼────────────────────────────────────┐               │
│  │              Core Libraries                   │               │
│  │  lib/auth.ts       — NextAuth configuration   │               │
│  │  lib/conversions.ts — Unit conversion engine  │               │
│  │  lib/pricing-engine.ts — Price calculator     │               │
│  │  lib/decimal.ts    — Decimal.js configuration │               │
│  │  lib/email.ts      — Nodemailer email sender  │               │
│  └────────┬────────────────────────────────────┘               │
│           │                                                       │
│  ┌────────▼───────────┐   ┌────────────────────┐              │
│  │  Neon PostgreSQL    │   │   Vercel Blob       │              │
│  │  (NUMERIC 30,10)    │   │  (Document Storage) │              │
│  └────────────────────┘   └────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### Request Flow

1. A browser request hits the **Next.js Middleware** first. The middleware reads the JWT cookie, validates the session token, extracts the user `role`, and enforces route-level access control — before any page code runs.
2. If the request passes middleware, the **Next.js App Router** renders the correct Server Component or delivers the page.
3. Interactive UI actions (form submissions, button clicks) call **Server Actions** directly from the client via React's `"use server"` mechanism. Server Actions run entirely on the server — no REST API is exposed.
4. Server Actions use **Drizzle ORM** to query or mutate the **Neon PostgreSQL** database. All inventory mutations wrap their queries in transactions with row-level locks.
5. Responses stream back to the client. Toast notifications (Sonner) confirm success or display errors.

---

## 4. Directory Structure

```
AasaMedChem/
│
├── app/                              # Next.js 15 App Router
│   ├── layout.tsx                    # Root layout (font, providers)
│   ├── globals.css                   # Global Tailwind CSS styles
│   ├── page.tsx                      # Public landing page
│   │
│   ├── login/page.tsx                # Login page (static)
│   ├── register/page.tsx             # Registration page (static)
│   │
│   ├── admin/                        # Admin portal (role-gated)
│   │   ├── layout.tsx                # Admin layout with sidebar
│   │   ├── dashboard/page.tsx        # Admin analytics overview
│   │   ├── users/page.tsx            # User management table
│   │   ├── verifications/            # Seller verification queue
│   │   ├── products/                 # Platform-wide product management
│   │   ├── orders/                   # All orders management
│   │   └── quotations/               # All quotations management
│   │
│   ├── seller/                       # Seller portal (role + verification gated)
│   │   ├── layout.tsx                # Seller layout with sidebar
│   │   ├── dashboard/page.tsx        # Seller analytics + onboarding
│   │   ├── products/                 # Seller product & inventory management
│   │   ├── orders/                   # Seller's incoming orders
│   │   └── quotations/               # Seller's incoming quotations
│   │
│   ├── buyer/                        # Buyer portal (role-gated)
│   │   ├── layout.tsx                # Buyer layout with sidebar
│   │   ├── dashboard/page.tsx        # Buyer order & quotation overview
│   │   ├── catalog/                  # Product browsing & ordering
│   │   ├── quotations/               # Buyer's submitted quotations
│   │   └── orders/                   # Buyer's placed orders
│   │
│   └── api/auth/[...nextauth]/       # NextAuth catch-all API route
│       └── route.ts
│
├── actions/                          # Next.js Server Actions (all business logic)
│   ├── admin.ts                      # Admin: seller review, product approval, stats
│   ├── auth.ts                       # Registration, bcrypt hashing
│   ├── dashboards.ts                 # Analytics aggregation queries
│   ├── inventory.ts                  # Stock adjustments, reserve/release/deduct
│   ├── logging.ts                    # Activity log writer
│   ├── orders.ts                     # Direct order creation, quotation conversion
│   ├── products.ts                   # Product CRUD + status transitions
│   ├── queries.ts                    # All read/fetch queries (products, orders, etc.)
│   ├── quotations.ts                 # Quotation creation + approval/rejection
│   └── seller.ts                     # Seller profile creation, document upload
│
├── components/                       # Shared React components
│   ├── sidebar.tsx                   # Role-aware navigation sidebar
│   ├── dashboard-charts.tsx          # Recharts analytics charts
│   ├── seller-onboarding.tsx         # Multi-step seller verification UI
│   ├── providers.tsx                 # SessionProvider wrapper
│   └── ui/                           # shadcn/ui primitives
│
├── lib/                              # Pure utility/configuration modules
│   ├── auth.ts                       # NextAuth configuration and callbacks
│   ├── conversions.ts                # Unit conversion engine (g↔kg, mL↔L)
│   ├── decimal.ts                    # decimal.js config, formatINR, formatDecimal
│   ├── email.ts                      # Nodemailer email templates
│   ├── pricing-engine.ts             # Quantity + price calculation pipeline
│   └── utils.ts                      # Tailwind cn() merge utility
│
├── db/                               # Database layer
│   ├── index.ts                      # Neon Pool + Drizzle client singleton
│   ├── schema.ts                     # Full database schema (11 tables + enums)
│   └── seed.ts                       # Database seeding script
│
├── middleware.ts                     # JWT auth + role-based route enforcement
├── drizzle.config.ts                 # Drizzle Kit configuration
├── next.config.ts                    # Next.js configuration
├── package.json                      # Dependencies and npm scripts
└── tsconfig.json                     # TypeScript configuration
```

---

## 5. Database Schema

The database is a single Neon PostgreSQL instance with 11 tables and 7 enums. All numeric values (quantities and prices) use `NUMERIC(30, 10)` — 20 digits of integer precision and 10 digits of decimal precision — to satisfy pharmaceutical accuracy requirements.

### Enums

| Enum | Values |
|:---|:---|
| `user_role` | `admin`, `seller`, `buyer` |
| `verification_status` | `pending`, `approved`, `rejected` |
| `product_status` | `draft`, `pending_review`, `approved`, `rejected` |
| `order_status` | `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled` |
| `quotation_status` | `pending`, `approved`, `rejected`, `converted` |
| `dimension_type` | `weight`, `volume`, `count` |
| `unit_type` | `g`, `kg`, `mL`, `L`, `item` |
| `inventory_transaction_type` | `stock_added`, `stock_removed`, `order`, `quotation_reservation`, `quotation_release`, `adjustment` |

### Tables

#### `users`
Stores all platform users regardless of role.

| Column | Type | Notes |
|:---|:---|:---|
| `id` | UUID | Primary key |
| `name` | TEXT | Full name |
| `email` | TEXT | Unique, used for login |
| `password_hash` | TEXT | bcrypt hash |
| `role` | `user_role` | `admin`, `seller`, or `buyer` |
| `created_at` | TIMESTAMP | Account creation time |

#### `seller_profiles`
One-to-one extension of `users` for sellers. Holds business compliance data.

| Column | Type | Notes |
|:---|:---|:---|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → users |
| `business_name` | TEXT | Registered business name |
| `gst_number` | TEXT | GST registration number |
| `drug_license_number` | TEXT | Drug licence number (optional) |
| `address` | TEXT | Registered business address |
| `verification_status` | `verification_status` | `pending` / `approved` / `rejected` |
| `rejection_reason` | TEXT | Admin rejection note |
| `approved_by` | UUID | FK → admin user |
| `approved_at` | TIMESTAMP | Approval timestamp |
| `rejected_by` | UUID | FK → admin user |
| `rejected_at` | TIMESTAMP | Rejection timestamp |

#### `seller_documents`
Stores references to seller-uploaded compliance documents in Vercel Blob.

| Column | Type | Notes |
|:---|:---|:---|
| `id` | UUID | Primary key |
| `seller_profile_id` | UUID | FK → seller_profiles |
| `document_type` | TEXT | e.g. `gst_certificate`, `drug_license`, `pan_card` |
| `document_url` | TEXT | Vercel Blob public URL |

#### `categories`
Master list of pharmaceutical product categories.

| Column | Type | Notes |
|:---|:---|:---|
| `id` | UUID | Primary key |
| `name` | TEXT | Unique category name |
| `description` | TEXT | Category description |

Pre-seeded categories: **API**, **Solvent**, **Excipient**, **Intermediate**, **Laboratory Reagent**, **Finished Product**.

#### `products`
The core product catalogue. Each product belongs to one seller and one category.

| Column | Type | Notes |
|:---|:---|:---|
| `id` | UUID | Primary key |
| `seller_profile_id` | UUID | FK → seller_profiles |
| `category_id` | UUID | FK → categories |
| `name` | TEXT | Product name |
| `description` | TEXT | Detailed description |
| `sku` | TEXT | Unique stock-keeping unit code |
| `dimension_type` | `dimension_type` | `weight`, `volume`, or `count` |
| `base_unit` | `unit_type` | Internal storage unit (`g`, `mL`, `item`) |
| `inventory_quantity` | NUMERIC(30,10) | Total stock in base unit |
| `reserved_quantity` | NUMERIC(30,10) | Stock locked by approved quotations |
| `price_per_base_unit` | NUMERIC(30,10) | Price per single base unit (INR) |
| `product_status` | `product_status` | `draft` → `pending_review` → `approved`/`rejected` |
| `is_active` | BOOLEAN | Soft-delete flag |
| `deleted_at` | TIMESTAMP | Soft-delete timestamp |

#### `inventory_transactions`
Immutable ledger. Every stock change, for any reason, creates one row here.

| Column | Type | Notes |
|:---|:---|:---|
| `id` | UUID | Primary key |
| `product_id` | UUID | FK → products |
| `quantity` | NUMERIC(30,10) | Positive = addition, negative = deduction |
| `transaction_type` | enum | Type of change |
| `reference_type` | enum | What caused it (`order`, `quotation`, etc.) |
| `reference_id` | UUID | FK to the causative record |
| `notes` | TEXT | Human-readable description |
| `created_by` | UUID | FK → users (who performed it) |
| `created_at` | TIMESTAMP | When it happened |

#### `quotations`
A quotation request header submitted by a buyer.

| Column | Type | Notes |
|:---|:---|:---|
| `id` | UUID | Primary key |
| `buyer_id` | UUID | FK → users |
| `status` | `quotation_status` | `pending` → `approved` → `converted` or `rejected` |
| `total_amount` | NUMERIC(30,10) | Snapshotted total at creation |

#### `quotation_items`
Individual line items within a quotation. Both the entered unit and converted base unit are stored.

| Column | Type | Notes |
|:---|:---|:---|
| `entered_quantity` | NUMERIC(30,10) | What buyer typed (e.g. `5` kg) |
| `entered_unit` | `unit_type` | What unit buyer used |
| `converted_quantity` | NUMERIC(30,10) | Converted to base unit (e.g. `5000` g) |
| `internal_unit` | `unit_type` | The product's base unit |
| `unit_price` | NUMERIC(30,10) | **Snapshotted** price per base unit at time of quotation |
| `total_price` | NUMERIC(30,10) | **Snapshotted** line total at time of quotation |

#### `orders` and `order_items`
Mirrors the quotation/quotation_items structure exactly. Orders can be created directly by buyers (direct order) or converted from an approved quotation. Prices are snapshotted at the moment of order placement.

#### `activity_logs`
A global append-only audit log for all significant actions (seller approved, product rejected, order confirmed, etc.).

### Entity Relationship Diagram

```mermaid
erDiagram
    users ||--o| seller_profiles : "has profile"
    users ||--o{ activity_logs : "creates"
    users ||--o{ quotations : "submits"
    users ||--o{ orders : "places"

    seller_profiles ||--o{ seller_documents : "uploads"
    seller_profiles ||--o{ products : "owns"
    categories ||--o{ products : "classifies"

    products ||--o{ inventory_transactions : "stock ledger"
    products ||--o{ quotation_items : "negotiated in"
    products ||--o{ order_items : "purchased in"

    quotations ||--o{ quotation_items : "contains"
    quotations ||--o| orders : "converts to"

    orders ||--o{ order_items : "contains"
```

---

## 6. Authentication & Role System

Authentication is implemented using **NextAuth v5 (Auth.js)** with the `CredentialsProvider` and **JWT session strategy**. There is no database session table — the session lives entirely in a signed, server-verified cookie.

### Login Flow

1. User submits email + password on `/login`.
2. The `authorize()` callback in `lib/auth.ts` queries the `users` table for the email.
3. The submitted password is verified against the stored `bcrypt` hash using `bcryptjs`.
4. On success, a JWT token is created containing: `id`, `role`, `verificationStatus` (sellers only), and `sellerProfileId` (sellers only).
5. The JWT is signed with `NEXTAUTH_SECRET` and stored as an `HttpOnly` cookie.

### JWT Callbacks

The `jwt` callback embeds all role data into the token on login. It also supports **dynamic session refresh** — if `trigger === "update"` (e.g. after a seller's verification status changes), it re-queries the database and refreshes the token fields without requiring a re-login.

The `session` callback forwards the token fields into the session object so client components can read `session.user.role`, `session.user.verificationStatus`, etc.

### Route Protection — Two Layers

**Layer 1: `middleware.ts` (Edge — runs before every request)**

The middleware reads the JWT from the incoming cookie using `getToken()` with a triple-fallback for cookie name variants (standard NextAuth, Auth.js v5 `__Secure-` prefix, and proxy SSL-terminated fallback). It enforces:

- Unauthenticated users accessing `/admin/*`, `/seller/*`, or `/buyer/*` → redirect to `/login`
- Authenticated users on `/login` or `/register` → redirect to their role's dashboard
- Wrong-role access (e.g. a buyer hitting `/seller/*`) → redirect to their own dashboard
- Sellers with `verificationStatus !== "approved"` accessing any seller page except `/seller/dashboard` → redirect to `/seller/dashboard`

**Layer 2: Layout Server Components (runs during page render)**

Each portal layout (`app/admin/layout.tsx`, `app/seller/layout.tsx`, `app/buyer/layout.tsx`) calls `auth()` server-side as a second enforcement layer. This ensures that even if middleware is somehow bypassed, the page itself will redirect the request.

**Layer 3: Server Actions**

Every Server Action re-verifies the session and role at the start of execution. No action trusts the client's claims — the role is always read from the verified JWT token.

---

## 7. Inventory Management System

Inventory is the most technically complex part of the system. Every product has two quantity fields:

- **`inventory_quantity`** — Total physical stock held by the seller.
- **`reserved_quantity`** — Portion of stock locked by approved quotations awaiting fulfilment.

The **available stock** shown to buyers is always computed as:
```
available = inventory_quantity - reserved_quantity
```

### Concurrency Safety — Row-Level Locking

All stock mutations run inside a **Drizzle ORM transaction** that begins with a `SELECT ... FOR UPDATE` lock on the product row:

```sql
SELECT id, inventory_quantity, reserved_quantity
FROM products
WHERE id = $1
FOR UPDATE;
```

This prevents any other transaction from reading or writing the same product row until the current transaction commits or rolls back. This eliminates race conditions where two concurrent orders might both read the same available stock and both succeed, causing negative inventory.

### Three Inventory Operations

#### 1. `internalReserveStock` — Called on quotation approval
- Locks the product row.
- Checks `available >= quantityToReserve`. Throws if insufficient.
- Increments `reserved_quantity` by the converted quantity.
- Writes a `quotation_reservation` ledger entry.

#### 2. `internalReleaseStock` — Called on quotation rejection (if it was previously approved)
- Locks the product row.
- Decrements `reserved_quantity`. Clamps to `0` if the result would go negative (safety guard).
- Writes a `quotation_release` ledger entry with a negative quantity value.

#### 3. `internalDeductReservedStock` — Called when a quotation-based order is fulfilled
- Locks the product row.
- Subtracts from both `inventory_quantity` and `reserved_quantity` simultaneously.
- Throws if `inventory_quantity` would go negative (data integrity guard).
- Clamps `reserved_quantity` to `0` if needed.
- Writes an `order` ledger entry with a negative quantity value.

#### 4. `internalDeductDirectStock` — Called on direct orders (without quotation)
- Locks the product row.
- Checks `available >= quantityToDeduct`.
- Subtracts directly from `inventory_quantity` only (no reservation step).
- Writes an `order` ledger entry.

### Manual Stock Adjustment (Admin)
Administrators can manually add or remove stock via `adjustStock()`. This also uses a locked transaction and writes an `adjustment` ledger entry with full audit notes.

---

## 8. Unit Conversion Engine

Located in `lib/conversions.ts`.

### Supported Units and Dimensions

| Dimension | User-Facing Units | Internal Base Unit |
|:---|:---|:---|
| Weight | `g` (grams), `kg` (kilograms) | `g` |
| Volume | `mL` (millilitres), `L` (litres) | `mL` |
| Count | `item` | `item` |

### Conversion Logic

**Converting to base unit (before storing):**

| Input Unit | Operation | Factor |
|:---|:---|:---|
| `kg` → `g` | multiply | × 1000 |
| `L` → `mL` | multiply | × 1000 |
| `g`, `mL`, `item` | no change | × 1 |

**Converting from base unit (for display):**

| Output Unit | Operation | Factor |
|:---|:---|:---|
| `g` → `kg` | divide | ÷ 1000 |
| `mL` → `L` | divide | ÷ 1000 |
| `g`, `mL`, `item` | no change | ÷ 1 |

All arithmetic uses `decimal.js` instances, never JavaScript native `number` types, to eliminate any floating-point precision loss.

### What Gets Stored

In `quotation_items` and `order_items`, both values are always persisted:
- `entered_quantity` + `entered_unit` — exactly what the buyer typed
- `converted_quantity` + `internal_unit` — the base-unit equivalent used for stock deduction

This dual storage provides a complete audit trail and allows the UI to display quantities in whatever unit is most meaningful to the user.

---

## 9. Pricing Engine

Located in `lib/pricing-engine.ts`.

The `calculatePricing()` function takes a single input object and returns a complete pricing result:

```typescript
interface PricingInput {
  enteredQuantity: string | number | Decimal; // What the user typed
  enteredUnit: UnitType;                       // In which unit
  pricePerBaseUnit: string | number | Decimal; // Price per 1 base unit (g or mL)
  dimensionType: DimensionType;
}

interface PricingResult {
  enteredQuantity: string;     // Original input, cleaned
  enteredUnit: UnitType;       // Original unit
  convertedQuantity: string;   // Quantity in base unit
  internalUnit: UnitType;      // Base unit
  pricePerBaseUnit: string;    // Price per base unit
  totalPrice: string;          // convertedQuantity × pricePerBaseUnit
}
```

**Calculation steps:**
1. Parse `enteredQuantity` into a `Decimal` instance.
2. Call `convertToBaseUnit(quantity, enteredUnit)` to get `convertedQty` in grams or millilitres.
3. Compute `totalPrice = convertedQty × pricePerBaseUnit`.
4. Serialize all values to fixed 10-decimal strings with trailing zeros stripped.

All values are returned as strings to match PostgreSQL `NUMERIC` storage format and avoid any numeric precision loss in JSON serialization.

---

## 10. Quotation Lifecycle

A quotation follows a strict state machine:

```
PENDING ──▶ APPROVED ──▶ CONVERTED (to Order)
   │              │
   └──▶ REJECTED  └──▶ REJECTED (releases reserved stock)
```

### Step-by-Step

1. **Buyer submits quotation** (`createQuotationRequest`):
   - Pricing is calculated for each item via the pricing engine.
   - A `quotations` header record is inserted with `status: "pending"`.
   - `quotation_items` rows are inserted with snapshotted `unit_price` and `total_price`.
   - Stock is **not** reserved yet at this stage.

2. **Admin or seller approves** (`updateQuotationStatus` → `"approved"`):
   - For each quotation item, `internalReserveStock` is called inside a transaction.
   - Each call issues a `SELECT ... FOR UPDATE` lock, checks availability, increments `reserved_quantity`, and writes a `quotation_reservation` ledger entry.
   - `quotations.status` is updated to `"approved"`.

3. **Admin or seller rejects** (`updateQuotationStatus` → `"rejected"`):
   - If the quotation was previously `"approved"`, `internalReleaseStock` is called for each item, decrementing `reserved_quantity` and writing `quotation_release` ledger entries.
   - If the quotation was `"pending"`, no stock operations are needed.

4. **Buyer converts to order** (`convertQuotationToOrder`):
   - `internalDeductReservedStock` is called for each item, subtracting from both `inventory_quantity` and `reserved_quantity`.
   - An `orders` record is created linked to the source `quotation_id`.
   - `quotations.status` is updated to `"converted"` — a terminal state that cannot be modified further.

---

## 11. Order Lifecycle

Orders can be created in two ways:

### Path A — Direct Order (no quotation)
Buyer selects products from the catalog and places an immediate order. `createDirectOrder()`:
- Verifies all products are `approved` and from `approved` sellers.
- Calculates pricing and checks available stock in a transaction.
- Calls `internalDeductDirectStock` for each item.
- Inserts the `orders` and `order_items` records.

### Path B — From Approved Quotation
Buyer converts an approved quotation. `convertQuotationToOrder()`:
- Re-fetches all quotation items and their current product data.
- Calls `internalDeductReservedStock` (removes from both columns).
- Inserts the `orders` and `order_items` records, linking `quotation_id`.
- Marks the quotation as `"converted"`.

### Order Status Progression

```
PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED
                                          └──▶ CANCELLED
```

Admins can update order status through all transitions. Each update is logged in `activity_logs`.

---

## 12. Seller Onboarding & Verification

Sellers go through a multi-step onboarding process before they can list products or transact:

### Step 1 — Register
Seller registers at `/register` selecting the "Seller Portal" tab. This creates:
- A `users` row with `role: "seller"`.
- A `seller_profiles` row with `verification_status: "pending"`.

### Step 2 — Complete Business Profile
On first login, sellers see the onboarding wizard (`components/seller-onboarding.tsx`). They submit:
- Business name, GST number, drug licence number, and registered address.
- This calls `createSellerProfile()` which upserts the `seller_profiles` row.

### Step 3 — Upload Documents
Sellers upload compliance documents (GST certificate, drug licence, PAN card, business registration) via `uploadSellerDocument()`. Files are stored in **Vercel Blob** and their public URLs saved in `seller_documents`.

### Step 4 — Admin Review
The admin sees all pending sellers in the `/admin/verifications` queue. The admin can:
- **Approve** — sets `verification_status: "approved"`, records `approved_by`, `approved_at`, `verified_at`. Triggers an approval email.
- **Reject** — sets `verification_status: "rejected"`, stores the rejection reason. Triggers a rejection email.

### Step 5 — Access Granted
Only sellers with `verification_status: "approved"` can access `/seller/products`, `/seller/orders`, and `/seller/quotations`. The middleware enforces this on every request. Unapproved sellers are locked to `/seller/dashboard` which shows their verification status.

---

## 13. Admin Panel

Administrators have a dedicated portal at `/admin/*` with the following pages:

### Dashboard (`/admin/dashboard`)
- Total users, sellers, buyers, products, orders, and quotations at a glance.
- Platform-wide revenue totals.
- Recharts bar and line charts for order trends and revenue over time.

### User Management (`/admin/users`)
- Full table of all platform users with role badges.
- Displays registration dates and account status.

### Seller Verifications (`/admin/verifications`)
- Queue of sellers awaiting review.
- View uploaded documents (links to Vercel Blob URLs).
- One-click Approve or Reject with rejection reason input.

### Product Management (`/admin/products`)
- View all products across all sellers.
- Approve or reject products submitted for listing (`pending_review` → `approved`/`rejected`).
- Manual stock adjustment for any product.

### Order Management (`/admin/orders`)
- Full table of all orders across all buyers and sellers.
- Update order status through the progression states.

### Quotation Management (`/admin/quotations`)
- Full table of all quotations across all buyers and sellers.
- Approve or reject any pending quotation (triggers stock reservation/release).

---

## 14. File Storage — Vercel Blob

Seller compliance documents are stored in **Vercel Blob**, a managed object storage service. The `uploadSellerDocument()` Server Action:

1. Receives the `File` object from the form submission.
2. Calls `@vercel/blob`'s `put()` with `access: "public"` and the file's MIME type.
3. The returned `url` (a permanent public CDN URL) is saved to `seller_documents.document_url`.

The `BLOB_READ_WRITE_TOKEN` environment variable authenticates write operations. The `@vercel/blob` package is listed in `serverExternalPackages` in `next.config.ts` to prevent bundling conflicts with the `undici` HTTP client it relies on.

---

## 15. Email Notifications

`lib/email.ts` provides a `sendEmail()` function wrapping **Nodemailer** with an HTML template system. Emails are sent for:

- **Seller Approval** — notifies the seller that their account has been verified and they can begin listing products.
- **Seller Rejection** — notifies the seller with the admin's rejection reason and guidance to re-apply.
- **Order Confirmation** — notifies the buyer when an order is placed.
- **Quotation Status Change** — notifies the buyer when their quotation is approved or rejected.

Emails are sent synchronously within Server Actions. The SMTP configuration is read from environment variables (`EMAIL_SERVER_HOST`, `EMAIL_SERVER_PORT`, `EMAIL_SERVER_USER`, `EMAIL_SERVER_PASSWORD`, `EMAIL_FROM`).

---

## 16. Activity Audit Logs

The `activity_logs` table and `logActivity()` helper (`actions/logging.ts`) create an immutable audit trail of every significant platform event. Examples:

| Action | Entity Type | Who |
|:---|:---|:---|
| `seller_approved` | `seller_profile` | Admin |
| `seller_rejected` | `seller_profile` | Admin |
| `product_approved` | `product` | Admin |
| `product_rejected` | `product` | Admin |
| `created_quotation` | `quotation` | Buyer |
| `quotation_approved` | `quotation` | Admin/Seller |
| `quotation_rejected` | `quotation` | Admin/Seller |
| `order_placed` | `order` | Buyer |
| `order_status_updated` | `order` | Admin |

Each log entry records the user ID, action string, entity type, entity ID, timestamp, and an optional `metadata` JSONB blob with additional context.

---

## 17. Key Engineering Decisions

### Why `NUMERIC(30, 10)` and `decimal.js`?

JavaScript's `number` type is a 64-bit IEEE 754 float. This means `0.1 + 0.2 === 0.30000000000000004` — a rounding error that is completely unacceptable in pharmaceutical pricing. A billing discrepancy of even `₹0.001` across thousands of micrograms-level transactions compounds into significant errors and potential regulatory violations.

The solution is two-layered:
- **PostgreSQL `NUMERIC(30, 10)`** — stores up to 20 integer digits and exactly 10 decimal digits with no rounding whatsoever.
- **`decimal.js` at 40-digit precision** — all arithmetic in TypeScript uses `Decimal` objects, never native numbers. Results are serialised back to strings with `.toString()` before writing to the database.

### Why Row-Level Locks Instead of Optimistic Concurrency?

Optimistic concurrency (check-then-act with version columns) can still fail under high contention — two transactions can both read the same version, both validate successfully, and the second commit overwrites the first. In a pharmaceutical context, this is unacceptable because overselling regulated substances can have legal consequences. `SELECT ... FOR UPDATE` is pessimistic but guarantees exactly-once correctness at the cost of some throughput, which is the correct trade-off.

### Why Snapshot Prices on Quotation/Order Items?

Product prices change over time. A seller might reduce their price per kilogram after a buyer already submitted a quotation. The platform snapshots `unit_price` and `total_price` into each `quotation_items` and `order_items` row at the moment of creation. Historical records are therefore immutable — they always show what was agreed at the time of the transaction, not the current market price.

### Why Soft Delete for Products?

Hard-deleting a product row would cascade and break the foreign key references in historical `quotation_items` and `order_items` rows. Soft delete (`is_active: false` + `deleted_at: timestamp`) hides the product from the live catalog and seller dashboard while preserving all historical transaction records. Admins can restore soft-deleted products.

### Why Unified Next.js (No Separate Backend)?

A separate backend API server would introduce network latency on every Server Action call, require CORS configuration, duplicate authentication logic, and add deployment complexity. Next.js Server Actions run in the same serverless function as the page — the call is a direct function invocation with no HTTP round trip. This keeps the architecture simple and the latency minimal.

---

## 18. Test Credentials

The database seed script pre-populates three test accounts across all three roles:

| Role | Email | Password | Notes |
|:---|:---|:---|:---|
| **Admin** | `admin@pharma.com` | `Admin@123` | Full platform access |
| **Seller** | `seller@pharma.com` | `Seller@123` | Pre-approved, with sample products |
| **Buyer** | `buyer@pharma.com` | `Buyer@123` | Can browse catalog and place orders |

Passwords are stored as bcrypt hashes in the database. In development mode, the `authorize()` callback also accepts these passwords directly without bcrypt comparison for convenience during local testing.

---

## 19. Environment Variables

Create a `.env` or `.env.local` file in the project root with the following variables:

```env
# Neon PostgreSQL connection string (serverless pooled URL)
DATABASE_URL="postgresql://user:password@ep-hostname.region.aws.neon.tech/neondb?sslmode=require"

# Vercel Blob read/write token (from Vercel dashboard > Storage > Blob)
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_xxxxxxxxxxxxx"

# NextAuth secret — any long random string (used to sign JWTs)
NEXTAUTH_SECRET="your-secret-key-min-32-characters"

# Base URL of the application (required in production)
NEXTAUTH_URL="https://your-app.vercel.app"

# Email SMTP configuration (for Nodemailer)
EMAIL_SERVER_HOST="smtp.yourmailprovider.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="your@email.com"
EMAIL_SERVER_PASSWORD="your-smtp-password"
EMAIL_FROM="AasaMedChem <noreply@yourdomain.com>"
```

**Important:** Never commit `.env` or `.env.local` to version control. Both are listed in `.gitignore`.

In Vercel, add all variables under **Project Settings → Environment Variables**. Set `NEXTAUTH_URL` to your production domain (e.g. `https://aasa-med-chem.vercel.app`).

---

## 20. Local Setup Guide

### Prerequisites

- Node.js 18.x or later
- npm 9.x or later
- A Neon PostgreSQL database (free tier available at [neon.tech](https://neon.tech))
- A Vercel account (for Blob storage token)

### Step 1 — Clone the Repository

```bash
git clone https://github.com/Navjot-kr-Singh/AasaMedChem.git
cd AasaMedChem
```

### Step 2 — Install Dependencies

```bash
npm install --legacy-peer-deps
```

The `--legacy-peer-deps` flag is needed because React 19 and some component libraries have peer dependency declarations that haven't all been updated yet.

### Step 3 — Configure Environment Variables

Copy the example below and create a `.env.local` file:

```bash
cp .env.example .env.local  # or create manually
```

Fill in your `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL` as described in the [Environment Variables](#19-environment-variables) section.

### Step 4 — Push the Database Schema

This creates all 11 tables and 7 enums in your Neon PostgreSQL database:

```bash
npm run db:push
```

Alternatively, to generate a SQL migration file first:

```bash
npm run db:generate
# Then review the generated SQL in ./drizzle/
npm run db:push
```

### Step 5 — Seed the Database

This populates categories, test user accounts, seller profiles, and sample chemical products:

```bash
npm run db:seed
```

The seed script is idempotent — running it multiple times will not create duplicate records.

### Step 6 — Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 21. Database Seeding

The seed script (`db/seed.ts`) creates the following records:

**Categories (6):**
- API, Solvent, Excipient, Intermediate, Laboratory Reagent, Finished Product

**Users (3):**
- Admin Supervisor (`admin@pharma.com`)
- Demo Seller (`seller@pharma.com`) with a pre-approved seller profile
- Demo Buyer (`buyer@pharma.com`)

**Sample Products (multiple):**
- Weight-based products (e.g. Paracetamol API in grams) with realistic inventory quantities
- Volume-based products (e.g. Ethanol Solvent in millilitres)
- Pre-approved for immediate buyer browsing

All passwords are bcrypt-hashed with salt rounds of 10 before insertion.

---

## 22. Deployment to Vercel

### One-Click via GitHub Integration

1. Push your repository to GitHub.
2. Go to [vercel.com](https://vercel.com) and click **Add New Project**.
3. Import your GitHub repository.
4. In the **Environment Variables** section, add all variables from the [Environment Variables](#19-environment-variables) section. Set `NEXTAUTH_URL` to your Vercel deployment URL.
5. Click **Deploy**.

Vercel will automatically detect Next.js and configure the build. All pages marked `ƒ` (dynamic/server-rendered) in the build output run as serverless functions.

### Re-deploying

Push any commit to the `main` branch to trigger an automatic re-deployment. To redeploy without a code change, go to your Vercel dashboard → Deployments → click the three-dot menu on the latest deployment → **Redeploy**.

### Production Checklist

- [ ] `DATABASE_URL` points to the Neon **pooled connection string** (not the direct string) for better connection management under serverless traffic.
- [ ] `NEXTAUTH_SECRET` is a cryptographically random string of at least 32 characters.
- [ ] `NEXTAUTH_URL` is set to the exact production URL including `https://`.
- [ ] `BLOB_READ_WRITE_TOKEN` is a valid Vercel Blob token scoped to your project.
- [ ] The database has been seeded (`npm run db:seed`) or production data has been migrated.

---

## 23. Scripts Reference

| Script | Command | Description |
|:---|:---|:---|
| Development server | `npm run dev` | Starts Next.js in development mode with hot reload |
| Production build | `npm run build` | Compiles and optimises the application for production |
| Production server | `npm run start` | Runs the compiled production build locally |
| Lint | `npm run lint` | Runs ESLint across the codebase |
| Generate migrations | `npm run db:generate` | Generates SQL migration files from schema changes |
| Push schema | `npm run db:push` | Applies schema directly to the database (no migration file) |
| Seed database | `npm run db:seed` | Runs the seed script to populate initial data |

---

*Built by Navjot Kumar Singh — AasaMedChem B2B Pharmaceutical Platform*
