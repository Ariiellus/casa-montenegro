// Cron diario de Vercel: consulta Supabase para que el proyecto gratis no se pause y borra sesiones viejas.
// Variables de entorno de Vercel: SUPABASE_URL y SUPABASE_ANON_KEY.
const key = process.env.SUPABASE_ANON_KEY;
const URL = `${process.env.SUPABASE_URL}/rest/v1/rpc/mg_keepalive`;

module.exports = async function handler(req, res) {
  const r = await fetch(URL, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: "{}" });
  res.status(r.ok ? 200 : 502).json({ ok: r.ok, deleted: r.ok ? await r.json() : null });
};
