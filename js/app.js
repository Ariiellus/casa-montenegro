(() => {
const C = window.CASE;
const KEY = "montenegro-state-v1";
const PHONE_KEY = "montenegro-phone-v1";
const SPOTS_KEY = "montenegro-spots-v1";
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const norm = s => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[¿?¡!«»"']/g, "").replace(/\s+/g, " ").trim();
const byCode = code => C.evidence.find(e => e.code === String(code).toUpperCase());
const bySeal = seal => C.evidence.find(e => norm(e.seal) === norm(seal));
const checkAnswer = (ev, ans) => ev.q.answers.some(a => norm(a) === norm(ans) || norm(a).replace(/\s/g, "") === norm(ans).replace(/\s/g, ""));
const suspectById = id => C.suspects.find(s => s.id === id);

const fresh = () => ({
  started: false, startAt: 0, paused: false, pausedAt: 0, pausedTotal: 0, duration: 45 * 60,
  phase: 0, finished: false, teams: C.teams.map(t => ({ ...t })),
  claims: {}, log: [], cooldown: {}, accusations: {}, revealed: false,
  tts: true, music: true, revealOnPhase: true, tab: "caso", riddleIdx: -1, riddleShown: false, ouijaUsed: {}
});
let S = load();
function load() { try { return Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { return fresh(); } }
function save() { localStorage.setItem(KEY, JSON.stringify(S)); }
const spots = () => { try { return JSON.parse(localStorage.getItem(SPOTS_KEY)) || {}; } catch (e) { return {}; } };
const spotFor = ev => spots()[ev.code] || ev.spot;

const team = id => S.teams.find(t => t.id === id);
const score = id => S.log.filter(l => l.team === id).reduce((a, l) => a + l.pts, 0);
function addPts(teamId, pts, reason) { S.log.push({ team: teamId, pts, reason, at: Date.now() }); save(); }

// ---------- tiempo ----------
function elapsed() {
  if (!S.started) return 0;
  const now = S.paused ? S.pausedAt : Date.now();
  return Math.max(0, (now - S.startAt - S.pausedTotal) / 1000);
}
const remaining = () => Math.max(0, S.duration - elapsed());
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const isoToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
let remoteDate = null;
const storyDay = () => remoteDate || S.dateOverride || S.playDate || isoToday();
const dayShift = off => { const [, m, d] = storyDay().split("-").map(Number); return new Date(Date.UTC(C.year, m - 1, d + off)); };
const fillDates = s => String(s).replace(/\{([dny]):([+-]?\d+)\}/g, (_, k, o) => {
  const x = dayShift(+o);
  return k === "d" ? `${x.getUTCDate()} de ${MESES[x.getUTCMonth()]}` : k === "n" ? `${x.getUTCDate()}/${x.getUTCMonth() + 1}` : String(x.getUTCFullYear());
});
const story = s => fillDates(s).replace(/\|/g, "");
const fmt = s => { s = Math.ceil(s); const m = Math.floor(s / 60), r = s % 60; return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`; };

// ---------- voz ----------
let voice = null;
const FEMALE = /paulina|m[oó]nica|helena|laura|sabina|dalia|elvira|elena|lucia|luc[ií]a|marisol|soledad|paloma|angelica|ang[eé]lica|esperanza|carmen|francisca|isabela|camila|valentina|catalina|ximena|ver[oó]nica|marta|female|mujer|femenin/i;
const MALE = /jorge|juan|diego|pablo|ra[uú]l|[aá]lvaro|carlos|enrique|andr[eé]s|alonso|tom[aá]s|gonzalo|jos[eé]|male(?!.*female)|hombre|masculin/i;
const esVoices = () => ("speechSynthesis" in window ? speechSynthesis.getVoices() : []).filter(v => v.lang && v.lang.toLowerCase().startsWith("es"));
function pickVoice() {
  const vs = esVoices();
  const chosen = S.voiceName && vs.find(v => v.name === S.voiceName);
  const fem = vs.filter(v => FEMALE.test(v.name) && !/\bmale\b/i.test(v.name));
  const neutral = vs.filter(v => !MALE.test(v.name));
  const latam = l => l.find(v => /mx|us|419/i.test(v.lang)) || l[0];
  voice = chosen || latam(fem) || latam(neutral) || vs[0] || null;
}
if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
let clip = null;
const recorded = text => {
  if (S.voiceName || !window.VOZ) return null;
  const srcs = fillDates(text).split("|").map(p => window.VOZ[p.trim()]);
  return srcs.every(Boolean) ? srcs : null;
};
function speak(text, onend) {
  hush();
  if (!S.tts) { onend && setTimeout(onend, 0); return false; }
  const src = recorded(text);
  if (src) {
    let i = 0, ended = false;
    const play = () => {
      if (i >= src.length) { if (!ended) { ended = true; onend && onend(); } return; }
      const a = clip = new Audio(src[i++]);
      const nextClip = () => { if (clip === a) play(); };
      a.onended = nextClip; a.onerror = nextClip;
      a.play().catch(nextClip);
    };
    play();
    return true;
  }
  if (!("speechSynthesis" in window)) { onend && setTimeout(onend, 0); return false; }
  const u = new SpeechSynthesisUtterance(story(text));
  if (voice) u.voice = voice;
  u.lang = voice ? voice.lang : "es-MX"; u.rate = 0.88; u.pitch = 1.05;
  u.onend = () => onend && onend();
  speechSynthesis.speak(u);
  return true;
}
const hush = () => {
  if (clip) { const a = clip; clip = null; a.onended = a.onerror = null; a.pause(); }
  if ("speechSynthesis" in window) speechSynthesis.cancel();
};

// ---------- UI helpers ----------
function toast(html, color) {
  const el = document.createElement("div"); el.className = "toast"; el.innerHTML = html;
  if (color) el.style.borderColor = color;
  $("#toast-root").appendChild(el);
  setTimeout(() => el.classList.add("out"), 3800); setTimeout(() => el.remove(), 4400);
}
function modal(html, cls = "") {
  const root = $("#overlay-root");
  const wrap = document.createElement("div"); wrap.className = "modal-wrap";
  wrap.innerHTML = `<div class="modal ${cls}"><button class="x" aria-label="Cerrar">×</button>${html}</div>`;
  root.appendChild(wrap);
  const close = () => { wrap.remove(); };
  wrap.addEventListener("click", e => { if (e.target === wrap || e.target.classList.contains("x")) close(); });
  return { el: wrap.firstElementChild, close };
}
function docHtml(ev) {
  const nx = ev.next && C.evidence.find(e => e.code === ev.next);
  const eco = nx ? `<div class="eco"><div class="part-label">Siguiente escondite</div>
    <div class="eco-room"><b>${esc(nx.room)}</b></div><i>«${esc(hintFor(nx))}»</i></div>` : "";
  return `<div class="part-label crime">Pista del crimen <small>Sirve para resolver el caso</small></div>
    <div class="doc ${ev.mirror ? "has-mirror" : ""}"><div class="doc-kind">${esc(ev.kind)}</div>${fillDates(ev.html)}</div>${eco}`;
}
function qrSvg(text, cell = 4) {
  const q = qrcode(0, "M"); q.addData(text); q.make();
  return q.createSvgTag({ cellSize: cell, margin: 2, scalable: true });
}
const baseUrl = () => (localStorage.getItem("montenegro-base") || C.publicUrl || (location.origin + location.pathname)).replace(/#.*$/, "");
const evidenceUrl = code => `${baseUrl()}#/e/${code}`;

// ---------- narración ----------
let narrating = false;
function narrate(lines, title, after) {
  narrating = true;
  const root = $("#overlay-root");
  const el = document.createElement("div"); el.className = "narration";
  el.innerHTML = `<div class="n-title">${esc(title)}</div><div class="n-lines"></div>
    <div class="n-actions"><button class="btn ghost n-skip">Saltar</button><button class="btn n-next">Continuar</button></div>`;
  root.appendChild(el);
  const box = $(".n-lines", el); let i = -1, done = false;
  const finish = () => { if (done) return; done = true; hush(); el.classList.add("out"); setTimeout(() => el.remove(), 600); narrating = false; after && after(); };
  const next = () => {
    i++;
    if (i >= lines.length) return finish();
    box.querySelectorAll("p").forEach(p => p.classList.add("old"));
    const p = document.createElement("p"); p.textContent = story(lines[i]); box.appendChild(p);
    requestAnimationFrame(() => p.classList.add("in"));
    const idx = i;
    speak(lines[i], () => setTimeout(() => { if (i === idx && !done) next(); }, 900));
  };
  $(".n-next", el).onclick = next; $(".n-skip", el).onclick = finish;
  next();
}

// ---------- fases ----------
function enterPhase(idx, silent) {
  S.phase = idx; save();
  const ph = C.phases[idx];
  if (S.revealOnPhase && idx > 0) Object.values(S.claims).forEach(c => c.public = true);
  save();
  if (silent) { render(); return; }
  if (S.music) SFX.phase();
  narrate(ph.narration, ph.name, () => {
    ph.evidence.forEach(id => toast(`Nueva evidencia oficial: <b>${esc(C.autoEvidence[id].title)}</b>`));
    if (ph.evidence.length) { S.tab = "evidencias"; save(); }
    render();
    if (ph.evidence.length) openAuto(ph.evidence[0]);
  });
  render();
}
function finishGame() {
  if (S.finished) return;
  S.finished = true; S.paused = true; S.pausedAt = S.startAt + S.pausedTotal + S.duration * 1000;
  Object.values(S.claims).forEach(c => c.public = true);
  S.tab = "acusacion"; save();
  SFX.heartbeat(false);
  if (S.music) SFX.phase();
  narrate(C.finale.narration, "Medianoche", render);
  render();
}

// ---------- reloj principal ----------
let lastSec = -1, heartState = 0;
function tickLoop() {
  syncTick();
  if (S.started && !S.finished) {
    const rem = remaining(), el = elapsed() / S.duration;
    const t = $("#timer");
    if (t) {
      t.textContent = fmt(rem);
      t.classList.toggle("warn", rem <= 300 && rem > 60);
      t.classList.toggle("crit", rem <= 60);
      t.classList.toggle("paused", S.paused);
      const bar = $("#timebar"); if (bar) bar.style.width = `${(1 - rem / S.duration) * 100}%`;
    }
    if (!S.paused && !narrating) {
      for (let i = C.phases.length - 1; i > S.phase; i--) {
        if (el >= C.phases[i].at) { enterPhase(i); break; }
      }
    }
    const want = S.paused || !S.music ? 0 : rem <= 60 ? 2 : rem <= 300 ? 1 : 0;
    if (want !== heartState) { heartState = want; SFX.heartbeat(want > 0, want === 2); }
    const sec = Math.ceil(rem);
    if (sec !== lastSec) { if (!S.paused && rem <= 10 && S.music) SFX.tick(); lastSec = sec; }
    if (rem <= 0 && !S.paused) finishGame();
  }
  requestAnimationFrame(tickLoop);
}

// ---------- vistas: principal ----------
const TABS = [["caso", "El caso"], ["sospechosos", "Sospechosos"], ["evidencias", "Evidencias"], ["linea", "Línea de tiempo"], ["fantasma", "El fantasma"], ["acusacion", "Acusación"]];

let lastRoute = null;
function render() {
  const route = location.hash.replace(/^#\/?/, "");
  if (route !== lastRoute) {
    if (lastRoute !== null) { window.scrollTo(0, 0); if (/^(e|j)\//.test(route) || route === "yo") $("#overlay-root").innerHTML = ""; }
    lastRoute = route;
  }
  document.body.className = "";
  if (route.startsWith("e/")) return renderPhone(route.slice(2));
  if (route.startsWith("j/")) return renderJoin(route.slice(2));
  if (route === "yo") return renderMe();
  if (route === "imprimir") return renderPrint();
  if (route === "guia") return renderGuide();
  if (!S.started) return renderStart();
  renderMain();
}

function renderStart() {
  document.body.className = "start";
  ensureSession();
  $("#app").innerHTML = `
  <div class="start-screen">
    <div class="candle"></div>
    <div class="kicker">Un misterio de ${C.year}</div>
    <h1 class="title">${esc(C.title)}</h1>
    <p class="subtitle">${esc(C.subtitle)}</p>
    <div class="setup">
      ${S.teams.map(t => `<label class="team-input" style="--c:${t.color}">Equipo<input data-team="${t.id}" value="${esc(t.name)}"></label>`).join("")}
      <label class="team-input">Duración
        <select id="dur">${[30, 45, 60].map(m => `<option value="${m}" ${S.duration === m * 60 ? "selected" : ""}>${m} minutos</option>`).join("")}</select>
      </label>
    </div>
    ${joinBox()}
    <button class="btn big" id="begin">Abrir la casa</button>
    <div class="start-links"><a href="#/guia">Guía del presentador</a> · <a href="#/imprimir">Imprimir pistas</a></div>
  </div>`;
  $("#begin").onclick = () => {
    document.querySelectorAll("[data-team]").forEach(i => { team(i.dataset.team).name = i.value.trim() || team(i.dataset.team).name; });
    S.duration = +$("#dur").value * 60;
    SFX.ensure(); if (S.music) SFX.startAmbient();
    try { document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); } catch (e) {}
    S.started = true; S.playDate = isoToday(); S.paused = true; S.startAt = Date.now(); S.pausedAt = S.startAt; S.phase = 0; save();
    renderMain();
    narrate(C.phases[0].narration, "Prólogo", () => {
      S.paused = false; S.pausedTotal += Date.now() - S.pausedAt; save();
      S.tab = "caso"; save(); render(); openAuto("forense");
    });
  };
}

function header() {
  const ph = C.phases[S.phase];
  return `<header class="top">
    <div class="brand"><div class="b-title">${esc(C.title)}</div><div class="b-phase">${S.finished ? "Medianoche · Acusación" : esc(ph.name)}</div></div>
    <div class="clock"><div id="timer" class="timer">${fmt(remaining())}</div><div class="timebar"><div id="timebar"></div></div></div>
    <div class="scores">${S.teams.map(t => `<div class="score" style="--c:${t.color}"><span>${esc(t.name)}</span><b>${score(t.id)}</b></div>`).join("")}
      ${S.session && SYNC.on() ? `<button class="join-chip" id="join-chip" title="Unirse desde el celular">Sesión <b>${S.session}</b></button>` : ""}
      <button class="gear" id="gear" title="Panel del presentador">⚙</button></div>
  </header>
  <nav class="tabs">${TABS.map(([id, n]) => `<button data-tab="${id}" class="${S.tab === id ? "on" : ""}">${n}</button>`).join("")}</nav>`;
}

function renderMain() {
  document.body.className = "main";
  $("#app").innerHTML = header() + `<main id="view"></main>`;
  document.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { S.tab = b.dataset.tab; save(); renderMain(); });
  $("#gear").onclick = hostPanel;
  const jc = $("#join-chip"); if (jc) jc.onclick = () => modal(`<h2>Únete desde tu celular</h2>${joinBox()}`, "join-modal");
  const v = $("#view");
  ({ caso: viewCase, sospechosos: viewSuspects, evidencias: viewEvidence, linea: viewTimeline, fantasma: viewGhost, acusacion: viewAccuse })[S.tab](v);
}

function viewCase(v) {
  const f = C.autoEvidence.forense;
  v.innerHTML = `<section class="case">
    <div class="case-left">
      <h2>La víctima</h2>
      <div class="victim"><div class="portrait big" style="--c:#9b8b6a">EM</div>
      <div><h3>${esc(C.victim)}</h3><p>Viuda, coleccionista de arte, dueña de esta casa. Murió la noche del ${fillDates("{d:0}")} de ${C.year}, durante el Baile de Ánimas.</p></div></div>
      <h2>Lo que deben descubrir</h2>
      <ol class="goals"><li><b>Quién</b> la mató</li><li><b>Cómo</b> lo hizo</li><li><b>Por qué</b></li><li>Bonus: el <b>cómplice</b> y el <b>origen del veneno</b></li></ol>
      <h2>Cómo se juega</h2>
      <ul class="rules">
        <li>Busquen las tarjetas de evidencia escondidas en la sala, la cocina, el baño, el cuarto y el patio. Solo <b>4</b> escondites llevan el <b>sello de Elvira</b> («EM»): cada equipo puede reclamar solo <b>2 sellos</b>; los otros 2 son del otro equipo; cada pista resuelta trae un <b>eco</b>: un acertijo que lleva a la siguiente. Cada tarjeta trae dos cosas: la <b>pista del crimen</b> (el documento, para resolver el caso) y el <b>siguiente escondite</b> (solo sirve para encontrar otra tarjeta).</li>
        <li>Escaneen el QR con el celular, respondan la pregunta y lean la pista <b>en secreto</b>.</li>
        <li>Con el celular unido a la sesión, los puntos llegan solos a esta pantalla.</li>
        <li>Sin celular: escriban el código de la tarjeta aquí y respondan en pantalla (todos lo verán).</li>
        <li>${S.revealOnPhase ? "Al cambiar de fase, la casa revela a todos las evidencias encontradas." : "Las evidencias son privadas hasta el final."}</li>
      </ul>
    </div>
    <div class="case-right"><h2>${esc(f.title)}</h2>${docHtml(f)}</div>
  </section>`;
}

function viewSuspects(v) {
  v.innerHTML = `<section class="suspects">${C.suspects.map(s => `
    <article class="suspect" style="--c:${s.color}">
      <div class="portrait" style="--c:${s.color}">${s.name.split(" ").filter(w => !w.endsWith(".")).map(w => w[0]).slice(0, 2).join("")}</div>
      <h3>${esc(s.name)}</h3><div class="role">${esc(s.role)} · ${s.age} años</div>
      <p class="bio">${esc(s.bio)}</p>
      <blockquote>«${esc(s.statement)}»</blockquote>
      ${S.phase >= 1 || S.finished ? `<blockquote class="later">«${esc(s.later)}»</blockquote>` : `<div class="sealed-note">Más declaraciones tras el apagón…</div>`}
    </article>`).join("")}</section>`;
}

function evidenceList() {
  const autos = [];
  C.phases.forEach((p, i) => { if (i <= S.phase || S.finished) p.evidence.forEach(id => autos.push({ auto: id, ...C.autoEvidence[id] })); });
  const claimed = C.evidence.filter(e => S.claims[e.code]).sort((a, b) => S.claims[a.code].at - S.claims[b.code].at);
  return { autos, claimed };
}

function viewEvidence(v) {
  const { autos, claimed } = evidenceList();
  v.innerHTML = `<section class="evidence">
    <form class="claim" id="claim">
      <div class="claim-label">¿Encontraron algo?</div>
      <input id="claim-input" placeholder="Código de la tarjeta (sin celular)" autocomplete="off" autocapitalize="characters">
      <div class="claim-teams">${S.teams.map((t, i) => `<button type="submit" class="btn team-btn" data-team="${t.id}" style="--c:${t.color}">${esc(t.name)}</button>`).join("")}</div>
    </form>
    <div class="ev-count">${claimed.length} de ${C.evidence.length} pistas encontradas</div>
    <div class="room-left">${[...new Set(C.evidence.map(e => e.room))].map(r => { const n = C.evidence.filter(e => e.room === r && !S.claims[e.code]).length; return `<span class="${n ? "" : "done"}">${esc(r)}: ${n ? `quedan ${n}` : "vacío"}</span>`; }).join("")}</div>
    <div class="board">
      ${autos.map(a => `<button class="ev-card public official" data-auto="${a.auto}"><div class="ev-kind">${esc(a.kind)}</div><div class="ev-title">${esc(a.title)}</div><div class="ev-team">Oficial</div></button>`).join("")}
      ${claimed.map(e => { const c = S.claims[e.code], t = team(c.team); return `
        <button class="ev-card ${c.public ? "public" : "private"}" data-code="${e.code}" style="--c:${t.color}">
          <div class="ev-kind">${esc(e.kind)} · ${esc(e.room)}</div><div class="ev-title">${esc(e.title)}</div>
          <div class="ev-team">${esc(t.name)}${c.public ? "" : " · privada"}</div></button>`; }).join("")}
      ${Array.from({ length: C.evidence.length - claimed.length }, () => `<div class="ev-card empty">?</div>`).join("")}
    </div></section>`;
  $("#claim").onsubmit = e => {
    e.preventDefault();
    const t = e.submitter && e.submitter.dataset.team;
    if (!t) { toast("Toca el botón del equipo que la encontró"); return; }
    claimInput($("#claim-input").value, t);
  };
  v.querySelectorAll("[data-auto]").forEach(b => b.onclick = () => openAuto(b.dataset.auto));
  v.querySelectorAll("[data-code]").forEach(b => b.onclick = () => openClaimed(b.dataset.code));
  setTimeout(() => $("#claim-input") && $("#claim-input").focus(), 50);
}

function openAuto(id) { const a = C.autoEvidence[id]; modal(`<h2>${esc(a.title)}</h2>${docHtml(a)}`, "doc-modal"); }
function openClaimed(code) {
  const e = byCode(code), c = S.claims[code], t = team(c.team);
  if (!c.public) {
    const m = modal(`<h2>${esc(e.title)}</h2><p class="center">Esta evidencia es privada de <b style="color:${t.color}">${esc(t.name)}</b>.</p>
      <p class="center small">La casa la revelará a todos en la próxima fase.</p><div class="center"><button class="btn ghost" id="pub">El presentador la hace pública</button></div>`);
    $("#pub", m.el).onclick = () => { c.public = true; save(); m.close(); renderMain(); openClaimed(code); };
    return;
  }
  modal(`<h2>${esc(e.title)}</h2>${docHtml(e)}<div class="found-by" style="color:${t.color}">Encontrada por ${esc(t.name)}</div>`, "doc-modal");
}

const SEAL_MAX = 2;
const sealsOf = (rows, teamId, except) => rows.filter(([code, t]) => t === teamId && code !== except && (byCode(code) || {}).start).length;
const sealFull = (ev, teamId) => ev.start && sealsOf(Object.entries(S.claims).map(([k, c]) => [k, c.team]), teamId, ev.code) >= SEAL_MAX;
const sealToast = teamId => { const t = team(teamId); SFX.wrong(); toast(`<b>${esc(t.name)}</b> ya tiene sus ${SEAL_MAX} sellos EM. Esa pista es del otro equipo.`, t.color); };

function claim(ev, teamId, isPublic, fromSync) {
  if (S.claims[ev.code]) {
    const t = team(S.claims[ev.code].team);
    toast(`«${esc(ev.title)}» ya fue reclamada por <b>${esc(t.name)}</b>`, t.color); SFX.wrong(); return false;
  }
  if (!fromSync && sealFull(ev, teamId)) { sealToast(teamId); return false; }
  S.claims[ev.code] = { team: teamId, at: Date.now(), public: !!isPublic };
  if (!fromSync && S.session && SYNC.on()) SYNC.claim(S.session, teamId, ev.code);
  const pts = ev.puzzle ? C.points.puzzle : C.points.evidence;
  addPts(teamId, pts, ev.title);
  const t = team(teamId);
  if (S.music) SFX.found();
  toast(`<b>${esc(t.name)}</b> encontró: ${esc(ev.title)} <b>+${pts}</b>`, t.color);
  return true;
}

function claimInput(raw, teamId) {
  const val = raw.trim(); if (!val) return;
  const sealEv = bySeal(val);
  if (sealEv) { claim(sealEv, teamId, false); renderMain(); return; }
  $("#claim-input").value = "";
  const ev = byCode(val.replace(/\s/g, ""));
  if (!ev) { SFX.wrong(); toast("La casa no reconoce ese código…"); $("#claim-input").select(); return; }
  if (S.claims[ev.code]) { claim(ev, teamId); return; }
  if (sealFull(ev, teamId)) { sealToast(teamId); return; }
  askOnScreen(ev, teamId);
}

function askOnScreen(ev, teamId) {
  const t = team(teamId);
  const m = modal(`<div class="q-type">${esc(ev.q.type)}</div><h2>${esc(ev.title)}</h2>
    <p class="q-text">${esc(ev.q.text).replace(/\n/g, "<br>")}</p>
    <form id="qa"><input id="qa-in" placeholder="Respuesta de ${esc(t.name)}" autocomplete="off"><button class="btn" style="--c:${t.color}">Responder</button></form>
    <div class="q-msg" id="qa-msg"></div>`, "q-modal");
  const input = $("#qa-in", m.el); input.focus();
  $("#qa", m.el).onsubmit = e => {
    e.preventDefault();
    const until = S.cooldown[ev.code] || 0;
    if (Date.now() < until) return;
    if (checkAnswer(ev, input.value)) {
      m.close(); claim(ev, teamId, true); renderMain(); openClaimed(ev.code);
    } else {
      SFX.wrong(); m.el.classList.remove("shake"); void m.el.offsetWidth; m.el.classList.add("shake");
      S.cooldown[ev.code] = Date.now() + 15000; save();
      let n = 30; const msg = $("#qa-msg", m.el); input.disabled = true;
      const iv = setInterval(() => { msg.textContent = `Incorrecto. El fantasma calla… ${n--}s`; if (n < 0) { clearInterval(iv); msg.textContent = ""; input.disabled = false; input.select(); } }, 1000);
    }
  };
}

const tkey = t => { let [h, m] = t.split(":").map(Number); if (h < 12) h += 24; return h * 60 + m; };
function viewTimeline(v) {
  const items = [];
  const { autos, claimed } = evidenceList();
  autos.forEach(a => (a.timeline || []).forEach(([t, txt]) => items.push({ t, txt, src: a.title, color: "#cfc3a3" })));
  claimed.filter(e => S.claims[e.code].public).forEach(e => (e.timeline || []).forEach(([t, txt]) => items.push({ t, txt, src: e.title, color: team(S.claims[e.code].team).color })));
  items.sort((a, b) => tkey(a.t) - tkey(b.t));
  v.innerHTML = `<section class="timeline"><h2>La noche del ${fillDates("{d:0}")} de ${C.year}</h2>
    ${items.length ? `<ol>${items.map(i => `<li style="--c:${i.color}"><time>${i.t}</time><div><p>${esc(i.txt)}</p><small>${esc(i.src)}</small></div></li>`).join("")}</ol>` : `<p class="center">Aún no hay hechos públicos.</p>`}
    <p class="small center">Solo aparecen hechos de evidencias públicas.</p></section>`;
}

function viewGhost(v) {
  const r = C.riddles[S.riddleIdx];
  v.innerHTML = `<section class="ghost">
    <div class="ouija-col">
      <h2>Pregúntale al fantasma</h2>
      <p class="small">Cada equipo puede hacer <b>una pregunta de sí o no</b> por fase. El presentador elige la respuesta del espíritu.</p>
      <div class="ouija"><div class="ouija-arc">${C.ouija.map((a, i) => `<span class="oa" data-i="${i}">${a}</span>`).join("")}</div><div class="planchette" id="planchette"></div>
        <div class="ouija-letters">A B C D E F G H I J K L M<br>N Ñ O P Q R S T U V W X Y Z</div></div>
      <div class="ouija-btns">${C.ouija.map((a, i) => `<button class="btn ghost small-btn" data-o="${i}">${a}</button>`).join("")}</div>
      <div class="ouija-teams">${S.teams.map(t => { const k = `${t.id}-${S.phase}`; return `<label style="color:${t.color}"><input type="checkbox" data-ou="${k}" ${S.ouijaUsed[k] ? "checked" : ""}> ${esc(t.name)} ya preguntó en esta fase</label>`; }).join("")}</div>
    </div>
    <div class="ghost-col">
      <h2>Visiones</h2>
      <p class="small">¿Atascados? El fantasma susurra dónde buscar una pista no encontrada. Cuesta <b>${-C.points.vision} punto</b>.</p>
      <div class="vision-btns">${S.teams.map(t => `<button class="btn" data-vision="${t.id}" style="--c:${t.color}">Visión para ${esc(t.name)}</button>`).join("")}</div>
      <h2>Acertijo relámpago</h2>
      <p class="small">El primer equipo en gritar la respuesta correcta gana <b>+${C.points.riddle}</b>.</p>
      ${r ? `<div class="riddle"><p>${esc(r.q)}</p>${S.riddleShown ? `<p class="ans">${esc(r.a)}</p>` : ""}</div>
        <div class="riddle-btns"><button class="btn ghost" id="r-ans">Ver respuesta</button>${S.teams.map(t => `<button class="btn" data-rp="${t.id}" style="--c:${t.color}">+${C.points.riddle} ${esc(t.name)}</button>`).join("")}</div>` : ""}
      <button class="btn" id="r-next">${r ? "Otro acertijo" : "Lanzar acertijo"}</button>
    </div></section>`;
  v.querySelectorAll("[data-o]").forEach(b => b.onclick = () => ouija(+b.dataset.o));
  v.querySelectorAll("[data-ou]").forEach(c => c.onchange = () => { S.ouijaUsed[c.dataset.ou] = c.checked; save(); });
  v.querySelectorAll("[data-vision]").forEach(b => b.onclick = () => vision(b.dataset.vision));
  $("#r-next").onclick = () => { S.riddleIdx = (S.riddleIdx + 1) % C.riddles.length; S.riddleShown = false; save(); renderMain(); speak(C.riddles[S.riddleIdx].q); };
  if (r) {
    $("#r-ans").onclick = () => { S.riddleShown = true; save(); renderMain(); };
    v.querySelectorAll("[data-rp]").forEach(b => b.onclick = () => { addPts(b.dataset.rp, C.points.riddle, "Acertijo relámpago"); SFX.found(); S.riddleShown = true; save(); renderMain(); });
  }
}
function ouija(i) {
  const target = document.querySelector(`.oa[data-i="${i}"]`), p = $("#planchette"), board = $(".ouija");
  if (!target || !p) return;
  const br = board.getBoundingClientRect();
  const path = [[0.3, 0.7], [0.7, 0.55], [0.45, 0.4]];
  let step = 0;
  p.classList.add("moving");
  const go = () => {
    if (step < path.length) { p.style.left = `${path[step][0] * 100}%`; p.style.top = `${path[step][1] * 100}%`; step++; setTimeout(go, 700); return; }
    const r = target.getBoundingClientRect();
    p.style.left = `${((r.left + r.width / 2 - br.left) / br.width) * 100}%`;
    p.style.top = `${((r.top + r.height / 2 - br.top) / br.height) * 100}%`;
    setTimeout(() => { target.classList.add("lit"); speak(C.ouija[i]); SFX.bell(196, 3, 0.2); setTimeout(() => target.classList.remove("lit"), 3000); }, 800);
  };
  document.querySelectorAll(".oa").forEach(o => o.classList.remove("lit"));
  go();
}
function vision(teamId) {
  const left = C.evidence.filter(e => !S.claims[e.code]);
  if (!left.length) return toast("Ya no quedan secretos escondidos.");
  const ev = left[Math.floor(Math.random() * left.length)];
  addPts(teamId, C.points.vision, "Visión");
  const t = team(teamId);
  modal(`<div class="q-type">Visión para ${esc(t.name)}</div><p class="vision-text">${esc(hintFor(ev))}</p><p class="small center">Una pista espera en: <b>${esc(ev.room)}</b></p>`, "vision-modal");
  speak(hintFor(ev));
  renderMain();
}
const hintFor = ev => (spots()[ev.code + ":hint"]) || ev.hint;

function optionsFor(field) {
  const o = C.accusation[field].options;
  if (o === "suspects") return C.suspects.map(s => [s.id, s.name]);
  if (o === "suspects+nadie") return [...C.suspects.map(s => [s.id, s.name]), ["nadie", "Nadie, actuó sola/o"]];
  return o;
}
const FIELDS = ["culprit", "method", "motive", "accomplice", "source"];
function viewAccuse(v) {
  if (S.revealed) return viewResults(v);
  const remote = SYNC.on() && !!S.session;
  v.innerHTML = `<section class="accuse">
    <h2>${S.finished ? "La medianoche ha llegado. Acusen." : "Acusación final"}</h2>
    <p class="small center">${remote ? "Cada equipo sella su acusación desde un celular, en la pestaña Acusación. Solo hay un intento. La verdad se revela cuando los dos equipos hayan votado." : "Cada equipo sella su acusación en secreto. Solo hay un intento."}</p>
    <div class="acc-cols">${S.teams.map(t => {
      const a = S.accusations[t.id];
      const form = `<form data-acc="${t.id}">${FIELDS.map(f => `<label>${esc(C.accusation[f].label)}<select name="${f}" required><option value="">—</option>${optionsFor(f).map(([id, n]) => `<option value="${id}">${esc(n)}</option>`).join("")}</select></label>`).join("")}
        <button class="btn" style="--c:${t.color}">Sellar acusación</button></form>`;
      return `<div class="acc" style="--c:${t.color}"><h3>${esc(t.name)}</h3>${a ? `<div class="sealed">Acusación sellada</div>` : remote
        ? `<div class="sealed waiting">Esperando su veredicto…</div><details class="acc-manual"><summary>Sellar desde la TV (sin celular)</summary>${form}</details>` : form}</div>`; }).join("")}</div>
    <div class="center"><button class="btn big" id="reveal" ${(remote ? Object.keys(S.accusations).length >= S.teams.length : Object.keys(S.accusations).length) ? "" : "disabled"}>Revelar la verdad</button></div>
  </section>`;
  v.querySelectorAll("[data-acc]").forEach(f => f.onsubmit = e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(f));
    if (!confirm(`¿Sellar la acusación de ${team(f.dataset.acc).name}? No se podrá cambiar.`)) return;
    S.accusations[f.dataset.acc] = d; save(); SFX.bell(262, 3, 0.3); renderMain();
    if (remote) SYNC.accuse(S.session, f.dataset.acc, d, "TV").catch(() => {});
  });
  $("#reveal").onclick = () => {
    if (!S.finished) { S.finished = true; S.paused = true; S.pausedAt = Date.now(); SFX.heartbeat(false); }
    hush();
    narrate(C.reveal, "La verdad", () => {
      S.revealed = true;
      S.teams.forEach(t => { const a = S.accusations[t.id]; if (!a) return; FIELDS.forEach(f => { if (a[f] === C.solution[f]) addPts(t.id, C.points[f === "culprit" ? "culprit" : f], `Acusación: ${C.accusation[f].label}`); }); });
      save(); SFX.found(); renderMain();
    });
  };
}
function viewResults(v) {
  const label = (f, id) => (optionsFor(f).find(o => o[0] === id) || [, "—"])[1];
  const ranked = [...S.teams].sort((a, b) => score(b.id) - score(a.id));
  const tie = score(ranked[0].id) === score(ranked[1].id);
  v.innerHTML = `<section class="results">
    <h2 class="winner" style="--c:${tie ? "#e9dfc7" : ranked[0].color}">${tie ? "¡Empate entre los vivos!" : `¡Gana ${esc(ranked[0].name)}!`}</h2>
    <table class="res"><tr><th></th><th>Solución</th>${S.teams.map(t => `<th style="color:${t.color}">${esc(t.name)}</th>`).join("")}</tr>
    ${FIELDS.map(f => `<tr><td>${esc(C.accusation[f].label)}</td><td><b>${esc(label(f, C.solution[f]))}</b></td>${S.teams.map(t => { const a = S.accusations[t.id]; if (!a) return "<td>—</td>"; const ok = a[f] === C.solution[f]; return `<td class="${ok ? "ok" : "bad"}">${esc(label(f, a[f]))} ${ok ? `+${C.points[f]}` : ""}</td>`; }).join("")}</tr>`).join("")}
    <tr class="tot"><td>Puntos totales</td><td></td>${S.teams.map(t => `<td style="color:${t.color}">${score(t.id)}</td>`).join("")}</tr></table>
    <details class="log"><summary>Detalle de puntos</summary><ul>${S.log.map(l => `<li style="color:${team(l.team).color}">${esc(team(l.team).name)}: ${l.pts > 0 ? "+" : ""}${l.pts} · ${esc(l.reason)}</li>`).join("")}</ul></details>
  </section>`;
}

// ---------- panel del presentador ----------
function hostPanel() {
  const m = modal(`<h2>Panel del presentador</h2>
    <div class="host-grid">
      <button class="btn" id="h-pause">${S.paused ? "Reanudar" : "Pausar"} reloj</button>
      <button class="btn ghost" id="h-plus">+1 min</button><button class="btn ghost" id="h-minus">−1 min</button>
      <button class="btn ghost" id="h-phase" ${S.phase >= C.phases.length - 1 ? "disabled" : ""}>Saltar a la siguiente fase</button>
      <button class="btn ghost" id="h-end">Terminar: ir a la acusación</button>
      <button class="btn ghost" id="h-pub">Hacer públicas todas las evidencias</button>
    </div>
    <h3>Puntos manuales</h3>
    <div class="host-grid">${S.teams.map(t => `<span style="color:${t.color}">${esc(t.name)}</span><button class="btn ghost" data-p="${t.id}" data-v="1">+1</button><button class="btn ghost" data-p="${t.id}" data-v="-1">−1</button>`).join("")}</div>
    <h3>Opciones</h3>
    <label class="opt"><input type="checkbox" id="o-tts" ${S.tts ? "checked" : ""}> Voz del fantasma (narración en voz alta)</label>
    <label class="opt">Voz: <select id="o-voice"><option value="" ${!S.voiceName ? "selected" : ""}>Elvira (voz grabada)</option>${esVoices().map(v => `<option value="${esc(v.name)}" ${S.voiceName === v.name ? "selected" : ""}>${esc(v.name)} (${esc(v.lang)})</option>`).join("")}</select> <button class="btn ghost" id="o-vtest">Probar</button></label>
    <label class="opt">Fecha del crimen (día y mes): <input type="date" id="o-date" value="${esc(S.dateOverride || "")}"> <small>vacío = el día en que se juega (${esc(fillDates("{d:0}"))})</small></label>
    <label class="opt"><input type="checkbox" id="o-music" ${S.music ? "checked" : ""}> Ambiente y efectos de sonido</label>
    <label class="opt"><input type="checkbox" id="o-rev" ${S.revealOnPhase ? "checked" : ""}> Revelar evidencias a todos al cambiar de fase</label>
    <div class="host-links"><a href="#/guia" target="_blank">Guía y solución</a> · <a href="#/imprimir" target="_blank">Imprimir pistas</a> · <button class="linkish" id="h-reset">Reiniciar juego</button></div>`, "host");
  const resume = () => { if (S.paused && !S.finished) { S.pausedTotal += Date.now() - S.pausedAt; S.paused = false; } };
  $("#h-pause", m.el).onclick = () => { if (S.paused) resume(); else { S.paused = true; S.pausedAt = Date.now(); } save(); m.close(); renderMain(); };
  $("#h-plus", m.el).onclick = () => { S.duration += 60; save(); toast("+1 minuto"); };
  $("#h-minus", m.el).onclick = () => { S.duration = Math.max(60, S.duration - 60); save(); toast("−1 minuto"); };
  $("#h-phase", m.el).onclick = () => { m.close(); const n = S.phase + 1; const need = C.phases[n].at * S.duration; if (elapsed() < need) { S.pausedTotal -= (need - elapsed()) * 1000; } save(); enterPhase(n); };
  $("#h-end", m.el).onclick = () => { if (confirm("¿Detener el reloj y pasar a la acusación?")) { m.close(); finishGame(); } };
  $("#h-pub", m.el).onclick = () => { Object.values(S.claims).forEach(c => c.public = true); save(); m.close(); renderMain(); };
  m.el.querySelectorAll("[data-p]").forEach(b => b.onclick = () => { addPts(b.dataset.p, +b.dataset.v, "Presentador"); renderMain(); hostPanel(); m.close(); });
  $("#o-voice", m.el).onchange = e => { S.voiceName = e.target.value; save(); pickVoice(); };
  $("#o-vtest", m.el).onclick = () => { const t = S.tts; S.tts = true; speak("Soy Elvira Montenegro. Esta noche me ayudarán a descansar."); S.tts = t; };
  $("#o-date", m.el).onchange = e => { S.dateOverride = e.target.value; save(); toast(`Fecha de la historia: ${esc(fillDates("{d:0}"))}`); renderMain(); };
  $("#o-tts", m.el).onchange = e => { S.tts = e.target.checked; if (!S.tts) hush(); save(); };
  $("#o-music", m.el).onchange = e => { S.music = e.target.checked; S.music ? SFX.startAmbient() : (SFX.stopAmbient(), SFX.heartbeat(false), heartState = 0); save(); };
  $("#o-rev", m.el).onchange = e => { S.revealOnPhase = e.target.checked; save(); };
  $("#h-reset", m.el).onclick = () => { if (confirm("¿Borrar todo el progreso y volver al inicio?")) { const keep = { tts: S.tts, music: S.music, duration: S.duration, teams: S.teams, voiceName: S.voiceName, dateOverride: S.dateOverride }; S = Object.assign(fresh(), keep); save(); hush(); SFX.heartbeat(false); SFX.stopAmbient(); m.close(); render(); } };
}

// ---------- celular ----------
function phoneState() { try { return JSON.parse(localStorage.getItem(PHONE_KEY)) || {}; } catch (e) { return {}; } }
function renderPhone(code) {
  document.body.className = "phone";
  const ev = byCode(code);
  if (!ev) { $("#app").innerHTML = `<div class="phone-wrap"><h1 class="title sm">${esc(C.title)}</h1><p class="center">Esta pista no existe… o el fantasma la escondió mejor.</p></div>`; return; }
  const ps = phoneState();
  const solved = ps[ev.code];
  const me = getMe();
  remoteDate = me && me.date || null;
  $("#app").innerHTML = `<div class="phone-wrap">
    ${teamBar(me)}
    <div class="kicker">${esc(C.title)}</div>
    <div class="q-type">Evidencia ${ev.code} · ${esc(ev.room)}</div>
    <h1 class="title sm">${esc(ev.title)}</h1>
    ${solved ? `${docHtml(ev)}${claimBox(ev, solved, me)}` : `<div id="pq-wrap">
      <div class="q-type">${esc(ev.q.type)}</div>
      <p class="q-text">${esc(ev.q.text).replace(/\n/g, "<br>")}</p>
      <form id="pq"><input id="pq-in" placeholder="Tu respuesta" autocomplete="off"><button class="btn">Responder</button></form>
      <div class="q-msg" id="pq-msg"></div></div>`}
  </div>`;
  const done = r => { ps[ev.code] = r; localStorage.setItem(PHONE_KEY, JSON.stringify(ps)); renderPhone(code); window.scrollTo(0, 0); };
  const sealLocked = () => ev.start ? SYNC.claims(me.session, 0).then(rows => sealsOf((rows || []).map(r => [r.code, r.team]), me.team, ev.code) >= SEAL_MAX) : Promise.resolve(false);
  const lockSeal = () => { $("#pq-wrap").innerHTML = `<div class="seal-box"><div>Sello del otro equipo</div><b>✕</b><small>Tu equipo ya encontró sus ${SEAL_MAX} sellos EM. Deja esta tarjeta en su lugar: es del otro equipo.</small></div>`; };
  const tryClaim = () => SYNC.player(getPlayer().id).then(async r => {
    if (!(r && r.session_id === me.session && r.team === me.team && r.status === "ok")) return "pending";
    if (await sealLocked()) return "sealfull";
    return SYNC.claim(me.session, me.team, ev.code);
  }).catch(() => "error").then(r => r === "sealfull" ? (delete ps[ev.code], localStorage.setItem(PHONE_KEY, JSON.stringify(ps)), renderPhone(code), setTimeout(lockSeal, 0)) : done(r));
  if (solved) { const b = $("#retry"); if (b) b.onclick = () => { b.disabled = true; tryClaim(); }; return; }
  if (ev.start && me && SYNC.on()) sealLocked().then(x => { if (x && $("#pq-wrap")) lockSeal(); }).catch(() => {});
  $("#pq").onsubmit = e => {
    e.preventDefault();
    const inp = $("#pq-in");
    if (checkAnswer(ev, inp.value)) {
      try { SFX.found(); } catch (e2) {}
      if (navigator.vibrate) navigator.vibrate([60, 40, 120]);
      if (me && SYNC.on()) {
        inp.disabled = true; $("#pq-msg").textContent = "Avisando a la casa…";
        tryClaim();
      }
      else done(true);
    } else {
      try { SFX.wrong(); } catch (e2) {}
      if (navigator.vibrate) navigator.vibrate(300);
      let n = 20; inp.disabled = true; const msg = $("#pq-msg");
      const iv = setInterval(() => { msg.textContent = `Incorrecto. Espera ${n--}s para intentar otra vez.`; if (n < 0) { clearInterval(iv); msg.textContent = ""; inp.disabled = false; inp.select(); } }, 1000);
    }
  };
}

// ---------- sesiones (TV ↔ celulares) ----------
const ME_KEY = "montenegro-me-v1";
const getMe = () => { try { return JSON.parse(localStorage.getItem(ME_KEY)); } catch (e) { return null; } };
const setMe = m => m ? localStorage.setItem(ME_KEY, JSON.stringify(m)) : localStorage.removeItem(ME_KEY);
const PLAYER_KEY = "montenegro-player-v1";
const ADJ = ["cute", "angry", "hungry", "sleepy", "spooky", "brave", "sneaky", "grumpy", "lucky", "fuzzy", "silent", "dizzy", "wild", "shy", "jolly", "creepy", "fancy", "clumsy", "mighty", "witty"];
const ANIMAL = ["kitty", "bird", "dragon", "owl", "raven", "bat", "fox", "panda", "wolf", "toad", "ghost", "spider", "llama", "otter", "moth", "badger", "lizard", "goose", "hamster", "squid"];
const pick = a => a[Math.floor(Math.random() * a.length)];
function getPlayer() {
  let p = null; try { p = JSON.parse(localStorage.getItem(PLAYER_KEY)); } catch (e) {}
  if (!p || !p.id) {
    const id = crypto.randomUUID ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c => (c ^ Math.random() * 16 >> c / 4).toString(16));
    p = { id, name: `${pick(ADJ)}-${pick(ANIMAL)}` }; localStorage.setItem(PLAYER_KEY, JSON.stringify(p));
  }
  return p;
}
function rosterHtml(players) {
  const recent = (players || []).filter(p => p.status !== "rejected" && Date.now() - Date.parse(p.seen_at) < 15 * 60000);
  return S.teams.map(t => { const ps = recent.filter(p => p.team === t.id);
    return `<div class="roster-team" style="--c:${t.color}"><div class="roster-head"><span>${esc(t.name)}</span><b>${ps.length}</b></div>
      <div class="roster-names">${ps.map(p => `<span class="${p.status === "pending" ? "pending" : ""}">${esc(p.name)}${p.status === "pending" ? " ?" : ""}</span>`).join("") || `<i>nadie todavía</i>`}</div></div>`; }).join("");
}
let rosterCache = [];
const joinUrl = () => `${baseUrl()}#/j/${S.session}`;
function ensureSession() {
  if (!SYNC.on() || S.session) return;
  S.session = SYNC.newCode(); S.syncAfter = 0; save();
}
function joinBox() {
  if (!SYNC.on() || !S.session) return "";
  return `<div class="join-box"><div class="join-qr">${qrSvg(joinUrl())}</div>
    <div class="join-txt"><div class="kicker">Únete desde tu celular</div><b class="join-code">${S.session}</b>
    <small>Escanea el código, elige tu equipo y escanea las pistas: los puntos llegan solos a la pantalla.</small></div></div>
    <div class="roster">${rosterHtml(rosterCache)}</div>`;
}
const sessionSnapshot = () => ({ teams: S.teams.map(t => ({ id: t.id, name: t.name, color: t.color, score: score(t.id) })),
  started: !!S.started, finished: !!S.finished, phase: S.phase, phaseName: C.phases[S.phase].name, date: storyDay(),
  claims: Object.fromEntries(Object.entries(S.claims).map(([k, c]) => [k, [c.team, c.public ? 1 : 0]])), acc: Object.keys(S.accusations), revealed: !!S.revealed });
let syncBusy = false, syncAt = 0, syncPushed = "", syncPushAt = 0, syncFail = 0;
function syncTick() {
  const r = location.hash.replace(/^#\/?/, "");
  if (!S.session || !SYNC.on() || syncBusy || r.startsWith("e/") || r.startsWith("j/") || r === "yo" || r === "imprimir" || r === "guia") return;
  const now = Date.now();
  if (now - syncAt < (syncFail ? Math.min(30000, 2500 * 2 ** syncFail) : 2500)) return;
  syncAt = now; syncBusy = true;
  (async () => {
    const snap = JSON.stringify(sessionSnapshot());
    if (snap !== syncPushed || now - syncPushAt > 60000) { await SYNC.pushState(S.session, JSON.parse(snap)); syncPushed = snap; syncPushAt = now; }
    {
      rosterCache = await SYNC.players(S.session) || [];
      document.querySelectorAll(".roster").forEach(el => { el.innerHTML = rosterHtml(rosterCache); });
    }
    renderApprovals();
    if (S.started && !S.revealed && Object.keys(S.accusations).length < S.teams.length) {
      let ch = false;
      for (const a of await SYNC.accusations(S.session) || []) {
        if (S.accusations[a.team] || !team(a.team)) continue;
        S.accusations[a.team] = Object.fromEntries(FIELDS.map(f => [f, String((a.data || {})[f] || "")]));
        ch = true; toast(`<b>${esc(team(a.team).name)}</b> selló su acusación`, team(a.team).color); SFX.bell(262, 3, 0.3);
      }
      if (ch) { save(); if (S.tab === "acusacion" && !document.querySelector(".overlay")) renderMain(); }
    }
    const rows = await SYNC.claims(S.session, S.syncAfter || 0);
    let changed = false;
    for (const row of rows || []) {
      S.syncAfter = Math.max(S.syncAfter || 0, row.id);
      const ev = byCode(row.code);
      if (ev && !S.claims[ev.code] && S.started) { claim(ev, row.team, false, true); changed = true; }
    }
    if (rows && rows.length) save();
    if (changed && S.started && !document.querySelector(".overlay")) renderMain();
    syncFail = 0;
  })().catch(() => { syncFail++; }).finally(() => { syncBusy = false; });
}
let apprSig = "";
function renderApprovals() {
  const pend = rosterCache.filter(p => p.status === "pending" && Date.now() - Date.parse(p.seen_at) < 15 * 60000);
  let box = document.getElementById("approvals");
  if (!pend.length) { if (box) box.remove(); apprSig = ""; return; }
  if (!box) {
    box = document.createElement("div"); box.id = "approvals"; document.body.appendChild(box);
    box.onclick = e => {
      const b = e.target.closest("[data-appr]"); if (!b) return;
      const ok = b.dataset.appr === "ok", pid = b.dataset.pid, p = rosterCache.find(x => x.id === pid);
      b.closest(".appr").remove();
      if (p) p.status = ok ? "ok" : "rejected";
      SYNC.setStatus(pid, ok ? "ok" : "rejected").catch(() => toast("No se pudo guardar. Intenta otra vez."));
      document.querySelectorAll(".roster").forEach(el => { el.innerHTML = rosterHtml(rosterCache); });
      apprSig = ""; renderApprovals();
    };
  }
  const sig = pend.map(p => p.id + p.team).join();
  if (sig === apprSig) return;
  apprSig = sig;
  box.innerHTML = `<div class="appr-title">Quieren unirse</div>${pend.map(p => { const t = team(p.team);
    return `<div class="appr"><span><b>${esc(p.name)}</b> → <b style="color:${t.color}">${esc(t.name)}</b></span>
      <button class="btn sm" data-appr="ok" data-pid="${esc(p.id)}">Aprobar</button><button class="btn sm ghost" data-appr="no" data-pid="${esc(p.id)}">Rechazar</button></div>`; }).join("")}`;
}
function teamBar(me) {
  if (!SYNC.on()) return "";
  if (!me) return `<div class="team-bar off">Sin equipo: escanea el código de la pantalla para unirte</div>`;
  return `<a class="team-bar" href="#/yo" style="--c:${me.color}"><span>${esc(me.name)} · ${esc(getPlayer().name)}${me.status && me.status !== "ok" ? " (en espera)" : ""}</span><b>Mi equipo →</b></a>`;
}
function claimBox(ev, result, me) {
  const pts = ev.puzzle ? C.points.puzzle : C.points.evidence;
  if (result === "ok") return `<div class="seal-box ok" style="--c:${me ? me.color : "var(--gold)"}"><div>¡Pista para ${esc(me ? me.name : "tu equipo")}!</div><b>+${pts}</b><small>Ya aparece en la pantalla. ¡Que el otro equipo no vea el eco!</small></div>`;
  if (result === "taken") return `<div class="seal-box"><div>Llegaron tarde</div><b>✕</b><small>El otro equipo ya reclamó esta pista. Sin puntos, pero lo que leíste sigue siendo cierto.</small></div>`;
  const code = `<small style="display:block;margin-top:.6rem">Sin celular conectado: escriban el código «${esc(ev.code)}» en la pantalla principal y respondan ahí.</small>`;
  const retry = me && SYNC.on() ? `<button class="btn" id="retry" style="--c:${me.color}">Sumar a ${esc(me.name)}</button>` : "";
  if (result === "pending") return `<div class="seal-box"><div>En espera</div><b>⌛</b><small>El organizador todavía no confirma tu equipo. Cuando te apruebe, toca el botón.</small>${retry}</div>`;
  if (result === "error") return `<div class="seal-box"><div>Sin conexión</div><b>!</b><small class="warn">No hubo conexión con la casa.</small>${retry}${code}</div>`;
  return `<div class="seal-box"><div>Sin equipo</div><b>?</b><small>Este celular no está unido a la partida: escanea el QR de la pantalla principal y elige equipo.</small>${retry}${code}</div>`;
}
async function renderJoin(code) {
  document.body.className = "phone";
  code = code.toUpperCase();
  const wrap = h => { $("#app").innerHTML = `<div class="phone-wrap"><div class="kicker">${esc(C.title)}</div>${h}</div>`; };
  if (!SYNC.on()) return wrap(`<p class="center">Esta casa no tiene sesiones activas. Pregúntale al presentador.</p>`);
  wrap(`<p class="center">Buscando la sesión ${esc(code)}…</p>`);
  let st = null;
  try { st = await SYNC.getState(code); } catch (e) { return wrap(`<p class="center">No hay conexión. Intenta otra vez.</p><button class="btn" onclick="location.reload()">Reintentar</button>`); }
  if (!st) return wrap(`<p class="center">La sesión <b>${esc(code)}</b> no existe o ya terminó. Escanea el código que aparece en la pantalla.</p>`);
  const me = getMe();
  wrap(`<h1 class="title sm">¿De qué equipo eres?</h1><p class="center">Sesión <b>${esc(code)}</b> · eres <b>${esc(getPlayer().name)}</b></p>
    <div class="team-pick">${st.teams.map(t => `<button class="btn big ${me && me.session === code && me.team === t.id ? "on" : ""}" data-pick="${t.id}" style="--c:${t.color}">${esc(t.name)}</button>`).join("")}</div>
    <p class="small center">Elige el mismo equipo que tus compañeros. Lo puedes cambiar después.</p>`);
  document.querySelectorAll("[data-pick]").forEach(b => b.onclick = async () => {
    const t = st.teams.find(x => x.id === b.dataset.pick), pl = getPlayer();
    document.querySelectorAll("[data-pick]").forEach(x => { x.disabled = true; });
    let status = "ok";
    if (st.started && !st.finished) {
      let prev = null; try { prev = await SYNC.player(pl.id); } catch (e) {}
      status = prev && prev.session_id === code && prev.team === t.id && prev.status === "ok" ? "ok" : "pending";
    }
    setMe({ session: code, team: t.id, name: t.name, color: t.color, date: st.date, status, seen: Date.now() });
    try { await SYNC.join(code, pl, t.id, status); } catch (e) {}
    location.hash = "#/yo";
  });
}
let meTimer = null, meSig = "";
async function renderMe() {
  document.body.className = "phone";
  clearTimeout(meTimer);
  const me = getMe();
  const wrap = h => { $("#app").innerHTML = `<div class="phone-wrap"><div class="kicker">${esc(C.title)}</div>${h}</div>`; };
  if (!me || !SYNC.on()) return wrap(`<p class="center">Todavía no tienes equipo. Escanea el código de la pantalla principal.</p>`);
  const again = () => { meTimer = setTimeout(() => { if (location.hash === "#/yo") renderMe(); }, 5000); };
  let st, rows;
  let row;
  try { [st, rows, row] = await Promise.all([SYNC.getState(me.session), SYNC.claims(me.session, 0), SYNC.player(getPlayer().id)]); }
  catch (e) { if (!meSig) wrap(`<p class="center">Sin conexión… reintentando.</p>`); return again(); }
  if (!st) { setMe(null); meSig = ""; return wrap(`<p class="center">La sesión <b>${esc(me.session)}</b> terminó. Escanea el nuevo código de la pantalla.</p>`); }
  const t = st.teams.find(x => x.id === me.team) || me;
  remoteDate = st.date || null;
  if (!row || row.session_id !== me.session) {
    row = { session_id: me.session, team: me.team, status: st.started && !st.finished ? "pending" : "ok" };
    SYNC.join(me.session, getPlayer(), me.team, row.status).catch(() => {}); me.seen = Date.now();
  } else if (!me.seen || Date.now() - me.seen > 60000) { me.seen = Date.now(); SYNC.seen(getPlayer().id).catch(() => {}); }
  setMe({ ...me, name: t.name, color: t.color, date: st.date, seen: me.seen, status: row.status });
  if (row.status !== "ok") {
    const sig0 = "st:" + row.status;
    if (sig0 !== meSig) {
      meSig = sig0;
      wrap(row.status === "pending"
        ? `<h1 class="title sm" style="color:${t.color}">${esc(t.name)}</h1><p class="center">Eres <b>${esc(getPlayer().name)}</b>.</p>
           <div class="seal-box"><div>En espera</div><b>⌛</b><small>El organizador tiene que confirmarte en la pantalla principal. Mientras tanto no puedes ver las pruebas del equipo.</small></div>
           <p class="center"><a href="#/j/${esc(me.session)}">Elegir otro equipo</a></p>`
        : `<div class="seal-box"><div>No confirmado</div><b>✕</b><small>El organizador no aprobó tu entrada a ${esc(t.name)}. Habla con él y vuelve a elegir equipo.</small></div>
           <p class="center"><a href="#/j/${esc(me.session)}">Elegir equipo</a></p>`);
    }
    return again();
  }
  const sc = st.claims || {};
  const teamCodes = [...new Set([...(rows || []).filter(r => r.team === me.team).map(r => r.code), ...Object.keys(sc).filter(k => sc[k][0] === me.team)])];
  const mine = teamCodes.map(byCode).filter(Boolean);
  const pub = Object.keys(sc).filter(k => sc[k][0] !== me.team && sc[k][1]).map(byCode).filter(Boolean);
  const sealed = (st.acc || []).includes(me.team) || accSent === me.session + me.team;
  const sig = JSON.stringify([st, mine.map(e => e.code), pub.map(e => e.code), sealed]);
  if (sig === meSig) return again();
  meSig = sig;
  meLast = { st, me: getMe(), t, mine, pub, sealed };
  if (!(meTab === "acusacion" && $("#me-acc") && !sealed && !st.revealed)) drawMe();
  again();
}
let meTab = "evidencias", meLast = null, accDraft = {}, accSent = "";
const meOpen = new Set();
const ME_TABS = [["caso", "Caso"], ["sospechosos", "Sospechosos"], ["evidencias", "Evidencias"], ["linea", "Línea"], ["acusacion", "Acusación"]];
function meView({ st, me, t, mine, pub, sealed }) {
  const other = st.teams.find(x => x.id !== me.team) || t;
  const item = (k, title, small, body) => `<details class="me-ev" data-k="${esc(k)}"><summary><span>${esc(title)}</span><small>${esc(small)}</small></summary>${body}</details>`;
  const autos = [];
  C.phases.forEach((p, i) => { if (i <= st.phase || st.finished) p.evidence.forEach(id => autos.push({ id, ...C.autoEvidence[id] })); });
  if (meTab === "caso") {
    const f = C.autoEvidence.forense;
    return `<h2>La víctima</h2><p>${esc(C.victim)}. Viuda, coleccionista de arte, dueña de esta casa. Murió la noche del ${fillDates("{d:0}")} de ${C.year}, durante el Baile de Ánimas.</p>
      <h2>Lo que deben descubrir</h2><ol class="goals"><li><b>Quién</b> la mató</li><li><b>Cómo</b> lo hizo</li><li><b>Por qué</b></li><li>Bonus: el <b>cómplice</b> y el <b>origen del veneno</b></li></ol>
      ${item("forense", f.title, "Oficial", docHtml(f))}`;
  }
  if (meTab === "sospechosos") return C.suspects.map(s => `<details class="me-ev me-sus" data-k="s-${esc(s.id)}" style="--c:${s.color}"><summary><span>${esc(s.name)}</span><small>${esc(s.role)}</small></summary>
    <p class="small">${s.age} años. ${esc(s.bio)}</p><blockquote>«${esc(s.statement)}»</blockquote>
    ${st.phase >= 1 || st.finished ? `<blockquote class="later">«${esc(s.later)}»</blockquote>` : `<div class="sealed-note">Más declaraciones tras el apagón…</div>`}</details>`).join("");
  if (meTab === "evidencias") {
    const rev = [...autos.filter(a => a.id !== "forense").map(a => item(a.id, a.title, "Oficial", docHtml(a))), ...pub.map(e => item(e.code, e.title, other.name, docHtml(e)))];
    return `<h2>De ${esc(t.name)} (${mine.length})</h2>${mine.length ? mine.map(e => item(e.code, e.title, e.room, docHtml(e))).join("") : `<p class="center small">Todavía nada. Busquen el sello EM.</p>`}
      <h2>Reveladas</h2>${rev.join("") || `<p class="center small">La casa revela las evidencias al cambiar de fase.</p>`}`;
  }
  if (meTab === "linea") {
    const items = [], add = (e, color) => (e.timeline || []).forEach(([h, txt]) => items.push({ h, txt, src: e.title, color }));
    autos.forEach(a => add(a, "#cfc3a3")); mine.forEach(e => add(e, t.color)); pub.forEach(e => add(e, other.color));
    items.sort((a, b) => tkey(a.h) - tkey(b.h));
    return `<section class="timeline me-time"><h2>La noche del ${fillDates("{d:0}")} de ${C.year}</h2>
      ${items.length ? `<ol>${items.map(i => `<li style="--c:${i.color}"><time>${i.h}</time><div><p>${esc(i.txt)}</p><small>${esc(i.src)}</small></div></li>`).join("")}</ol>` : `<p class="center small">Aún no hay hechos.</p>`}
      <p class="small center">Hechos de las evidencias oficiales, las de tu equipo y las reveladas.</p></section>`;
  }
  if (st.revealed) return `<div class="seal-box"><div>La verdad fue revelada</div><b>✦</b><small>Miren la pantalla principal.</small></div>`;
  if (sealed) return `<div class="seal-box ok" style="--c:${t.color}"><div>Acusación sellada</div><b>✓</b><small>${(st.acc || []).length >= st.teams.length ? "Los dos equipos ya votaron. Miren la pantalla principal." : "Esperando el veredicto del otro equipo. La pantalla lo mostrará cuando los dos hayan votado."}</small></div>`;
  if (!st.started) return `<p class="center">La acusación se abre cuando empiece la partida.</p>`;
  return `<p class="small center">${st.finished ? "La medianoche llegó. Acusen." : "Pueden acusar cuando quieran, pero hay un solo intento por equipo."} Cualquiera del equipo puede sellarla: pónganse de acuerdo antes.</p>
    <form id="me-acc" class="me-acc">${FIELDS.map(f => `<label>${esc(C.accusation[f].label)}<select name="${f}" required><option value="">—</option>${optionsFor(f).map(([id, n]) => `<option value="${id}" ${accDraft[f] === id ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>`).join("")}
    <button class="btn" style="--c:${t.color}">Sellar acusación de ${esc(t.name)}</button></form>`;
}
function drawMe() {
  const L = meLast, { st, me, t } = L, y = window.scrollY;
  $("#app").innerHTML = `<div class="phone-wrap"><div class="kicker">${esc(C.title)}</div>
    <h1 class="title sm" style="color:${t.color}">${esc(t.name)}</h1>
    <p class="center small">Eres <b>${esc(getPlayer().name)}</b></p>
    <div class="me-scores">${st.teams.map(x => `<div class="score" style="--c:${x.color}"><span>${esc(x.name)}</span><b>${x.score}</b></div>`).join("")}</div>
    <p class="center small">${esc(st.finished ? "La partida terminó" : st.started ? st.phaseName : "La partida aún no empieza")} · sesión ${esc(me.session)}</p>
    <nav class="me-tabs">${ME_TABS.map(([id, n]) => `<button data-mtab="${id}" class="${meTab === id ? "on" : ""}">${n}</button>`).join("")}</nav>
    <div class="me-view">${meView(L)}</div>
    <p class="center small"><a href="#/j/${esc(me.session)}">Cambiar de equipo</a></p></div>`;
  document.querySelectorAll("[data-mtab]").forEach(b => b.onclick = () => { meTab = b.dataset.mtab; drawMe(); });
  document.querySelectorAll(".me-view details[data-k]").forEach(d => { if (meOpen.has(d.dataset.k)) d.open = true; d.ontoggle = () => { d.open ? meOpen.add(d.dataset.k) : meOpen.delete(d.dataset.k); }; });
  const f = $("#me-acc");
  if (f) {
    f.onchange = () => { accDraft = Object.fromEntries(new FormData(f)); };
    f.onsubmit = async e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(f));
      if (!confirm(`¿Sellar la acusación de ${t.name}? No se podrá cambiar.`)) return;
      f.querySelector("button").disabled = true;
      const r = await SYNC.accuse(me.session, me.team, d, getPlayer().name).catch(() => "error");
      if (r === "error") { f.querySelector("button").disabled = false; toast("Sin conexión. Intenta otra vez."); return; }
      accSent = me.session + me.team; meSig = ""; L.sealed = true; drawMe();
    };
  }
  window.scrollTo(0, y);
}

// ---------- impresión ----------
function renderPrint() {
  document.body.className = "print";
  $("#app").innerHTML = `<div class="print-bar no-print">
      <a href="#/">← Volver</a>
      <label>URL pública del juego (para los QR): <input id="base" value="${esc(baseUrl())}"></label>
      <button class="btn" onclick="window.print()">Imprimir</button>
      <p class="small">Imprime en papel normal y recorta. Cada tarjeta va en su escondite. La guía del presentador tiene la lista de dónde va cada una.</p>
    </div>
    <div class="cards">${C.evidence.map(e => `
      <div class="pcard">
        <div class="pc-top"><span>EVIDENCIA</span><b>${e.code}</b></div>
        <div class="pc-body">
          <div class="pc-qr">${qrSvg(evidenceUrl(e.code))}</div>
          <div class="pc-txt"><div class="pc-kind">${esc(e.kind)}</div><div class="pc-title">${esc(e.title)}</div>
          <div class="pc-q"><i>${esc(e.q.type)}:</i> ${esc(e.q.text).replace(/\n/g, "<br>")}</div></div>
        </div>
        <div class="pc-foot">Escanea el QR y responde · o escribe <b>${e.code}</b> en la pantalla principal</div>
      </div>`).join("")}</div>
    ${S.teams.map(t => `<div class="pcard sheet">
      <h2>Hoja del detective · ${esc(t.name)}</h2>
      <table class="dt"><tr><th>Sospechoso</th><th>Motivo</th><th>Medios</th><th>Oportunidad / coartada</th></tr>
      ${C.suspects.map(s => `<tr><td>${esc(s.name)}</td><td></td><td></td><td></td></tr>`).join("")}</table>
      <p>Notas:</p><div class="lines"></div>
    </div>`).join("")}
    <div class="pcard sheet">
      <h2>Sellos de Elvira (pegar por fuera de los 4 escondites de inicio)</h2>
      <div class="seals">${C.evidence.filter(e => e.start).map(e => `<div class="wax"><span>EM</span></div>`).join("")}</div>
      <p class="small">Pégalos en los 4 escondites marcados «SELLO» en la guía (#/guia o el checklist del PDF).</p>
    </div>
    <div class="pcard sheet landscape">
      <h2 class="no-print">Nota escrita al revés (prop físico para el baño)</h2>
      <p class="hand mirror big-hand">T.: Ella encontró el libro de cuentas. Si mañana habla con el inspector, caemos los dos. Yo me encargo esta noche. No vuelvas. — C.</p>
    </div>`;
  $("#base").onchange = e => { localStorage.setItem("montenegro-base", e.target.value.trim()); renderPrint(); };
}

// ---------- guía ----------
function renderGuide() {
  document.body.className = "guide";
  const sp = spots();
  const solLabel = f => (optionsFor(f).find(o => o[0] === C.solution[f]) || [])[1];
  $("#app").innerHTML = `<div class="guide-wrap">
    <a href="#/" class="no-print">← Volver al juego</a>
    <h1 class="title sm">Guía del presentador</h1>
    <p class="warn-box">Contiene la solución. Solo para el presentador.</p>

    <h2>1. Preparación (30–45 min antes)</h2>
    <ul>
      <li>Abre esta web en la laptop/TV conectada a parlantes. Pon pantalla completa.</li>
      <li>Imprime las tarjetas desde <a href="#/imprimir">Imprimir pistas</a> y recórtalas. Si la web está publicada, los QR funcionan desde cualquier celular.</li>
      <li>Esconde cada tarjeta según la tabla de abajo (puedes cambiar el escondite: lo que escribas aquí se guarda y lo usan las «visiones»).</li>
      <li><b>Props recomendados:</b> tablero de ajedrez (tarjeta bajo el rey), velas (una roja: gotea cera roja cerca de la tarjeta del baño), un frasquito vacío con etiqueta «DIGITALINA» envuelto en un pañuelo con «T.V.» escrito, un espejo en el baño, una cajita (opcional con candado de 4 dígitos 7130) para la tarjeta de la caja fuerte, plantas y cuadros.</li>
      <li>Atmósfera: luces bajas, velas LED, telarañas, música ambiente (la app ya trae viento y latidos).</li>
    </ul>

    <h2>2. Reglas para leer en voz alta</h2>
    <ul>
      <li>Dos equipos. El fantasma de Elvira narra; tú eres el inspector Ríos y árbitro.</li>
      <li>Busquen tarjetas en sala, cocina, baño, cuarto y patio. Escaneen el QR, respondan la pregunta y lean la pista en secreto. Cada equipo puede reclamar solo 2 de los 4 sellos EM (la app bloquea el tercero) y sigue los ecos de esas 2 cadenas. Con el celular unido a la sesión, los puntos llegan solos; sin celular, escriben el código de la tarjeta en la TV.</li>
      <li>Puntos: pista +${C.points.evidence}, acertijo-candado +${C.points.puzzle}, acertijo relámpago +${C.points.riddle}, visión ${C.points.vision}. Acusación: culpable +${C.points.culprit}, método +${C.points.method}, motivo +${C.points.motive}, cómplice +${C.points.accomplice}, veneno +${C.points.source}.</li>
      <li>No se vale romper, abrir cajones con llave ni mover muebles pesados.</li>
    </ul>

    <h2>3. Desarrollo</h2>
    <ol>
      <li><b>Prólogo</b> (al pulsar «Abrir la casa»): el fantasma se presenta. Muestra el informe del forense y los sospechosos.</li>
      <li><b>Fase I</b> (primer tercio): búsqueda libre. Usa los acertijos relámpago si alguien se aburre.</li>
      <li><b>Fase II · El apagón</b> (automático al pasar ⅓ del tiempo): apaga las luces de verdad si puedes. Llega el informe del laboratorio (el veneno estaba en la taza). Nuevas declaraciones de los sospechosos.</li>
      <li><b>Fase III · Medianoche</b> (a ⅔): presiona a los jugadores; recuérdales los acertijos-candado (ajedrez, caja fuerte, diario).</li>
      <li><b>Acusación</b>: al llegar a cero, cada equipo sella su acusación en la pestaña Acusación. Luego «Revelar la verdad».</li>
    </ol>
    <p>Puedes interpretar a los sospechosos si te preguntan: usa sus declaraciones. Solo Camila (sobre dónde estuvo) y Teo (sobre los cuadros) mienten.</p>

    <h2>4. Escondites, preguntas y respuestas</h2>
    <table class="gt"><tr><th>Código</th><th>Pista</th><th>Lugar</th><th>Escondite (editable)</th><th>Respuesta</th><th>Cadena</th></tr>
    ${C.evidence.map(e => `<tr><td><b>${e.code}</b></td><td>${esc(e.title)}${e.puzzle ? " <i>(acertijo-candado)</i>" : ""}</td><td>${esc(e.room)}</td>
      <td><input class="spot" data-spot="${e.code}" value="${esc(sp[e.code] || e.spot)}"><input class="spot hint" data-spot="${e.code}:hint" value="${esc(sp[e.code + ":hint"] || e.hint)}" title="Texto de la visión"></td>
      <td>${esc(e.q.answers[0])}</td><td>${e.start ? "<b>INICIO · pegar sello</b><br>" : ""}${e.next ? `→ ${e.next}` : "fin"}</td></tr>`).join("")}</table>
    <p class="small">La segunda línea de cada escondite es la «visión» que lee el fantasma cuando un equipo pide ayuda: actualízala si cambias el escondite.</p>

    <h2>5. Solución</h2>
    <ul>${FIELDS.map(f => `<li><b>${esc(C.accusation[f].label)}</b> ${esc(solLabel(f))}</li>`).join("")}</ul>
    <h3>Razonamiento</h3>
    <ol>
      <li>Laboratorio: el veneno estaba solo en la <b>taza</b>, no en la tetera ni el vino → lo puso quien sirvió el té en el estudio hacia las 23:30.</li>
      <li>Teo se fue a las 22:47 (taxi) y nadie volvió a entrar por el portón (foto del patio) → no pudo.</li>
      <li>Julián estaba en el patio a las 23:35 (foto) → no pudo.</li>
      <li>La doctora tocó el piano toda la hora sin pausa (programa) → no pudo.</li>
      <li>Bruno tomó el tranvía a las 23:12 y su nota dice que <b>Camila</b> subiría el té → no pudo, y Camila mintió sobre su migraña.</li>
      <li>Cera roja (solo en el cuarto de Camila) en la escalera de servicio, el estudio y la cisterna → Camila.</li>
      <li>Guardarropa: Camila tenía la única llave, el maletín de la doctora y el pañuelo de Teo → origen del veneno y el intento de culpar a Teo.</li>
      <li>Libro de cuentas («C.R.»), nota de Teo, nota al revés («yo me encargo esta noche») y diario → motivo: ocultar el fraude de los cuadros; Teo, cómplice.</li>
    </ol>
    <h3>Pistas falsas</h3>
    <p>Julián (herencia y deudas), Bruno (despido), la doctora (clínica revocada, el veneno era suyo) y Teo (discusión, pañuelo) tienen motivos, pero todos tienen coartada.</p>
  </div>`;
  document.querySelectorAll(".spot").forEach(i => i.onchange = () => { const s = spots(); s[i.dataset.spot] = i.value; localStorage.setItem(SPOTS_KEY, JSON.stringify(s)); });
}

// ---------- arranque ----------
window.addEventListener("hashchange", render);
window.addEventListener("pageshow", e => { if (e.persisted) render(); });
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  const route = location.hash.replace(/^#\/?/, "");
  if (route !== lastRoute || !$("#app").children.length) render();
});
document.addEventListener("keydown", e => {
  if (document.body.className !== "main" || e.target.matches("input,select,textarea")) return;
  if (e.key === "p" || e.key === "P") { $("#gear") && $("#gear").click(); }
});
document.addEventListener("pointerdown", () => { if (S.started && S.music && document.body.className === "main") SFX.startAmbient(); }, { once: true });
window.__mg = { get S() { return S; }, recorded, story, renderMain };
render();
requestAnimationFrame(tickLoop);
})();
