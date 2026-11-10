import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Minimal D1 surface we use. Declared here so the app type-checks without
 * the Workers runtime types being global.
 */
export type D1Like = {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      run(): Promise<unknown>;
      all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
    };
    all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
    run(): Promise<unknown>;
  };
  batch(statements: unknown[]): Promise<unknown>;
};

/**
 * Returns the D1 binding on Cloudflare, or null when running locally
 * (where the JSON files under data/ are used instead).
 */
export async function getD1(): Promise<D1Like | null> {
  if (process.env.NEXT_PHASE === "phase-production-build") return null;
  try {
    const { env } = await getCloudflareContext({ async: true });
    const db = (env as { DB?: D1Like }).DB;
    return db ?? null;
  } catch {
    return null;
  }
}
