import { readFileSync, readdirSync } from "node:fs";
import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import worker from "../worker.mjs";

// In-process D1 stand-in on node:sqlite with every migration applied, so tests
// exercise the real Worker without Wrangler or network. Batches are
// transactional like D1.
export function localDatabase() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON");
  const dir = new URL("../migrations/", import.meta.url);
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".sql")).sort()) {
    db.exec(readFileSync(new URL(file, dir), "utf8"));
  }
  const statement = (sql, params = []) => ({
    bind: (...values) => statement(sql, values),
    run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...params).changes) } }),
    first: async () => db.prepare(sql).get(...params) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...params) }),
  });
  return {
    db,
    DB: {
      prepare: (sql) => statement(sql),
      batch: async (list) => {
        db.exec("BEGIN");
        try {
          const results = [];
          for (const item of list) results.push(await item.run());
          db.exec("COMMIT");
          return results;
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      },
    },
  };
}

// Serve the Worker over loopback HTTP for clients that call fetch, such as the
// Expo app's rooms client.
export async function serveWorker(env = localDatabase()) {
  const server = createServer(async (incoming, outgoing) => {
    const chunks = [];
    for await (const chunk of incoming) chunks.push(chunk);
    const headers = {};
    for (const name of ["authorization", "content-type"]) {
      if (incoming.headers[name]) headers[name] = incoming.headers[name];
    }
    const response = await worker.fetch(new Request(`http://127.0.0.1${incoming.url}`, {
      method: incoming.method,
      headers,
      body: ["GET", "HEAD"].includes(incoming.method) ? undefined : Buffer.concat(chunks),
    }), env);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    env,
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
