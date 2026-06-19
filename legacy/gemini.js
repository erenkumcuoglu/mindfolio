export default async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return new Response(JSON.stringify({ error: { message: "GEMINI_API_KEY tanımlı değil" } }), { status: 500 });

  let body;
  try { body = await req.json(); } catch { return new Response("Bad JSON", { status: 400 }); }

  // İstemci { model, payload } gönderir. model yoksa varsayılan kullan.
  const model = body.model || "gemini-2.5-flash";
  const payload = body.payload || body; // esnek

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(payload),
    }
  );
  const text = await r.text();           // Google'ın yanıtını aynen geçir
  return new Response(text, { status: r.status, headers: { "Content-Type": "application/json" } });
};
