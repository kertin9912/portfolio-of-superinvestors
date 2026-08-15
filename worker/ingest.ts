import { ingestManager } from "../src/lib/sec-ingestion";
import { getManagerBySlug, managers, portfolioKey, type Manager, type PortfolioSnapshot } from "../src/lib/portfolio";

type IngestMessage = { slug: string; requestedAt: string; source: "cron" };

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function messages(slugs: Manager["slug"][] = managers.map((manager) => manager.slug)): MessageSendRequest<IngestMessage>[] {
  const requestedAt = new Date().toISOString();
  return slugs.map((slug, index) => ({ body: { slug, requestedAt, source: "cron" }, delaySeconds: index * 2 }));
}

async function enqueueAll(env: IngestEnv): Promise<number> {
  const batch = messages();
  await env.INGEST_QUEUE.sendBatch(batch);
  return batch.length;
}

async function processManager(env: IngestEnv, manager: Manager): Promise<{ status: "updated" | "unchanged"; accessionNumber: string; positions: number }> {
  const key = portfolioKey(manager.cik);
  const existing = await env.PORTFOLIO_SNAPSHOTS.get<PortfolioSnapshot>(key, "json");
  const result = await ingestManager(manager, env.SEC_USER_AGENT, existing);
  if (result.status === "updated") {
    await env.PORTFOLIO_SNAPSHOTS.put(key, JSON.stringify(result.snapshot), {
      metadata: {
        accessionNumber: result.snapshot.comparison.current.filing.accessionNumber,
        reportDate: result.snapshot.comparison.current.filing.reportDate,
        updatedAt: result.snapshot.updatedAt,
      },
    });
  }
  return {
    status: result.status,
    accessionNumber: result.snapshot.comparison.current.filing.accessionNumber,
    positions: result.snapshot.comparison.current.positions.length,
  };
}

export default {
  async scheduled(_controller, env): Promise<void> {
    const count = await enqueueAll(env);
    console.log(JSON.stringify({ event: "ingestion_enqueued", source: "cron", count }));
  },

  async queue(batch, env): Promise<void> {
    for (const message of batch.messages) {
      const manager = getManagerBySlug(message.body.slug);
      if (!manager) {
        console.error(JSON.stringify({ event: "ingestion_rejected", reason: "unknown_manager", slug: message.body.slug }));
        message.ack();
        continue;
      }

      try {
        const result = await processManager(env, manager);
        console.log(JSON.stringify({
          event: "ingestion_complete",
          slug: manager.slug,
          status: result.status,
          accessionNumber: result.accessionNumber,
          positions: result.positions,
        }));
        message.ack();
      } catch (error) {
        console.error(JSON.stringify({ event: "ingestion_failed", slug: manager.slug, attempt: message.attempts, error: error instanceof Error ? error.message : "Unknown error" }));
        message.retry({ delaySeconds: Math.min(3600, 60 * 2 ** Math.min(message.attempts, 5)) });
      }
    }
  },

  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      const stored = await env.PORTFOLIO_SNAPSHOTS.list({ prefix: "portfolio:v1:" });
      return json({ status: "ok", persistedManagers: stored.keys.length, trackedManagers: managers.length });
    }
    return json({ error: "Not found" }, 404);
  },
} satisfies ExportedHandler<IngestEnv, IngestMessage>;
