# GUZO WMS — User Guide

This is a guide for people actually **using** the system day to day —
warehouse staff, managers, and company leadership. If you're looking for
how to *set up or deploy* the system, see `GETTING_STARTED.md` and the
`README.md` files inside `wms-backend/` and `wms-frontend/` instead.

---

## 1. What this system does

GUZO WMS tracks everything moving through the warehouse: Bajaj motorcycles
and three-wheelers as complete units, spare parts down to the individual
bin they sit in, and every purchase order raised to restock them. Four
kinds of people use it, each seeing only what's relevant to their job.

## 2. The four account types

| Role | Who this is | What they see |
|---|---|---|
| **Store Keeper** (Employee) | Warehouse floor staff | Their own branch only — receive stock, pick orders, view the catalog |
| **Branch Manager** | Runs one branch | Everything a Store Keeper sees, plus approving purchase orders and correcting stock counts |
| **Admin** | IT/system administrator | Everything, every branch — plus staff logins, the parts catalog, warehouse bins, and branches themselves |
| **Executive** (CEO/COO) | Company leadership | Read-only view across every branch, with a switcher to check one branch at a time |

You'll only ever see the menu items relevant to your role — if something
mentioned below isn't in your sidebar, that's expected, not a bug.

## 3. Logging in

1. Open the site link your admin gave you.
2. Enter the email and password they set up for you.
3. **First thing to do**: click **Change Password** in the sidebar and set
   something only you know — especially if you were given a temporary
   password to start with.

If you forget your password, there's no "forgot password" email link yet —
ask your Admin to reset it for you (**Staff Logins → 🔑 icon** on your row).

---

## 4. Screen-by-screen guide

### Dashboard
Your landing page after login. Shows vehicles in stock, active spare
parts, low-stock alert count, and a feed of the most recent stock
movements (who did what, when). **Admins and Executives** get a branch
switcher at the top — pick a specific branch, or leave it on "All
Branches" for the company-wide picture.

### Compatibility Matrix
Answers "what parts fit this bike, and do we have any?" Pick a Bajaj
model from the dropdown, or just type an OEM part number, SKU, or part
name in the search box. Results show:
- Every matching part, with its category
- **Cross-referenced numbers** — click "N linked" to see superseded or
  alternate part numbers for the same item
- How many are available, and in which bin(s) — the small tagged chip
  (e.g. `Z2-A03-R02-S4`) is the exact shelf location

### Low Stock Command Center
Lists every part that's dropped below its safety threshold, worst first.
Each card shows current stock vs. minimum, and a **Generate PO** button —
click it, confirm the quantity, and it creates a purchase order
automatically emailed to your branch's Manager and every Admin for
approval. There's also a **"Generate PO for all critical"** button at the
top if several parts need reordering at once.

### Digital Picking Slip
For fulfilling an order. Type the order ID and click **Load** — the
system pulls every item needed, sorted by warehouse path (zone → aisle →
rack → shelf) so you walk the floor in one direction instead of
zig-zagging. Tap each item's checkbox as you physically pick it. Once
everything's checked, **Complete Pick** appears — tapping it is what
actually removes the picked quantities from stock, so don't tap it until
you've genuinely finished pulling the order.

### Purchase Orders
Tracks every reorder request from creation to arrival:
- **Awaiting Approval** → a Manager or Admin clicks **Approve** or **Cancel**
- **Approved** → once the shipment physically arrives, whoever received it
  (Store Keeper, Manager, or Admin) clicks **Mark Received** — this is the
  step that actually adds the stock to inventory, not just a status label
- **Received** shows who logged it and which bin it landed in

### Vehicles
Every Bajaj unit — chassis number, engine number, model, color, and
status. **Add Vehicle** logs a new unit in. The **status dropdown** right
in the table lets you move a unit through its lifecycle (In Stock →
Allocated → Dispatched, etc.) as it changes hands — Executives see this
list read-only, without the ability to add or change anything.

