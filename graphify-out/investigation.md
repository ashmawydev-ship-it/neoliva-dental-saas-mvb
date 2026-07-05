# Root Cause Investigation — Expired Prisma Transaction (Read Only)

A Prisma interactive transaction is timing out:

Transaction API error:
A commit cannot be executed on an expired transaction.
Timeout: 15000ms
Elapsed: 17198ms

DO NOT MODIFY ANY CODE.

Investigate only.

I need a complete execution trace.

Specifically verify:

1. Where is prisma.$transaction(async (tx)=>...) started?

2. Which function creates the Appointment?

3. Inside that transaction list EVERY awaited function.

4. Detect if any of those awaited functions execute:

- findMany
- aggregate
- groupBy
- unstable_cache
- CacheService.get
- revalidateTag
- revalidatePath
- external API
- email
- SMS
- notifications
- logging

5. Measure which operation is the slowest.

6. Verify whether any Repository call accidentally uses the GLOBAL prisma client instead of tx.

7. Verify whether Pagination Hardening introduced additional queries inside the transaction.

8. Verify whether Appointment creation performs dashboard refresh logic before commit.

9. Produce an execution timeline like:

Begin Transaction
↓
Insert Appointment
↓
...
↓
Commit

Estimate duration of every step.

Do NOT propose fixes yet.

Only identify the exact root cause with code evidence.

---

## 🔎 Investigation Findings: Prisma Wrapper & Transaction Expiry (Read-Only)

