const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,PUT,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,X-Verhuis-Secret",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean); // ["blob", ":id"?]

    if (parts[0] !== "blob") {
      return json({ error: "Niet gevonden." }, 404);
    }

    if (request.method === "POST" && parts.length === 1) {
      const body = await request.text();
      const id = crypto.randomUUID();
      await env.VERHUISHULP_KV.put(id, body);
      return json({ id });
    }

    const id = parts[1];
    if (!id) return json({ error: "Geen id opgegeven." }, 400);

    if (request.method === "GET" && parts.length === 2) {
      const stored = await env.VERHUISHULP_KV.get(id);
      if (stored === null) return json({ error: "Niet gevonden." }, 404);
      return new Response(stored, {
        status: 200,
        headers: { "Content-Type": "application/json", ...CORS },
      });
    }

    if (request.method === "PUT" && parts.length === 2) {
      const secret = request.headers.get("X-Verhuis-Secret") || "";
      if (secret !== env.SCHRIJF_SECRET) {
        return json({ error: "Niet toegestaan." }, 403);
      }
      const body = await request.text();
      await env.VERHUISHULP_KV.put(id, body);
      return json({ ok: true });
    }

    return json({ error: "Methode niet toegestaan." }, 405);
  },
};
