# Bajaj WMS — Backend (Express + MongoDB)

Replaces the earlier Firebase/Cloudflare-Workers API. Plain Node.js —
runs anywhere Node runs, deploys cleanly to Render's free tier.

## Why not Cloudflare Workers this time

MongoDB's **Atlas Data API** — the HTTPS-based way serverless platforms
used to talk to MongoDB without a persistent connection — was **fully
retired by MongoDB on September 30, 2025**. Without it, talking to MongoDB
means the standard driver, which needs a real, long-lived Node process
(connection pooling, TCP) — not something Workers is built for. So this is
a normal Express server instead, and Cloudflare's job goes back to just
DNS + hosting the frontend (Cloudflare Pages), which it's still great at.

## Stack

- **Express** — HTTP routing
- **Mongoose** — MongoDB models/validation/transactions
- **jsonwebtoken** + **bcryptjs** — login sessions, no Firebase Auth needed
- **MongoDB Atlas free tier (M0)** — 512MB, free forever, no credit card required for the free cluster

## 1. Set up MongoDB Atlas (free)

1. Go to **mongodb.com/cloud/atlas/register** → create an account.
2. **Create a cluster** → choose the **M0 Free** tier → pick a nearby region → **Create**.
3. **Database Access** (left sidebar) → **Add New Database User** → set a username/password (save these).
4. **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`) — simplest for a Render-hosted backend that has no fixed IP on the free tier.
5. **Database → Connect → Drivers** → copy the connection string, looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Add your database name before the `?`: `.../bajaj_wms?retryWrites=true...`

## 2. Local setup

```bash
npm install
cp .env.example .env
```
Fill in `.env`:
- `MONGODB_URI` — the connection string from step 1
- `JWT_SECRET` — generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- `CORS_ALLOWED_ORIGIN` — your frontend's URL (`http://localhost:5173` for local dev)

Seed sample data and the four starter accounts:
```bash
npm run seed
```
This creates one branch (`AA-MAIN`) and prints four logins, all with
password `ChangeMe123!` — **change these immediately** once you build a
"change password" flow, or update them directly in Atlas in the meantime:

| Email | Role |
|---|---|
| `admin@bajajwms.local` | Admin |
| `ceo@bajajwms.local` | Executive |
| `manager@bajajwms.local` | Manager (AA-MAIN branch) |
| `store@bajajwms.local` | Employee (AA-MAIN branch) |

Run it:
```bash
npm run dev        # http://localhost:4000, auto-restarts on save
```

## 3. Deploy to Render (free)

1. Push this folder to GitHub (part of the same `bajaj-wms` repo, in `wms-backend/`).
2. **dashboard.render.com** → **New → Web Service** → connect your GitHub repo.
3. Set:
   - **Root Directory**: `wms-backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
4. Add environment variables (Render dashboard → **Environment**): `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ALLOWED_ORIGIN`.
5. **Create Web Service**. Render gives you a URL like `https://bajaj-wms-backend.onrender.com`.
6. Run the seed script once against production (either via Render's **Shell** tab, or locally with `MONGODB_URI` pointed at Atlas): `npm run seed`.

**Free-tier note**: Render's free web services spin down after 15 minutes
of no traffic and take ~30–60 seconds to wake back up on the next request.
Fine for a demo/internal tool; if that cold-start delay is a problem for
real warehouse floor use, upgrade that one service to a paid instance —
everything else (MongoDB Atlas M0, Cloudflare Pages) stays free either way.

## Roles and branches

Four roles, described in detail in the app itself, but in short:

| Role | Scope | Can do |
|---|---|---|
| **admin** | Company-wide | Manage staff logins, parts catalog, warehouse bins, branches |
| **executive** | Company-wide (read-only) | View dashboards/reports across every branch — no edit rights |
| **manager** | One branch | Everything employee can, plus approve/cancel purchase orders and manually adjust stock, for their branch only |
| **employee** | One branch | Receive stock, pick orders, add/edit vehicles, raise purchase orders — for their branch only |

Every operational record (`Vehicle`, `WarehouseLocation`, `InventorySnapshot`,
`StockMovement`, `PurchaseOrder`) carries a `branchCode`. The parts catalog
(`SparePart`) is intentionally company-wide — one shared catalog, stock
levels tracked per branch. `manager`/`employee` accounts are locked to
their own branch on every request (`src/middleware/branchScope.js`);
`admin`/`executive` see everything, or one branch at a time via a
`?branch=` query param.

Adding a second branch later is just: **POST /api/branches** (admin), then
create a Manager/Employee account with that `branchCode`, then add
warehouse locations for it. No migration needed — the schema's already there.

## API reference

All routes except `/healthz` and `/api/auth/login` require
`Authorization: Bearer <token>` from a successful login.
`/api/auth/register` additionally requires an admin token.

| Method | Path | Roles | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | — | Get a session token |
| POST | `/api/auth/register` | admin | Create a new staff login |
| GET | `/api/auth/me` | any | Validate the stored token on page load |
| GET | `/api/dashboard/summary?branch=` | any | Landing-page stats, branch-scoped or company-wide |
| GET | `/api/branches` | any | List branches |
| POST | `/api/branches` | admin | Open a new branch |
| GET/POST/PUT | `/api/vehicles` | any / admin+manager+employee | Fleet records |
| GET/POST/PUT | `/api/spare-parts` | any / admin | Parts catalog (company-wide) |
| GET/POST | `/api/warehouse-locations` | any / admin | Bin layout |
| POST | `/api/inventory/receive` | admin+manager+employee | Inbound shipments |
| PUT | `/api/inventory/stock-adjust` | admin+manager | Manual stock correction |
| GET | `/api/inventory/low-stock` | any | Reorder alert feed |
| GET | `/api/inventory/search` | any | Compatibility matrix |
| POST | `/api/orders/pick-list` | any | Generate a picking route |
| GET/POST | `/api/purchase-orders` | any / admin+manager+employee | PO tracking |
| PUT | `/api/purchase-orders/:id/approve` | admin+manager | Approve a submitted PO |
| PUT | `/api/purchase-orders/:id/cancel` | admin+manager | Cancel a PO |
| GET | `/api/users` | admin | Staff list |
| PUT | `/api/users/:id/deactivate` | admin | Disable a login |

## Notes

- **No public sign-up.** The only way to create a login is `POST /api/auth/register`, which itself requires an admin token — so the very first account has to come from the seed script.
- **Soft-disable, not delete**, for users (`isActive: false`) — keeps `StockMovement.performedBy` references valid for the audit trail.
- Transactions (`session.withTransaction`) require Atlas — a standalone local `mongod` without a replica set will reject them. Atlas's free tier is already a replica set, so this only matters if you try to run fully offline against a bare local Mongo install.