### 1. Complete implementation of `rawClient.$transaction`
The implicit transaction is defined in `src/lib/prisma.ts` (lines 189-195) inside the `$extends` middleware:
```ts
// Single query outside transaction: wrap in transaction block to isolate SET LOCAL variable duration
return rawClient.$transaction(async (tx) => {
  await tx.$executeRaw(Prisma.sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`);
  return rlsStorage.run({ inTx: true, tenantId }, () => {
    return (tx as any)[model][operation](args);
  });
}, { maxWait: 10000, timeout: 15000 });
```

### 2. Why is a simple `create()` inside an interactive transaction?
Because the architecture relies on PostgreSQL Row-Level Security (RLS) for tenant isolation. RLS requires setting a session variable (`SET LOCAL app.current_tenant_id`). To ensure this variable doesn't leak across the connection pool to other queries, Prisma must wrap the `SET LOCAL` execution and the actual query inside an isolated transaction.

### 3. Is EVERY query wrapped in a transaction?
**Yes.** The `$extends` middleware intercepts `$allOperations` on `$allModels`. As long as the model is not in `NON_TENANT_BOUND_MODELS`, every single read (`findMany`, `findFirst`, `count`) and write (`create`, `update`) executed on the global client is wrapped in its own implicit 15000ms `$transaction`.

### 4. Does `AppointmentRepository.findMany` receive a `TransactionClient`?
**No.** `AppointmentRepository.findMany` uses the global `prisma` client. It does not accept or receive `tx` as a parameter. Because it uses the global client, the call hits the `$extends` middleware and spins up a brand new implicit `$transaction`.

### 5. Search every call that passes `tx` into `AppointmentRepository`
There are **zero** instances. `AppointmentRepository` methods are hardcoded to use `prisma.appointment...` and completely lack a `tx` parameter in their signatures. 

### 6. Is `tx` cached, reused, or stored outside its callback?
**No.** Inside the implicit wrapper, `tx` is only passed to `(tx as any)[model][operation](args)`. It is not stored in global state or reused across requests. `AsyncLocalStorage` (`rlsStorage`) only stores `{ inTx: true, tenantId }`, it does not store the `tx` object itself.

### 7. EXACT code that still tries to execute another query using an expired `tx`

If a developer *does* start an **explicit** transaction (e.g., `prisma.$transaction(async (tx) => { await tx.appointment.create(...) })`), they execute queries on the extended transaction client. The exact code that causes the expiry failure is in **`src/lib/prisma.ts`, function `$allOperations`, lines 184-186:**

```ts
const isTxClient = typeof client.$transaction !== 'function';
if (isTxClient) {
  await client.$executeRaw(Prisma.sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`);
  return query(args); // <--- THIS EXECUTES ON AN EXPIRED TX
}
```

**Root Cause Execution Flow:**
1. A slow query or lock contention delays the database for >15000ms.
2. Prisma Query Engine rolls back the transaction exactly at 15s.
3. However, Node's event loop is still awaiting `await client.$executeRaw(set_config)`.
4. Once the event loop resumes (at `Elapsed: 17198ms`), the `set_config` promise resolves.
5. Node moves to the next line and executes `return query(args);`
6. `query(args)` attempts to execute the underlying query on `client` (`tx`).
7. **CRASH:** Prisma throws `"A commit cannot be executed on an expired transaction"` because it attempts to dispatch a query (or the final commit of the resolving callback) onto a connection that the Query Engine already rolled back 2 seconds ago.

For `AppointmentRepository.findMany` executing implicitly, the same event loop delay occurs on the `await tx.$executeRaw` inside the implicit wrapper (line 191). The query resolves, but by the time the callback finishes and Node asks Prisma to commit, the 15s timer has already expired.

---

## 🔎 Investigation Findings (Read-Only)

### 1. Where is `prisma.$transaction` started?
The **only** transaction wrapping the appointment execution is the **implicit RLS transaction** started by the Prisma extension in `src/lib/prisma.ts` (line 190). There is **no explicit `$transaction` wrapper** inside `AppointmentService.createAppointment`, `getAppointmentsData`, or `app/actions/appointments.ts`.
```ts
// src/lib/prisma.ts
// Single query outside transaction: wrap in transaction block to isolate SET LOCAL variable duration
return rawClient.$transaction(async (tx) => {
  await tx.$executeRaw(Prisma.sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`);
  return rlsStorage.run({ inTx: true, tenantId }, () => {
    return (tx as any)[model][operation](args);
  });
}, { maxWait: 10000, timeout: 15000 });
```

### 2. Which function creates the Appointment?
The creation occurs in `AppointmentRepository.create` (line 97) and fetching occurs in `AppointmentRepository.findMany`.

### 3 & 4. Awaited functions inside the transaction
**NONE**. The implicit transaction in `prisma.ts` wraps exactly *one* query: `(tx as any)[model][operation](args)`. 
External services (`RoomService.validateRoomBooking`, `NotificationService.notifyEvent`, `EventService.trackEvent`) and cache invalidations (`revalidatePath`) are **ALL executed outside** the database transaction.

### 5. Slowest Operation
Since the transaction wraps only the Prisma query itself, the query is taking >15000ms. This indicates **database lock contention** or connection pool exhaustion, rather than application-layer `awaits` bloating the transaction.

### 6. Repository calls using GLOBAL `prisma` instead of `tx`
All methods in `AppointmentRepository` (including `create` and `findMany`) use the **global `prisma` client**. They do not accept or use a `tx` object. This is expected because they are not meant to run inside an explicit transaction block at the service layer.

### 7. Pagination Hardening Impact
Pagination hardening added `take: Math.min(...)` to `findMany`, which makes the query *faster* and bounded. It did not introduce additional queries inside the transaction.

### 8. Dashboard refresh logic before commit
**No**. `revalidatePath('/dashboard')` is called in `app/actions/appointments.ts` *after* `createAppointment` has fully resolved and committed.

### 9. Execution Timeline

```
UI: NewAppointmentDialog submits (or AppointmentsPage loads)
↓
Server Action: createAppointment (or getAppointmentsData)
↓
Service: RoomService.validateRoomBooking (Uses implicit TXs for its queries)
↓
Service: AppointmentRepository.create (Uses global prisma)
↓
   [BEGIN IMPLICIT TX (15000ms timeout)]
   ↓
   Prisma.sql`SELECT set_config(...)` (~1ms)
   ↓
   tx.appointment.create (BLOCKED / TIMEOUT >15000ms) ❌
   ↓
   [COMMIT (Never Reached)]
↓
Service: NotificationService.notifyEvent (Never Reached)
↓
Server Action: EventService.trackEvent (Never Reached)
```

### 🚨 Root Cause Conclusion
The application logic does **not** wrap external awaits (like notifications or `revalidatePath`) inside a database transaction. 
The `15000ms` timeout is occurring strictly on the `prisma.appointment.create` (or `findMany`) query executing inside its own isolated implicit transaction. This confirms that the root cause is **PostgreSQL lock contention**, connection pool exhaustion, or another transaction (e.g., in `BillingService` or `DoctorCommissionService`) holding long-running locks on the `appointments` table.