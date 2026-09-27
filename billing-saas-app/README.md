# 💎 JewelBill SaaS — Enterprise Jewellery Billing, Inventory & ERP Platform

> A modern, multi-tenant cloud SaaS platform engineered specifically for gold, silver, and diamond jewellery retailers. Built with Next.js 16 (Turbopack), TypeScript, Prisma ORM, PostgreSQL, and a tailored luxury light design system.

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18.x or higher
- PostgreSQL database instance

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/RAJRS20/Billing-SaaS.git
cd Billing-SaaS/billing-saas-app

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Run Prisma schema migrations
npx prisma migrate dev

# Start local development server
npm run dev
```

Visit **`http://localhost:3000`** in your browser.

### 3. Demo Credentials
- **Showroom:** Sri Lakshmi Jewellers (Main Showroom)
- **Email:** `admin@srilakshmi.com`
- **Password:** `Admin@123`

---

## 🌟 Core Modules & Screen Map

| Module | Route | Description |
|:---|:---|:---|
| **Overview Dashboard** | `/dashboard` | Daily revenue, gold sold weight, advances, low-stock alerts, live gold ticker |
| **Gold Rates Master** | `/gold-rates` | Karat-wise spot rates (24K, 22K, 18K, 14K), historical log, live invoice lock |
| **POS Billing** | `/billing` | Real-time pricing engine, barcode/HUID scanning, split payments, thermal receipt |
| **Invoices Ledger** | `/invoices` | Tax invoice history, payment status chips, thermal/A4 PDF print triggers |
| **Estimates & Quotes** | `/estimates` | 7-day rate-locked estimates, WhatsApp sharing, one-click convert to POS bill |
| **Returns & Exchanges** | `/returns` | Sales returns, item inspection, credit notes, jewellery exchange valuation |
| **Products Master** | `/products` | Jewellery articles catalogue, HUID tracking, stone certification, barcode tag generator |
| **Stock & Movements** | `/inventory` | All stock with 11 statuses, immutable movement ledger, manager stock adjustments |
| **Purchases & Inwarding**| `/purchases` | Purchase orders, purity verification during inwarding, gross/net weight calculation |
| **Suppliers Directory** | `/suppliers` | Bullion and ornament vendor profiles, GSTIN, credit terms, payable balance ledger |
| **Old Gold Valuation** | `/old-gold` | Purity test fineness, pure gold equivalent, melting deductions, exchange credits |
| **Customers CRM** | `/customers` | 360° customer profile, DOB/anniversary reminders, KYC PAN, receivable ledger |
| **Orders & Advances** | `/orders` | Custom jewellery orders lifecycle (`Pending` → `In Progress` → `Ready` → `Delivered`) |
| **Operating Expenses** | `/expenses` | Expense categorization (Rent, Salary, Hallmarking, Transport), receipt logging |
| **Reports & Audits** | `/reports` | Mathematical gold reconciliation (`Opening + In − Out = Closing`), P&L, GSTR-1 |
| **Settings & Compliance**| `/settings` | Showroom legal identity, BIS Hallmark license, GST rates, Sec 269ST PAN limit, RBAC |

---

## 📐 Mathematical Pricing Engine Formula

$$\text{Net Gold Weight} = \text{Gross Weight} - \text{Stone Weight}$$
$$\text{Chargeable Gold Weight} = \text{Net Gold Weight} + \text{Wastage Grams}$$
$$\text{Gold Value} = \text{Chargeable Gold Weight} \times \text{Rate Per Gram}$$
$$\text{Gross Amount} = \text{Gold Value} + \text{Making Charge} + \text{Stone Charge}$$
$$\text{Taxable Value} = \text{Gross Amount} - \text{Discount}$$
$$\text{Total Invoice Amount} = \text{Taxable Value} + \text{CGST (1.5\%)} + \text{SGST (1.5\%)}$$

---

## 🔒 Statutory Compliance Guardrails

- **BIS Hallmarking & HUID:** 6-character alphanumeric Hallmark Unique ID mapped on every ornament.
- **Income Tax Section 269ST & Rule 114B:** Mandatory customer PAN collection for cash bills exceeding ₹2,00,000.
- **GST Standard (HSN 7113):** 3% GST on jewellery (1.5% CGST + 1.5% SGST for intra-state; 3% IGST for inter-state) and 5% GST on making charges.
- **Mathematical Gold Balance:** System strictly prevents direct stock editing; audits enforce:
  $$\text{Opening Stock} + \text{Inflows} - \text{Outflows} \pm \text{Auditable Adjustments} = \text{Expected Closing}$$

---

## 🛠️ Technology Stack

- **Framework:** Next.js 16 (App Router + Turbopack)
- **Language:** TypeScript 5.x (Strict type safety, 0 compiler errors)
- **Database ORM:** Prisma ORM 6.x
- **Database:** PostgreSQL with row-level multi-tenancy
- **Styling:** Vanilla CSS design tokens + Tailwind CSS v4
- **Icons:** Lucide React
- **Authentication:** HTTP-only encrypted JWT session cookies (jose HS256)
- **Printing:** ESC/POS 3-Inch Thermal Receipt and A4 Laser PDF formatting

---

*JewelBill SaaS Platform · Document Version 2.0 · Maintained by Core Engineering*
