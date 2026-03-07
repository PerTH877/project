# Nexus Market - Premium E-commerce Frontend

A visually exceptional, production-grade frontend built for the Nexus Market e-commerce API. This application prioritizes elegant design, robust client-side architecture, and excellent user experience across three distinct roles: Customers, Sellers, and Administrators.

## Architecture & Tech Stack

- **Framework:** React 18 + Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS + custom design tokens (HSL palette)
- **Data Fetching:** TanStack React Query v5
- **State Management:** Zustand (localStorage persisted)
- **Routing:** React Router v6
- **Forms & Validation:** React Hook Form + Zod
- **Components:** shadcn/ui primitives + Custom composites
- **Icons:** Lucide React
- **Charts:** Recharts (Admin Dashboard)
- **Notifications:** Sonner

## Features by Role

### 🛒 Customer
- Browse catalog with responsive, clean product grids
- View product variants with dynamically adjusting pricing formulas
- Add to cart, view total (synced via server DB functions)
- Full checkout flow utilizing saved addresses
- Address management (CRUD with default flag)
- Wishlists management

### 🏪 Seller
- Dedicated portal login and registration
- "Pending Verification" blocker flow enforced at the UI layer
- Seller Dashboard to manage products
- Comprehensive product editor: Title, Category, Base Price, and multi-variant SKUs
- Graceful API fallback shells for in-development endpoints (Inventory UI)

### 🛡️ Administrator
- Secure Admin login portal with a high-end dark interface
- Real-time Analytics Dashboard utilizing complex backend SQL joints:
  - Top Categories by product volume
  - Top Sellers by gross sales
  - Most Popular Products by cart/wishlist additions
- Seller Moderation: Review and approve/reject pending store applications

## Getting Started

### 1. Prerequisites
Ensure the backend server is running and accessible on `http://localhost:5000` (default proxy setting). Or modify `vite.config.ts` if your backend is hosted elsewhere.

### 2. Installation
```bash
# Inside the /client directory
npm install
```

### 3. Running Locally
```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

## Design Philosophy

This frontend was built specifically to avoid the "generic CRUD" feeling. 
- Deep attention paid to **spacing, typography (Inter), and visual hierarchy**.
- Integrated **Subtle micro-animations**, custom animated skeletons (`shimmer`), and smooth page transitions.
- Carefully curated colour palette operating on HSL curves to ensure mathematical contrast ratios and accessibility.
- **Graceful Error Recovery:** All server misses or unbuilt endpoints are explicitly handled with styled `EmptyState` or Contextual warnings rather than console errors.

## Notes on Backend Limitations
To adhere strictly to the real backend contract without hallucinating endpoints:
1. Product images are handled via gradient placeholders (calculated consistently off `product_id`).
2. Discount code inputs are visually present but blocked functionally.
3. Seller product listings and analytics utilize visually distinct "Coming Soon" or "Under Construction" shells to gracefully cover the unimplemented server routes.
