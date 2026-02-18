# High Purchase — Buy Now, Pay Later (BNPL) Platform

A full-stack, multi-tenant **hire-purchase / credit-sales management platform** built for retail businesses. It covers the entire lifecycle from product catalog → credit sale → installment collection → delivery → accounting, with **7 role-based portals** and integrated messaging, POS, wallet, and supply chain features.

> **Live Demo:** [https://high-purchase.vercel.app](https://high-purchase.vercel.app)

---

## Super Admin Login

| Field    | Value                        |
| -------- | ---------------------------- |
| URL      | `/login`                     |
| Email    | `admin@highpurchase.com`     |
| Password | `SuperAdmin123!`             |

---

## What the Project Does

High Purchase is a **multi-tenant SaaS platform** that enables retail businesses (primarily in Ghana) to manage credit sales, installment collections, and day-to-day shop operations. The platform supports a full hierarchy:

**Platform → Business → Shop → Staff → Customers**

### Core Features

- **Credit Sales & Installments** — Customers buy on credit with configurable interest (flat/monthly), grace periods, late fees, and automated due-date tracking. Supports CASH, LAYAWAY, and CREDIT purchase types.
- **Debt Collection** — Dedicated collector portal with assigned customers, payment confirmation workflows, and daily collection reports.
- **POS System** — Point-of-sale module for walk-in cash transactions.
- **Invoicing & Receipts** — Purchase invoices, progress invoices (per payment), waybills, and PDF generation.
- **Customer Wallet / Savings** — Customers can deposit funds into a wallet for future purchases.
- **Full Accounting Suite** — Expenses, budgets, cash-flow analysis, P&L statements, aging reports, bad debts, commissions, disputes, refunds, daily cash summaries, staff performance metrics, and tax reports.
- **Tax System** — Flexible tax rules assignable to products, categories, brands, or shops with compound tax support.
- **Supply Chain** — Supplier management, supply categories/items, reorder levels, and lead times.
- **Messaging (3 Channels)** — Email (SMTP per business), SMS (Hubtel / Arkesel / mNotify), and in-app real-time chat (staff↔staff, staff↔customer).
- **Notifications** — In-app customer notifications with read tracking.
- **Daily Reports** — Sales staff and collectors submit daily reports (DRAFT → SUBMITTED → REVIEWED).
- **Audit Trail** — Full audit logging with actor, action, entity tracking, and metadata.
- **Staff Permissions** — Granular per-staff controls (POS access, wallet loading, can sell, can create customers, accountant privileges).
- **Landing Site** — Public marketing pages (About, Features, Pricing, How It Works, Contact).

---

## 7 Role-Based Portals

| Portal           | Route                          | Description                                                     |
| ---------------- | ------------------------------ | --------------------------------------------------------------- |
| **Super Admin**  | `/super-admin`                 | Platform-wide management — businesses, users, audit logs        |
| **Business Admin** | `/business-admin/[slug]`     | Full business operations — shops, staff, products, sales, accounting |
| **Accountant**   | `/accountant/[slug]`           | Financial reports, cash flow, aging, expenses, budgets, tax     |
| **Shop Admin**   | `/shop-admin/[slug]`           | Shop-level management — staff, products, invoices, waybills     |
| **Sales Staff**  | `/sales-staff/[slug]`          | Point-of-sale, new sales, customers, deliveries, daily reports  |
| **Debt Collector** | `/collector/[slug]`          | Payment collection, customer visits, receipts, wallet, reports  |
| **Customer**     | `/customer/[slug]`             | View purchases, make payments, chat with staff, notifications   |

---

## Technologies Used

| Category       | Technology                                         |
| -------------- | -------------------------------------------------- |
| **Framework**  | [Next.js 16.1.1](https://nextjs.org) (App Router)  |
| **Language**   | TypeScript 5                                       |
| **Database**   | PostgreSQL (hosted on Prisma Postgres)              |
| **ORM**        | [Prisma 7](https://www.prisma.io) (46 models)      |
| **Styling**    | [Tailwind CSS 4](https://tailwindcss.com)           |
| **UI Components** | [Radix UI](https://www.radix-ui.com) + [shadcn/ui](https://ui.shadcn.com) |
| **Auth**       | Custom JWT (jose) + bcrypt password hashing         |
| **Charts**     | [Recharts](https://recharts.org)                    |
| **PDF Gen**    | jsPDF + jsPDF-AutoTable                             |
| **Email**      | Nodemailer (SMTP per business)                      |
| **Icons**      | [Lucide React](https://lucide.dev)                  |
| **Deployment** | [Vercel](https://vercel.com)                        |

---

## How to Run

### Prerequisites

- Node.js 18+
- PostgreSQL database (or a Prisma Postgres instance)

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd high_purchase
npm install
```

### 2. Environment Variables

Create a `.env` file in the root:

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname"
JWT_SECRET="your-jwt-secret-key"

# Super Admin seed credentials
SUPERADMIN_EMAIL="admin@highpurchase.com"
SUPERADMIN_PASSWORD="SuperAdmin123!"
SUPERADMIN_NAME="Super Admin"
```

### 3. Database Setup

```bash
# Push the schema to your database
npx prisma db push

# Generate the Prisma client
npx prisma generate

# Seed the super admin account
npm run seed:superadmin
```

### 4. Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### 5. Build for Production

```bash
npm run build
npm start
```

---

## Project Structure

```
high_purchase/
├── app/
│   ├── (landing)/          # Public marketing pages
│   ├── super-admin/        # Platform admin portal
│   ├── business-admin/     # Business owner portal
│   ├── accountant/         # Accountant portal (21 report types)
│   ├── shop-admin/         # Shop manager portal
│   ├── sales-staff/        # Salesperson portal
│   ├── collector/          # Debt collector portal
│   ├── customer/           # Customer self-service portal
│   ├── customer-portal/    # Customer entry page
│   ├── login/              # Authentication
│   ├── change-password/    # Password management
│   └── api/                # API routes (auth, users, etc.)
├── components/
│   ├── ui/                 # Reusable UI components (shadcn/ui)
│   └── messaging/          # Chat/messaging components
├── lib/                    # Utilities, auth, Prisma client, PDF generation
├── prisma/
│   └── schema.prisma       # Database schema (46 models, 26 enums)
├── scripts/                # Seed scripts (super admin, shop admin)
└── public/                 # Static assets
```

---

## Database Models (46)

User, Business, BusinessPolicy, Tax, ProductTax, CategoryTax, BrandTax, ShopTax, BusinessMember, Shop, Category, Brand, Customer, Product, ShopProduct, ShopMember, DailyReport, ShopPolicy, AuditLog, Purchase, PurchaseItem, Payment, ProgressInvoice, PurchaseInvoice, Waybill, Message, Conversation, InAppMessage, Notification, EmailSettings, EmailLog, SmsSettings, SmsLog, PosTransaction, PosTransactionItem, Supplier, SupplyCategory, SupplyItem, WalletTransaction, Expense, Budget, PaymentDispute, Refund, AccountantNote, DailyCashSummary, Commission

---

## My Contributions

This is a solo full-stack project. I personally designed and implemented:

- Complete database schema architecture (46 models with complex relations)
- All 7 role-based portals with dynamic routing and permission guards
- Custom authentication system with JWT tokens and role-based access control
- Full accounting module with 21+ financial report types
- Real-time in-app messaging system (staff-to-staff and staff-to-customer)
- PDF invoice and receipt generation
- Mobile-responsive design across all portals
- Multi-channel notification system (email, SMS, in-app)
- POS system for cash transactions
- Customer wallet/savings feature
- Debt collection workflow with daily reporting
- Landing page and marketing site
- Deployment and CI/CD on Vercel

---

## License

This project is private and not licensed for redistribution.
