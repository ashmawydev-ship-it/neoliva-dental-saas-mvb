import { PrismaClient, Prisma, InvoiceStatus, PaymentMethod } from "@/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { logger } from "./logger";
import { getTraceContextSync } from "./observability/context";
import { AsyncLocalStorage } from "node:async_hooks";

const globalForPrisma = globalThis as unknown as {
  rawPrisma: PrismaClient | undefined;
  prisma: any | undefined;
  pool: Pool | undefined;
};

// Suppress pg's concurrent query deprecation warning (known issue with @prisma/adapter-pg)
if (typeof process !== 'undefined' && typeof process.emitWarning === 'function') {
  const originalEmitWarning = process.emitWarning;
  process.emitWarning = function (warning, ...args) {
    const isPgWarning =
      (typeof warning === 'string' && warning.includes('Calling client.query()')) ||
      (warning instanceof Error &&
        warning.name === 'DeprecationWarning' &&
        warning.message.includes('Calling client.query()'));
    if (isPgWarning) {
      return;
    }
    return originalEmitWarning.call(process, warning, ...args as any);
  };
}

// AsyncLocalStorage to track whether we are inside a tenant RLS transaction
export const rlsStorage = new AsyncLocalStorage<{ inTx: boolean; tenantId: string }>();

const createPrismaClient = () => {
  // ── Connection Pool Configuration ────────────────────────────────────────
  // `DB_POOL_MAX` controls the maximum number of simultaneous DB connections.
  //
  // • Fallback is 15 to allow local load testing without hitting artificial
  //   bottlenecks. Under `max:2`, a concurrency of 3+ requests will queue,
  //   causing "Unable to start a transaction" errors at load-test scale.
  //
  // • For Serverless Production (Vercel): ensure DATABASE_URL points to the
  //   Supabase Connection Pooler (port 6543, not 5432) and append
  //   `?pgbouncer=true` to the connection string. PgBouncer manages the
  //   actual Postgres connections, so a lower DB_POOL_MAX (e.g. 5-10) is
  //   appropriate there to avoid exhausting the pooler's slot limit.
  //
  // Recommended values:
  //   Local dev / load testing : DB_POOL_MAX=15  (or unset — uses fallback)
  //   Vercel Serverless        : DB_POOL_MAX=5   (short-lived instances)
  //   Dedicated server         : DB_POOL_MAX=20  (adjust to PG max_connections)
  const poolMax = process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : 15;

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max:              poolMax,
    idleTimeoutMillis: 30000,
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pool = pool;
  }

  const adapter = new PrismaPg(pool as any);
  const client = new PrismaClient({ 
    adapter,
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'stdout', level: 'error' },
      { emit: 'stdout', level: 'warn' },
    ],
  });

  // @ts-ignore
  client.$on('query', (e: any) => {
    if (e.duration >= 500) {
      console.warn(`[SLOW QUERY] ${e.duration}ms: ${e.query}`);
    }
    logger.debug(`Prisma Query`, {
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`,
    });
  });

  return client;
};

const getRawPrismaClient = (): PrismaClient => {
  if (process.env.NODE_ENV === "production") {
    return createPrismaClient();
  }

  if (!globalForPrisma.rawPrisma || !(globalForPrisma.rawPrisma as any).ledgerAccount) {
    if (globalForPrisma.rawPrisma) {
      console.warn("[Prisma] Stale raw client detected (missing ledgerAccount). Re-initializing...");
      if (globalForPrisma.pool) {
        console.warn("[Prisma] Closing existing connection pool to prevent TCP leakage...");
        const oldPool = globalForPrisma.pool;
        oldPool.end().catch((err: any) => {
          console.error("[Prisma] Error closing stale connection pool:", err);
        });
      }
    }
    globalForPrisma.rawPrisma = createPrismaClient();
  }
  return globalForPrisma.rawPrisma;
};

// Excluded system / non-tenant tables
const NON_TENANT_BOUND_MODELS = new Set([
  'Tenant',
  'User',
  'Session',
  'TenantMembership',
  'StaffInvitation',
  'SystemJob',
  'Job',
  'RoomStaff',
  'RoomChair',
  'JournalLine',
]);

function isTenantBoundModel(model: string): boolean {
  return !NON_TENANT_BOUND_MODELS.has(model);
}

async function getTenantIdForQuery(model: string, args: any): Promise<string | null> {
  // 1. Trace / Background context (cron jobs, background workers)
  const trace = getTraceContextSync();
  if (trace?.tenantId) {
    return trace.tenantId;
  }

  // 2. RLS storage context — used for re-entrant calls inside $transaction blocks.
  //    When Prisma's $transaction creates a new async context, traceStorage may not
  //    propagate, but rlsStorage is explicitly set via rlsStorage.run() before the
  //    inner query, so it reliably carries the tenantId.
  const rlsCtx = rlsStorage.getStore();
  if (rlsCtx?.tenantId) {
    return rlsCtx.tenantId;
  }

  // 3. User HTTP session context
  try {
    const { resolveTenantContext } = await import("./auth/resolve-tenant-context");
    const context = await resolveTenantContext();
    if (context?.tenantId) {
      return context.tenantId;
    }
  } catch {
    // Session context not available
  }

  // 4. Fallback: explicit argument in query (e.g. signup, invitations)
  const explicitTenantId = args?.where?.tenantId || args?.data?.tenantId;
  if (explicitTenantId) {
    return explicitTenantId;
  }

  return null;
}

const createTenantPrisma = (rawClient: PrismaClient) => {
  return rawClient.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!isTenantBoundModel(model)) {
            return query(args);
          }

          const tenantId = await getTenantIdForQuery(model, args);
          if (!tenantId) {
            throw new Error(`Security Exception: Missing tenant context for query on model "${model}".`);
          }

          // RLS transaction check: if not already running inside an RLS transaction, set transaction app context
          const store = rlsStorage.getStore();
          if (!store) {
            const ctx = Prisma.getExtensionContext(this);
            const client = (ctx as any).$parent || rawClient;
            const isTxClient = typeof client.$transaction !== 'function';
            if (isTxClient) {
              await client.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
              return query(args);
            }

            // Single query outside transaction: wrap in transaction block to isolate SET LOCAL variable duration
            return rawClient.$transaction(async (tx) => {
              await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
              return rlsStorage.run({ inTx: true, tenantId }, () => {
                return (tx as any)[model][operation](args);
              });
            }, { maxWait: 10000, timeout: 15000 });
          }

          // We are already inside an RLS transaction block, proceed with query execution
          // Force inject tenantId based on operation type
          switch (operation) {
            case 'findFirst':
            case 'findMany':
            case 'count':
            case 'aggregate':
            case 'groupBy': {
              (args as any).where = {
                ...(args as any).where,
                tenantId,
              };
              return query(args);
            }

            case 'findUnique': {
              // Convert findUnique to findFirst to enforce tenantId (since findUnique where only accepts unique fields)
              const findFirstArgs = {
                ...args,
                where: {
                  ...(args as any).where,
                  tenantId,
                },
              };
              return (rawClient as any)[model].findFirst(findFirstArgs);
            }

            case 'create': {
              (args as any).data = {
                ...(args as any).data,
                tenantId,
              };
              return query(args);
            }

            case 'createMany': {
              if (Array.isArray((args as any).data)) {
                (args as any).data = (args as any).data.map((item: any) => ({
                  ...item,
                  tenantId,
                }));
              } else {
                (args as any).data = {
                  ...(args as any).data,
                  tenantId,
                };
              }
              return query(args);
            }

            case 'update':
            case 'delete': {
              // Perform a pre-flight validation on the raw client to verify ownership of the record
              const record = await (rawClient as any)[model].findFirst({
                where: {
                  ...(args as any).where,
                  tenantId,
                },
                select: { id: true },
              });

              if (!record) {
                throw new Error(`Security Exception: Record not found or unauthorized for operation "${operation}" on model "${model}".`);
              }

              // Record exists and belongs to the tenant, safe to execute
              return query(args);
            }

            case 'updateMany':
            case 'deleteMany': {
              (args as any).where = {
                ...(args as any).where,
                tenantId,
              };
              if (operation === 'updateMany' && (args as any).data) {
                (args as any).data = {
                  ...(args as any).data,
                  tenantId,
                };
              }
              return query(args);
            }

            case 'upsert': {
              // Verify ownership via pre-flight query
              const record = await (rawClient as any)[model].findFirst({
                where: {
                  ...(args as any).where,
                  tenantId,
                },
                select: { id: true },
              });

              if (record) {
                return (rawClient as any)[model].update({
                  where: (args as any).where,
                  data: {
                    ...(args as any).update,
                    tenantId,
                  },
                });
              } else {
                return (rawClient as any)[model].create({
                  data: {
                    ...(args as any).create,
                    tenantId,
                  },
                });
              }
            }

            default:
              return query(args);
          }
        },
      },
    },
  });
};

const getTenantPrismaClient = (rawClient: PrismaClient) => {
  if (process.env.NODE_ENV === "production") {
    return createTenantPrisma(rawClient);
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createTenantPrisma(rawClient);
  }
  return globalForPrisma.prisma;
};

// Export raw client for context resolution and bypassing tenant constraints when needed
export const rawPrisma = getRawPrismaClient();

// Export extended client for global tenant isolation
export const prisma = getTenantPrismaClient(rawPrisma);

export default prisma;
