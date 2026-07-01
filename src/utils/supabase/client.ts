"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isElectronClient } from "@/lib/electron-env";

let client: SupabaseClient | null = null;
let cloudFromFn: ((table: string) => ReturnType<SupabaseClient["from"]>) | null = null;

const OFFLINE_PROXY_TABLES = new Set([
  "orders",
  "customers",
  "simple_expenses",
  "products",
  "materials",
  "system_settings",
  "suppliers",
  "delivery_fees_by_region",
  "tenants",
  "purchases",
  "daily_settlements",
  "point_transactions",
  "partners",
  "external_orders",
  "order_transfers",
  "expenses",
]);

type QueryChainStep = { method: string; args: unknown[] };

const applyQueryChain = (query: unknown, chain: QueryChainStep[]) => {
  let q = query as Record<string, (...a: unknown[]) => unknown>;
  for (const step of chain) {
    if (step.method === "abortSignal") continue;
    if (typeof q[step.method] === "function") {
      q = q[step.method](...step.args) as typeof q;
    }
  }
  return q;
};

function createQueryProxy(
  originalFrom: (table: string) => ReturnType<SupabaseClient["from"]>,
  table: string,
  chain: QueryChainStep[] = [],
): unknown {
  return new Proxy(
    {},
    {
      get: (_target, prop: string) => {
        if (prop === "then") {
          return (resolve: (v: unknown) => void, reject: (e: unknown) => void) => {
            const api = (window as Window & {
              electronAPI?: {
                queryDb?: (t: string, c: QueryChainStep[]) => Promise<{ data?: unknown; error?: { message?: string } | null; count?: number }>;
              };
            }).electronAPI;

            if (!api?.queryDb) {
              reject(new Error("Electron queryDb API missing"));
              return;
            }

            const isSelect = chain.some((s) => s.method === "select");

            api
              .queryDb(table, chain)
              .then(async (result) => {
                const empty =
                  isSelect &&
                  !result?.error &&
                  Array.isArray(result?.data) &&
                  result.data.length === 0;
                if (empty || result?.error) {
                  try {
                    resolve(await applyQueryChain(originalFrom(table), chain));
                    return;
                  } catch (fallbackErr) {
                    reject(fallbackErr);
                    return;
                  }
                }
                resolve(result);
              })
              .catch(async (err: unknown) => {
                try {
                  resolve(await applyQueryChain(originalFrom(table), chain));
                } catch {
                  reject(err);
                }
              });
          };
        }

        return (...args: unknown[]) => createQueryProxy(originalFrom, table, [...chain, { method: prop, args }]);
      },
    },
  );
}

export function createClient() {
  if (client) return client;

  const base = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  cloudFromFn = base.from.bind(base);

  if (isElectronClient()) {
    const originalFrom = base.from.bind(base);
    base.from = ((table: string) => {
      const api = (window as Window & { electronAPI?: { queryDb?: unknown } }).electronAPI;
      if (api?.queryDb && OFFLINE_PROXY_TABLES.has(table)) {
        return createQueryProxy(originalFrom, table) as ReturnType<SupabaseClient["from"]>;
      }
      return originalFrom(table);
    }) as SupabaseClient["from"];
  }

  client = base;
  return client;
}

/** Electron 로컬 프록시 우회 — 클라우드 직접 조회 */
export function cloudFrom(table: string) {
  createClient();
  if (!cloudFromFn) throw new Error("Supabase client not initialized");
  return cloudFromFn(table);
}
