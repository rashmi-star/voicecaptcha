/**
 * Durable Object: stores voice-challenge sessions at the edge (ElevenHacks / Cloudflare story).
 * Replaces ephemeral Worker memory with durable, replicated state.
 */
import type { WorkerEnv } from "./types";
import { PHRASES } from "./phrases";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export class ChallengeCoordinator {
  constructor(
    private readonly ctx: DurableObjectState,
    _env: WorkerEnv
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/create" && request.method === "POST") {
      await this.pruneExpired();
      const phrase = PHRASES[Math.floor(Math.random() * PHRASES.length)];
      const challengeId = crypto.randomUUID();
      await this.ctx.storage.put(challengeId, { phrase, created: Date.now() });
      return Response.json({ challengeId, phrase });
    }

    if (url.pathname === "/get" && request.method === "GET") {
      const id = url.searchParams.get("id");
      if (!id) return Response.json({ error: "missing id" }, { status: 400 });
      await this.pruneExpired();
      const entry = await this.ctx.storage.get<{ phrase: string; created: number }>(id);
      if (!entry) return Response.json({ error: "not found" }, { status: 404 });
      return Response.json({ phrase: entry.phrase, created: entry.created });
    }

    if (url.pathname === "/delete" && request.method === "POST") {
      let body: { id?: string };
      try {
        body = (await request.json()) as { id?: string };
      } catch {
        return Response.json({ error: "JSON body required" }, { status: 400 });
      }
      const challengeId = body.id;
      if (!challengeId) return Response.json({ error: "missing id" }, { status: 400 });
      await this.ctx.storage.delete(challengeId);
      return Response.json({ ok: true });
    }

    return new Response("Not found", { status: 404 });
  }

  private async pruneExpired(): Promise<void> {
    const now = Date.now();
    const list = await this.ctx.storage.list<{ created: number }>();
    for (const [key, val] of list) {
      if (now - val.created > CHALLENGE_TTL_MS) {
        await this.ctx.storage.delete(key);
      }
    }
  }
}
