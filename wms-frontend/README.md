# Bajaj WMS Console — Frontend

React + Tailwind + Lucide SPA: Login, Dashboard, Compatibility Matrix,
Low-Stock Command Center, Digital Picking Slip, and Admin screens
(Vehicles, Spare Parts, Staff Logins). Built with Vite. Talks to the
Express/MongoDB backend in `wms-backend/`.

## Setup

```bash
npm install
echo "VITE_API_BASE_URL=http://localhost:4000" > .env.local   # or your Render URL
npm run dev
```

`npm run build` produces a static bundle in `dist/` — deploy that
directory to Cloudflare Pages (or connect the repo via Git for
auto-deploys — see the root `GETTING_STARTED.md`).

## Auth

`src/context/AuthContext.tsx` handles login/logout and session restore.
The JWT from the backend is stored in `localStorage` and attached to every
API request automatically by `src/lib/apiClient.ts` — no per-component
wiring needed. On a 401 from any request, the app logs the user out
automatically (session expired) rather than leaving them stuck on a
broken screen.

Roles come back on the user object from `/api/auth/login` and
`/api/auth/me`: `"admin"` or `"employee"`. `AppShell` filters navigation
items by role — Spare Parts catalog management and Staff Logins are
admin-only; everything else is available to both.

## Design direction

Unchanged from the original build — this is a floor tool, not a
marketing page: warm graphite background rather than pure black, three
accent colors that each mean one thing consistently (amber = action/
attention, red = critical, teal = success/available), Space Grotesk for
headings, IBM Plex Sans for body copy, and **IBM Plex Mono for every part
number, SKU, chassis number, and bin code**. The `BinTag` chip
(`src/components/shared/BinTag.tsx`) — styled like a physical shelf
label — is the one repeated motif tying the inventory, alerts, and
picking views together as views onto the same physical location.

## Folder guide

```
src/
  context/AuthContext.tsx        Login state, session restore, logout
  components/
    auth/LoginPage.tsx            Sign-in screen
    dashboard/Dashboard.tsx        Post-login landing page (stats + activity)
    inventory/InventoryMatrix.tsx  View 1 — Compatibility Matrix
    lowstock/LowStockCommandCenter.tsx  View 2 — Low-Stock alerts + PO generation
    picking/PickingSlip.tsx         View 3 — Digital Picking Slip
    admin/                          Vehicles / Spare Parts / Staff Logins CRUD (mostly admin-only)
    shell/AppShell.tsx              Nav, role filtering, connection status, logout
    shared/                         BinTag, category/weight badges, stock-health bar
  lib/
    apiClient.ts                   Fetch wrapper — attaches the JWT, normalizes errors
    mockData.ts                    Fallback demo data if a request fails, so views stay reviewable
  types.ts                          Mirrors the backend's response shapes
```

## Every view degrades gracefully

If a request to the backend fails (not deployed yet, wrong
`VITE_API_BASE_URL`, cold-starting on Render's free tier), the
Compatibility Matrix, Low-Stock, and Picking Slip views fall back to
labeled demo data rather than showing a blank screen — look for the amber
"Showing demo data" banner. That's expected during setup, not a bug.
