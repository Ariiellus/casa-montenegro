// Sesiones TV ↔ celulares vía Supabase REST. Si no hay configuración o falla la red, la app usa el modo manual (sellos).
(() => {
  const cfg = () => window.CASE.supabase || {};
  const on = () => !!(cfg().url && cfg().anonKey);
  async function rest(path, opts = {}) {
    const k = cfg().anonKey;
    const r = await fetch(`${cfg().url}/rest/v1/${path}`, { ...opts, headers: { apikey: k, Authorization: `Bearer ${k}`, "Content-Type": "application/json", ...(opts.headers || {}) } });
    if (!r.ok) { const e = new Error(`HTTP ${r.status}`); e.status = r.status; throw e; }
    const t = await r.text();
    return t ? JSON.parse(t) : null;
  }
  const q = encodeURIComponent;
  window.SYNC = {
    on,
    newCode: () => Array.from({ length: 4 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ"[Math.floor(Math.random() * 24)]).join(""),
    pushState: (id, state) => rest("mg_sessions?on_conflict=id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ id, state, updated_at: new Date().toISOString() }) }),
    getState: async id => { const r = await rest(`mg_sessions?id=eq.${q(id)}&select=state`); return r && r[0] ? r[0].state : null; },
    players: id => rest(`mg_players?session_id=eq.${q(id)}&select=id,name,team,status,seen_at&order=seen_at`),
    join: (id, player, team, status = "ok") => rest("mg_players?on_conflict=id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ id: player.id, name: player.name, session_id: id, team, status, seen_at: new Date().toISOString() }) }),
    player: async pid => { const r = await rest(`mg_players?id=eq.${q(pid)}&select=session_id,team,status`); return r && r[0] || null; },
    seen: pid => rest(`mg_players?id=eq.${q(pid)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ seen_at: new Date().toISOString() }) }),
    accusations: id => rest(`mg_accusations?session_id=eq.${q(id)}&select=team,data`),
    accuse: async (id, team, data, player) => {
      try { await rest("mg_accusations", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ session_id: id, team, data, player }) }); return "ok"; }
      catch (e) { return e.status === 409 ? "taken" : "error"; }
    },
    setStatus: (pid, status) => rest(`mg_players?id=eq.${q(pid)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status }) }),
    claims: (id, after = 0) => rest(`mg_claims?session_id=eq.${q(id)}&id=gt.${after}&order=id&select=id,team,code`),
    claim: async (id, team, code) => {
      try { await rest("mg_claims", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ session_id: id, team, code }) }); return "ok"; }
      catch (e) { return e.status === 409 ? "taken" : "error"; }
    }
  };
})();