### Spare Parts *(Admin only)*
The master parts catalog — OEM numbers, categories, default storage zone,
and reorder thresholds. This is centralized across the whole company, not
per-branch — one catalog, stock tracked separately per branch.

### Branches *(Admin only)*
Add a new branch here first, before creating any Manager or Store Keeper
account for it — those accounts need a branch to belong to.

### Staff Logins *(Admin only)*
Create, edit, or remove accounts:
- **✏️ Edit** — change name, email, role, or branch
- **🔑 Reset password** — sets a new one for someone who's locked out;
  hand it to them directly, it's shown once and not saved anywhere visible
- **🚫 Deactivate / 🔄 Reactivate** — blocks or restores login without
  losing their history
- **🗑️ Delete** — permanent removal; the system will refuse this if that
  person has ever received stock or picked an order (it would break the
  audit trail) — deactivate them instead in that case

### Change Password
Available to everyone, in the sidebar. Requires your current password to
set a new one.

---

## 5. Common tasks, start to finish

### Receiving a new shipment
1. Confirm the parts exist in the **Spare Parts** catalog already (ask an
   Admin to add any that don't).
2. Use `POST /api/inventory/receive` (via whatever intake tool your team
   uses) with each item's OEM part number and quantity — the system
   resolves the part, finds or assigns a bin, and updates stock
   automatically.
3. Check **Low Stock Command Center** — anything that was below threshold
   and just got restocked should drop off the list.

### Fulfilling a customer/dealer order
1. **Digital Picking Slip** → enter the order ID → **Load**.
2. Walk the route in the order shown, checking off each item as picked.
3. **Complete Pick** once everything's checked — stock is deducted at
   that moment.

### When something runs low
1. **Low Stock Command Center** shows it automatically — no one has to
   notice manually.
2. **Generate PO** → confirm quantity → submitted.
3. Branch Manager/Admin gets an email → **Purchase Orders** → **Approve**.
4. When the shipment physically arrives → **Mark Received** → stock
   updates.

### Bringing on a new staff member
1. If they're at a branch that doesn't exist in the system yet:
   **Branches** → **Add Branch** first.
2. **Staff Logins** → **Add User** → set their role (Store Keeper for
   floor staff, Branch Manager for someone approving POs/adjustments),
   pick their branch, set a temporary password.
3. Give them the login and tell them to change the password immediately.

### Opening a new branch
1. **Branches** → **Add Branch** — give it a name and short code.
2. Add its warehouse bins (Admin, via the warehouse-locations API — no
   dedicated screen for this yet, see the Known Limitations note below).
3. **Staff Logins** → create its Manager and Store Keeper accounts,
   assigned to the new branch code.
4. Its Vehicles, Purchase Orders, and inventory are automatically kept
   separate from every other branch from that point on.

---

## 6. Things to know that aren't bugs

- **Amber "Showing demo data" banner** — means the app couldn't reach the
  backend for that screen and is showing sample data instead so the
  screen isn't blank. Check your internet connection or ask an Admin if
  it persists.
- **A Manager/Store Keeper can't see another branch's data, ever** — not
  a permissions oversight, this is enforced deliberately so branches stay
  separate.
- **Deleting a staff login sometimes gets refused** — that's protecting
  the audit trail for anyone who's ever actually used the system.
  Deactivate them instead.
- **First load after a while can be slow (30–60 seconds)** — the backend
  server "sleeps" when nobody's used it recently to stay on the free
  hosting tier; the next request wakes it up. Not a broken connection.

## 7. Known limitations (being upfront, not hiding gaps)

- No warehouse-bin management screen yet — creating new storage locations
  currently requires the API directly, not a form in the app.
- No "forgot password" self-service — only an Admin can reset a locked-out
  account.
- Purchase order emails only notify your own team (Managers/Admins) —
  nothing is sent to Bajaj's own procurement contacts automatically.
- No edit/delete on Vehicles or Spare Parts yet beyond what's described
  above — vehicle status can be updated, but other fields need a direct
  API call if they need correcting.
