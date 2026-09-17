# Sellwell — Pharmacy Stock Management (FEFO)

A full-stack pharmacy inventory system. Every medicine is stocked in batches with
their own expiry date; stock is always dispensed **First-Expiry-First-Out (FEFO)**,
and expired batches are never dispensed. Includes user auth, search, sorting,
pagination, and expiry alerts.

**Stack:** Node.js + Express · SQLite (Node's built-in `node:sqlite`, no external
DB server) · JWT auth · vanilla HTML/CSS/JS frontend (no framework/build step).

---

## Setup & Run

Requires **Node.js 22.5+** (for the built-in `node:sqlite` module).

```bash
npm install        # installs express, bcryptjs, jsonwebtoken
npm run seed        # optional: populates demo data (7 medicines, 13 batches)
npm start            # starts the server at http://localhost:3000
```

Open `http://localhost:3000` for the landing page, or go straight to
`http://localhost:3000/register.html` to create an account and reach the dashboard.

For development with auto-restart on file changes:

```bash
npm run dev
```

The SQLite database file is created automatically at `data/pharmacy.db` on first
run — no manual DB setup required. Delete that file (or the whole `data/` folder)
to reset to a clean slate.

### Debugging

- **Server won't start / port in use:** another process is already on port 3000.
  Set a different port: `PORT=4000 npm start`.
- **`node:sqlite` warning in the console:** this is expected — it's an experimental
  Node API and prints an `ExperimentalWarning` on startup. It does not affect
  correctness.
- **401 Unauthorized on API calls:** the JWT has expired (12h lifetime) or wasn't
  sent — the frontend logs you out automatically on a 401; via `curl`, make sure
  you're passing `-H "Authorization: Bearer <token>"`.
- **400/409 errors on batch or dispense endpoints:** these are intentional
  validation failures (duplicate batch ID, insufficient in-date stock, bad dates) —
  check the JSON `error` field in the response body for the specific reason.
- **Resetting demo data:** delete `data/pharmacy.db` and re-run `npm run seed`.

---

## API Endpoints

All endpoints except `/api/auth/*` require `Authorization: Bearer <token>`.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create an account `{name, email, password}` → `{token, user}` |
| POST | `/api/auth/login` | Log in `{email, password}` → `{token, user}` |
| GET | `/api/medicines` | List medicines. Query: `search`, `sort` (`name`\|`manufacturer`\|`unit_price`\|`sellable_stock`), `order` (`asc`\|`desc`), `page`, `limit` |
| POST | `/api/medicines` | Add/update a medicine `{name, manufacturer, unitPrice}` |
| GET | `/api/medicines/:name/stock` | Sellable (in-date) stock count for a medicine |
| GET | `/api/medicines/:name/in-date` | `{inDate: boolean}` — "do we have X in date?" |
| GET | `/api/batches` | List batches. Query: `medicine`, `sort` (`expiry_date`\|`mfg_date`\|`quantity`\|`batch_id`), `order`, `page`, `limit` |
| POST | `/api/batches` | Add a stock batch `{medicineName, batchId, quantity, mfgDate, expiryDate}` |
| POST | `/api/dispense` | Dispense stock FEFO `{medicineName, quantity}` → dispensed batch lines. Transactional — 409 if insufficient in-date stock, nothing deducted |
| GET | `/api/alerts/expiring?days=30` | Non-expired batches expiring within N days |
| GET | `/api/alerts/expired` | Batches already past expiry (write-off list) |
| GET | `/health` | Liveness check |

---

## Project Structure

```
server.js                 Express app entry point, route wiring
src/
  db.js                   SQLite schema (users, medicines, batches, transactions)
  auth.js                 register/login, JWT middleware
  services/
    pharmacyService.js    Core FEFO logic, stock queries, alerts (framework-agnostic)
  routes/
    auth.js, medicines.js, batches.js, dispense.js, alerts.js
public/
  index.html               Landing page
  login.html, register.html
  dashboard.html            Inventory + forms + alerts (search/sort/paginate)
  css/style.css
  js/auth.js, app.js
scripts/seed.js             Demo data
```

## Database Schema

- `users(id, name, email UNIQUE, password_hash, created_at)`
- `medicines(id, name UNIQUE, manufacturer, unit_price)`
- `batches(id, batch_id UNIQUE, medicine_id → medicines, quantity, mfg_date, expiry_date)`
- `transactions(id, medicine_id, batch_id, quantity_taken, dispensed_at)` — audit log of every dispense
