# PARUVO Monorepo

Bangladesh-localized multi-vendor marketplace for a university database-backed ecommerce project.

## Stack

- `client/`: React + Vite + TypeScript + Tailwind + React Query + Zustand
- `server/`: Express + PostgreSQL + JWT + bcrypt
- `schema.sql`: full database schema, including `products.is_active`
- `server/seeds/demo_seed.js`: repeatable demo marketplace seed

## What Changed

- Product APIs now support search, category/seller filters, price range, sorting, pagination, home-feed sections, and rich product detail.
- Cart and checkout now return enriched product data and use `get_cart_total(...)` plus `proc_create_order(...)` in a real checkout flow with stock validation, payment rows, and shipment rows.
- Seller flows now include dashboard metrics, low-stock alerts, product management, inventory editing, and analytics driven by aggregate SQL.
- Admin flows now include overview metrics, seller moderation, category creation, warehouse creation, and analytics.
- The frontend now uses BDT / `৳` everywhere through a shared formatter.
- Seed data now creates a populated marketplace with Bangladesh-grounded sellers, warehouses, products, media, variants, inventory, orders, reviews, and Q&A.

## Environment

Create `server/.env` from `.env.example` and set:

- `PORT`
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `DATABASE_URL`

## Database Setup

### Fresh database

1. Create an empty PostgreSQL database.
2. Run:

```bash
psql "$DATABASE_URL" -f schema.sql
```

## Demo Seed

The seed resets marketplace demo tables and repopulates them. Run it only on a development/demo database.

```bash
cd server
npm install
npm run seed:demo
```

Seed highlights:

- 10 sellers
- 27 products
- 7 warehouses
- DB-backed product media and specifications
- realistic BDT pricing
- orders, payments, shipments, returns, wishlists, reviews, product questions, and seller payouts

## Run The App

### Server

```bash
cd server
npm install
npm run dev
```

### Client

```bash
cd client
npm install
npm run dev
```

Client runs on `http://localhost:5173` and proxies `/api` to the server on `http://localhost:5000`.

## Seeded Login Hints

### Buyer

- email: `partho@example.com`
- password: `user12345`

### Seller

- email: `hello@dhakadigitalhub.bd`
- password: `seller123`

### Pending seller example

- email: `pending@jamunaaccessories.bd`
- password: `seller123`

### Admin

Use the values you set in `server/.env` for:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

## Checklist Coverage

### Authentication

- JWT auth remains fully app-owned.
- No third-party auth service was introduced.

### Auth validation

- Protected frontend routes still use role-based guards.
- Protected backend routes use `authMiddleware` + role checks.
- Seller-only product/analytics routes also enforce verified-seller checks where needed.

### Transaction control

- All insert/update/delete flows added or updated in the backend use explicit `BEGIN`, `COMMIT`, and `ROLLBACK`.

### Trigger

- Existing order audit trigger remains active through `order_audit`.

### Function

- `get_cart_total(...)` is still used by cart totals and checkout validation.

### Procedure

- `proc_create_order(...)` is called during checkout inside the application transaction.

### Complex queries

- Existing admin aggregates remain.
- Added complex seller analytics, seller dashboard summaries, home feed, enriched product listing/detail, and order reporting queries.

## Verification Notes

- `node --check` passed for the server controller/route files and `server/seeds/demo_seed.js`.
- `node ./node_modules/typescript/bin/tsc --noEmit` passed in `client/`.
- `npm run build` in `client/` reached Vite but failed in this sandbox because `esbuild` could not spawn a child process (`spawn EPERM`). The TypeScript compile itself passed.

## Future Enhancements

- richer seller product editor UX with removable attribute/spec rows
- shipment timeline events beyond the current shipment status row
- coupon and discount management UI tied to `discounts`
- image upload pipeline instead of URL-based media entry
