<div align="center">
  <img src="guzo-logo.svg" alt="GUZO WMS logo" width="88" height="88" />

  # GUZO WMS
  **Warehouse Management System — GUZO Import and Export / Trading**
</div>

---

Tracks Bajaj motorcycles and three-wheelers as complete units, spare parts
down to the individual warehouse bin, and every purchase order from
request through approval to arrival — across one or more branches, with
role-based access for floor staff, branch managers, admins, and company
leadership.

## Repository layout

```
guzo-wms/
  wms-backend/       Express + MongoDB API — deploys to Render
  wms-frontend/      React + Tailwind console — deploys to Cloudflare Pages
  guzo-logo.svg       Company/app logo (also used as the in-app favicon)
  GETTING_STARTED.md  How to set the whole thing up, start to finish
  USER_GUIDE.md       How to actually use the app day to day
```

## Where to look, depending on what you're doing

| I want to... | Read this |
|---|---|
| Get the system running for the first time (GitHub → MongoDB → Render → Cloudflare) | [`GETTING_STARTED.md`](./GETTING_STARTED.md) |
| Learn how to use the app — roles, screens, workflows | [`USER_GUIDE.md`](./USER_GUIDE.md) |
| Understand the API, data model, or environment variables | [`wms-backend/README.md`](./wms-backend/README.md) |
| Understand the frontend's structure or design decisions | [`wms-frontend/README.md`](./wms-frontend/README.md) |

## Stack at a glance

- **Frontend**: React + TypeScript + Tailwind CSS, built with Vite, deployed on Cloudflare Pages
- **Backend**: Node.js + Express + Mongoose, deployed on Render (free tier)
- **Database**: MongoDB Atlas (free M0 tier)
- **Auth**: JWT-based login, no third-party auth provider
- **Email**: Gmail SMTP for purchase-order approval notifications

## Roles

Four account types — Store Keeper, Branch Manager, Admin, and Executive —
each scoped to their own branch except Admin/Executive, who see across
the whole company. Full breakdown in `USER_GUIDE.md` §2.

## Status

Actively developed. Known gaps are listed candidly in `USER_GUIDE.md` §7
rather than hidden — check there before assuming something's missing by
accident.
