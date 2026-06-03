# Pharma Inventory & Quotation Management System

A production-ready, full-stack B2B pharmaceutical marketplace and inventory management portal where buyers procure products from verified independent sellers under administrative compliance. 

Built with **Next.js 15 (App Router)**, **TypeScript**, **Neon PostgreSQL**, **Drizzle ORM**, **Auth.js (NextAuth)**, and **Tailwind CSS**.

---

## 🏗️ Architecture & Clean Design

The application follows a clean architecture pattern separating database representations, business calculations, route security guards, server-side actions, and interactive user interfaces.

```
app/                 # Next.js 15 App Router views and API handlers
components/          # Shared components (Sidebar, Charts, Onboarding)
lib/                 # Core utilities (auth, decimal math, unit conversions, pricing engine)
db/                  # Database connections and Drizzle schema configuration
drizzle/             # Auto-generated Drizzle Kit database migration SQL files
actions/             # Server Actions hosting transactional B2B business logic
types/               # Shared TypeScript typings
```

---

## 🛠️ Key Technical Decisions & Engineering Reasoning

### 1. Precision Handling: Why `NUMERIC(30,10)` and `decimal.js`?
Pharmaceutical transactions mandate strict accuracy. Micrograms of APIs (Active Pharmaceutical Ingredients) can value thousands of Rupees, while bulk orders can reach metric tons.
* **The Floating-Point Problem**: Standard JavaScript floats use binary double-precision (IEEE 754), resulting in rounding issues (e.g., `0.1 + 0.2 === 0.30000000000000004`). In a B2B pharmaceutical setting, this leads to billing discrepancies and regulatory violations.
* **Database Choice**: We use PostgreSQL `NUMERIC(30,10)` for all quantities, prices, reservations, and totals. This supports up to 20 digits before the decimal and exactly 10 digits after it, accommodating both ultra-small doses (e.g., `0.0000001234 g`) and massive commercial shipments.
* **Application Choice**: In Node.js/TypeScript, numeric values are retrieved as `string` from the database. We parse them into `Decimal` instances via the `decimal.js` library, executing all arithmetic operations (unit conversions, price multipliers, additions) under an anchored 40-digit precision. We write values back to PostgreSQL as strings using `.toString()`.

### 2. Concurrency-Safe Inventory & Reservation System
To prevent double-selling stock when multiple buyers checkout concurrently, the platform implements database row-level locking.
* **Database Locking (`SELECT FOR UPDATE`)**: During checkouts, reservations, or manual stock corrections, we execute database queries wrapped in Drizzle transactions, appending the `FOR UPDATE` modifier to lock the target product row:
  ```sql
  SELECT id, inventory_quantity, reserved_quantity FROM products WHERE id = ? FOR UPDATE;
  ```
  This blocks other write transactions on the same product until the current transaction commits or rolls back.
* **Validation**: Inside the locked transaction, we check that `available_quantity = inventory_quantity - reserved_quantity` is greater than or equal to the requested quantity. If validation fails, the transaction rolls back, throwing an error.
* **Stock Reservations**:
  * **Quote Approval**: Moves the negotiated quantity from `available` into `reserved_quantity`, writing an `inventory_transaction` ledger entry of type `quotation_reservation`.
  * **Quote Expiration/Denial**: Decrements `reserved_quantity`, releasing the stock.
  * **Direct Order / Quote Checkout**: Subtracts the quantity directly from `inventory_quantity`, writing a transaction ledger entry of type `order`. This preserves inventory integrity.

### 3. Inventory Transaction Ledger & Audit Trails
We never execute destructive edits or simple writes to stock values without recording why. Every stock change creates an immutable entry in the `inventory_transactions` table:
* **Types**: `stock_added`, `stock_removed`, `order`, `quotation_reservation`, `quotation_release`, and `adjustment`.
* **Traceability**: Contains foreign key references to products, orders, and quotations, logging who performed the action, the timestamp, and detailed auditor notes.
* **Activity Logging**: Complementing stock movements, a global `activity_logs` table logs administrative actions (e.g., *Admin Approved Seller*, *Seller Uploaded GST*, *Admin Rejected Product*) for complete audit compliance.

### 4. Soft Delete Strategy
Sellers or Admins may remove products from the catalog. However, deleting records physically would break historical orders and quotation records.
* **Implementation**: We add `is_active` (boolean) and `deleted_at` (timestamp) fields to `products`.
* **Behavior**: Soft-deleted products are hidden from the buyer catalog and seller inventory charts but their database row remains, keeping all foreign key references in historical receipts valid. Admins retain permissions to restore these products.

### 5. Price History Protection
Product prices change over time. If a product base price changes, historical quotations and orders must not change.
* **Strategy**: We snapshot the `unit_price` and `total_price` in the `quotation_items` and `order_items` tables at the moment the request or purchase is made. The UI always reads these snapshotted records, preventing retroactive price changes.

### 6. INR Formatting Standard
All monetary displays across the buyer, seller, and admin interfaces are formatted according to the Indian Rupee (INR) standard (e.g., `₹1,25,000.00` or `₹50.00`) using the centralized `formatINR` utility wrapping `Intl.NumberFormat("en-IN")`.

---

## 📊 Database Schema

```mermaid
erDiagram
    users ||--o| seller_profiles : "has profile"
    users ||--o| activity_logs : "creates"
    users ||--o| quotations : "submits"
    users ||--o| orders : "places"
    
    seller_profiles ||--o| seller_documents : "contains"
    seller_profiles ||--o| products : "owns"
    categories ||--o| products : "classifies"
    
    products ||--o| inventory_transactions : "logs stock"
    products ||--o| quotation_items : "negotiated in"
    products ||--o| order_items : "purchased in"
    
    quotations ||--o| quotation_items : "contains"
    quotations ||--o| orders : "converts to"
    
    orders ||--o| order_items : "contains"
```

---

## 🔑 Test Credentials & Setup

The database seeding script pre-populates three accounts for testing:

| Role | Email | Password | Vetting Status |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@pharma.com` | `Admin@123` | N/A (Admin bypass) |
| **Seller** | `seller@pharma.com` | `Seller@123` | APPROVED |
| **Buyer** | `buyer@pharma.com` | `Buyer@123` | N/A |

---

## ⚙️ Local Setup Instructions

### 1. Environment Variables
Create a `.env.local` file in the project root:
```env
DATABASE_URL="postgresql://user:pass@ep-hostname.us-east-2.aws.neon.tech/neondb?sslmode=require"
BLOB_READ_WRITE_TOKEN="vercel_blob_token_here"
NEXTAUTH_SECRET="some_long_random_hash_key_here"
NEXTAUTH_URL="http://localhost:3000"
```

### 2. Dependency Setup
Install project dependencies:
```bash
npm install --legacy-peer-deps
```

### 3. Database Migration
Deploy schema models and constraints to Neon PostgreSQL:
```bash
# Generate SQL migration file
npm run db:generate

# Push migrations directly to Neon database
npm run db:push
```

### 4. Database Seeding
Insert categories, test accounts, and mock chemical items:
```bash
npm run db:seed
```

### 5. Running the Application
Launch the local Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚀 Vercel Deployment

1. Initialize a Git repository and push the project to GitHub.
2. Link the repository to your Vercel Account.
3. In the project dashboard under **Settings > Environment Variables**, add the four required variables: `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL`.
4. Click **Deploy**.
