# Reasoning

## Reading the brief

The storyline names three hard requirements before anything else: batches with
their own expiry, First-Expiry-First-Out dispensing, and a hard rule that expired
stock never goes out. Everything else (search, alerts, sellable-stock queries) is
built on top of getting those three right, so the batch/expiry model and the
dispense algorithm were designed and tested first, before any UI existed.

## Key design decisions

**Batches as the unit of stock, not medicines.** A medicine is just a name/price/
manufacturer catalog entry; all quantity lives on `batches`, each with its own
`expiry_date`. This is what makes FEFO possible — two batches of the same
medicine can have very different expiry dates depending on when they were made.

**SQLite via Node's built-in `node:sqlite` instead of a separate DB server or an
npm database driver.** Codespaces gives a fresh container every time, and pulling
in Postgres/MySQL (or even a native-compiled driver like `better-sqlite3`) adds
setup risk with a strict 2.5-hour clock. Node 22's built-in `node:sqlite` gives
real relational persistence with zero extra install and zero native build step —
`npm install` only needs to fetch `express`, `bcryptjs`, and `jsonwebtoken`.

**FEFO as a SQL query, not an in-memory sort.** `dispense()` selects batches with
`WHERE expiry_date >= today() AND quantity > 0 ORDER BY expiry_date ASC, batch_id
ASC`, so expired batches are excluded *before* the FEFO ordering is even
computed — they're never candidates, not just deprioritized. Quantity is deducted
batch-by-batch until the request is filled.

**Dispensing is transactional.** Before deducting anything, the code sums
available in-date stock across candidate batches and compares it to the
requested quantity. If it's short, it throws (409) without touching the
database. Only if the full amount is coverable does it wrap the deductions in a
`BEGIN`/`COMMIT` (with `ROLLBACK` on error) — a pharmacy should never end up with
a half-filled order because of a crash mid-deduction.

**JWT over sessions.** No server-side session store needed, and it kept the
number of moving parts down — appropriate for a scoped, single-node app rather
than something meant to run behind a load balancer.

## Testing approach

Rather than writing the UI first and clicking through it by hand, I tested the
API directly with `curl` as each route was added, in a fixed sequence that
exercises the FEFO guarantees directly:

1. Register → login → capture JWT.
2. Add one medicine, then two in-date batches (different expiry dates) plus one
   already-expired batch for the same medicine.
3. Check `/stock` — confirms the expired batch's quantity is excluded from the
   sellable total.
4. Dispense a quantity that spans both in-date batches — confirms the response
   lines show the earlier-expiring batch drained first, and the later batch only
   contributes the remainder.
5. Request more than total in-date stock — confirms a 409 and that a follow-up
   `/stock` check shows *nothing* was deducted (the transactional guarantee).
6. Hit `/api/medicines` with `search`, `sort=sellable_stock`, `order=desc` —
   confirms filtering and sort order are correct against known seeded values.
7. Check `/api/alerts/expiring` and `/api/alerts/expired` against batches with
   known offsets from today, to confirm the day-count window and the expired
   list don't leak into each other.
8. Hit a protected route with no `Authorization` header — confirms 401.

## Issues found and fixed while testing

- Initial batch list/medicine list queries didn't parameterize the `ORDER BY`
  column safely — fixed by whitelisting allowed sort columns against a fixed
  array before interpolating into the SQL string, rather than trusting the query
  param directly.
- The dispense endpoint originally computed "available stock" and "deduction"
  in the same loop, which meant a mid-loop failure could leave a partial
  deduction applied. Restructured into two passes — first sum and validate,
  then deduct inside an explicit transaction — so a failed dispense is
  guaranteed to be a no-op.
- Duplicate batch IDs were only checked per-medicine at first; changed the
  uniqueness check to be global (`batch_id UNIQUE` at the DB level, backed by an
  explicit pre-check for a clean error message) since real batch/lot numbers are
  unique across a whole pharmacy, not just within one medicine.
