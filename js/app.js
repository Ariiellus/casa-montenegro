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
const recorded = text => !S.voiceName && window.VOZ && window.VOZ[text];
function speak(text, onend) {
  hush();
  if (!S.tts) { onend && setTimeout(onend, 0); return false; }
  const src = recorded(text);
  if (src) {
    const a = clip = new Audio(src);
    let ended = false; const end = () => { if (ended || clip !== a) return; ended = true; onend && onend(); };
    a.onended = end; a.onerror = end;
    a.play().catch(end);
    return true;
  }
  if (!("speechSynthesis" in window)) { onend && setTimeout(onend, 0); return false; }
  const u = new SpeechSynthesisUtterance(text);
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
  return `<div class="doc ${ev.mirror ? "has-mirror" : ""}"><div class="doc-kind">${esc(ev.kind)}</div>${ev.html}</div>`;
}
function qrSvg(text, cell = 4) {
  const q = qrcode(0, "M"); q.addData(text); q.make();
  return q.createSvgTag({ cellSize: cell, margin: 2, scalable: true });
}
const baseUrl = () => (localStorage.getItem("montenegro-base") || (location.origin + location.pathname)).replace(/#.*$/, "");
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
    const p = document.createElement("p"); p.textContent = lines[i]; box.appendChild(p);
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

function render() {
  const route = location.hash.replace(/^#\/?/, "");
  document.body.className = "";
  if (route.startsWith("e/")) return renderPhone(route.slice(2));
  if (route === "imprimir") return renderPrint();
  if (route === "guia") return renderGuide();
  if (!S.started) return renderStart();
  renderMain();
}

function renderStart() {
  document.body.className = "start";
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
    <button class="btn big" id="begin">Abrir la casa</button>
    <div class="start-links"><a href="#/guia">Guía del presentador</a> · <a href="#/imprimir">Imprimir pistas</a></div>
  </div>`;
  $("#begin").onclick = () => {
    document.querySelectorAll("[data-team]").forEach(i => { team(i.dataset.team).name = i.value.trim() || team(i.dataset.team).name; });
    S.duration = +$("#dur").value * 60;
    SFX.ensure(); if (S.music) SFX.startAmbient();
    try { document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); } catch (e) {}
    S.started = true; S.paused = true; S.startAt = Date.now(); S.pausedAt = S.startAt; S.phase = 0; save();
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
      <button class="gear" id="gear" title="Panel del presentador">⚙</button></div>
  </header>
  <nav class="tabs">${TABS.map(([id, n]) => `<button data-tab="${id}" class="${S.tab === id ? "on" : ""}">${n}</button>`).join("")}</nav>`;
}

function renderMain() {
  document.body.className = "main";
  $("#app").innerHTML = header() + `<main id="view"></main>`;
  document.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { S.tab = b.dataset.tab; save(); renderMain(); });
  $("#gear").onclick = hostPanel;
  const v = $("#view");
  ({ caso: viewCase, sospechosos: viewSuspects, evidencias: viewEvidence, linea: viewTimeline, fantasma: viewGhost, acusacion: viewAccuse })[S.tab](v);
}

function viewCase(v) {
  const f = C.autoEvidence.forense;
  v.innerHTML = `<section class="case">
    <div class="case-left">
      <h2>La víctima</h2>
      <div class="victim"><div class="portrait big" style="--c:#9b8b6a">EM</div>
      <div><h3>${esc(C.victim)}</h3><p>Viuda, coleccionista de arte, dueña de esta casa. Murió la noche del 24 de octubre de ${C.year}, durante el Baile de Ánimas.</p></div></div>
      <h2>Lo que deben descubrir</h2>
      <ol class="goals"><li><b>Quién</b> la mató</li><li><b>Cómo</b> lo hizo</li><li><b>Por qué</b></li><li>Bonus: el <b>cómplice</b> y el <b>origen del veneno</b></li></ol>
      <h2>Cómo se juega</h2>
      <ul class="rules">
        <li>Busquen las tarjetas de evidencia escondidas en la sala, la cocina, el baño y el patio.</li>
        <li>Escaneen el QR con el celular, respondan la pregunta y lean la pista <b>en secreto</b>.</li>
        <li>Escriban aquí el <b>sello</b> que les da el celular para ganar puntos.</li>
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
      <input id="claim-input" placeholder="Sello o código de la tarjeta" autocomplete="off" autocapitalize="characters">
      <div class="claim-teams">${S.teams.map((t, i) => `<button type="submit" class="btn team-btn" data-team="${t.id}" style="--c:${t.color}">${esc(t.name)}</button>`).join("")}</div>
    </form>
    <div class="ev-count">${claimed.length} de ${C.evidence.length} pistas encontradas</div>
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

function claim(ev, teamId, isPublic) {
  if (S.claims[ev.code]) {
    const t = team(S.claims[ev.code].team);
    toast(`«${esc(ev.title)}» ya fue reclamada por <b>${esc(t.name)}</b>`, t.color); SFX.wrong(); return false;
  }
  S.claims[ev.code] = { team: teamId, at: Date.now(), public: !!isPublic };
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
      let n = 15; const msg = $("#qa-msg", m.el); input.disabled = true;
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
  v.innerHTML = `<section class="timeline"><h2>La noche del 24 de octubre de ${C.year}</h2>
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
  v.innerHTML = `<section class="accuse">
    <h2>${S.finished ? "La medianoche ha llegado. Acusen." : "Acusación final"}</h2>
    <p class="small center">Cada equipo sella su acusación en secreto. Solo hay un intento.</p>
    <div class="acc-cols">${S.teams.map(t => {
      const a = S.accusations[t.id];
      return `<div class="acc" style="--c:${t.color}"><h3>${esc(t.name)}</h3>${a ? `<div class="sealed">Acusación sellada</div>` : `
        <form data-acc="${t.id}">${FIELDS.map(f => `<label>${esc(C.accusation[f].label)}<select name="${f}" required><option value="">—</option>${optionsFor(f).map(([id, n]) => `<option value="${id}">${esc(n)}</option>`).join("")}</select></label>`).join("")}
        <button class="btn" style="--c:${t.color}">Sellar acusación</button></form>`}</div>`; }).join("")}</div>
    <div class="center"><button class="btn big" id="reveal" ${Object.keys(S.accusations).length ? "" : "disabled"}>Revelar la verdad</button></div>
  </section>`;
  v.querySelectorAll("[data-acc]").forEach(f => f.onsubmit = e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(f));
    if (!confirm(`¿Sellar la acusación de ${team(f.dataset.acc).name}? No se podrá cambiar.`)) return;
    S.accusations[f.dataset.acc] = d; save(); SFX.bell(262, 3, 0.3); renderMain();
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
  $("#o-vtest", m.el).onclick = () => { const t = S.tts; S.tts = true; speak("Soy Elvira Montenegro. Esta noche, veinticuatro de octubre, me ayudarán a descansar."); S.tts = t; };
  $("#o-tts", m.el).onchange = e => { S.tts = e.target.checked; if (!S.tts) hush(); save(); };
  $("#o-music", m.el).onchange = e => { S.music = e.target.checked; S.music ? SFX.startAmbient() : (SFX.stopAmbient(), SFX.heartbeat(false), heartState = 0); save(); };
  $("#o-rev", m.el).onchange = e => { S.revealOnPhase = e.target.checked; save(); };
  $("#h-reset", m.el).onclick = () => { if (confirm("¿Borrar todo el progreso y volver al inicio?")) { const keep = { tts: S.tts, music: S.music, duration: S.duration, teams: S.teams, voiceName: S.voiceName }; S = Object.assign(fresh(), keep); save(); hush(); SFX.heartbeat(false); SFX.stopAmbient(); m.close(); render(); } };
}

// ---------- celular ----------
function phoneState() { try { return JSON.parse(localStorage.getItem(PHONE_KEY)) || {}; } catch (e) { return {}; } }
function renderPhone(code) {
  document.body.className = "phone";
  const ev = byCode(code);
  if (!ev) { $("#app").innerHTML = `<div class="phone-wrap"><h1 class="title sm">${esc(C.title)}</h1><p class="center">Esta pista no existe… o el fantasma la escondió mejor.</p></div>`; return; }
  const ps = phoneState();
  const solved = ps[ev.code];
  $("#app").innerHTML = `<div class="phone-wrap">
    <div class="kicker">${esc(C.title)}</div>
    <div class="q-type">Evidencia ${ev.code} · ${esc(ev.room)}</div>
    <h1 class="title sm">${esc(ev.title)}</h1>
    ${solved ? `${docHtml(ev)}<div class="seal-box"><div>Sello para reclamar puntos</div><b>${esc(ev.seal)}</b><small>Escríbelo en la pantalla principal y elige tu equipo. ¡Que el otro equipo no lo vea!</small></div>` : `
      <div class="q-type">${esc(ev.q.type)}</div>
      <p class="q-text">${esc(ev.q.text).replace(/\n/g, "<br>")}</p>
      <form id="pq"><input id="pq-in" placeholder="Tu respuesta" autocomplete="off"><button class="btn">Responder</button></form>
      <div class="q-msg" id="pq-msg"></div>`}
  </div>`;
  if (solved) return;
  $("#pq").onsubmit = e => {
    e.preventDefault();
    const inp = $("#pq-in");
    if (checkAnswer(ev, inp.value)) {
      ps[ev.code] = true; localStorage.setItem(PHONE_KEY, JSON.stringify(ps));
      try { SFX.found(); } catch (e2) {}
      if (navigator.vibrate) navigator.vibrate([60, 40, 120]);
      renderPhone(code); window.scrollTo(0, 0);
    } else {
      try { SFX.wrong(); } catch (e2) {}
      if (navigator.vibrate) navigator.vibrate(300);
      let n = 10; inp.disabled = true; const msg = $("#pq-msg");
      const iv = setInterval(() => { msg.textContent = `Incorrecto. Espera ${n--}s para intentar otra vez.`; if (n < 0) { clearInterval(iv); msg.textContent = ""; inp.disabled = false; inp.select(); } }, 1000);
    }
  };
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
    <div class="pcard sheet">
      <h2>Hoja del detective</h2>
      <table class="dt"><tr><th>Sospechoso</th><th>Motivo</th><th>Medios</th><th>Oportunidad / coartada</th></tr>
      ${C.suspects.map(s => `<tr><td>${esc(s.name)}</td><td></td><td></td><td></td></tr>`).join("")}</table>
      <p>Notas:</p><div class="lines"></div>
    </div>
    <div class="pcard sheet">
      <h2>Nota escrita al revés (prop físico para el baño)</h2>
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
      <li><b>Props recomendados:</b> tablero de ajedrez (tarjetas bajo el rey y un peón), velas (una roja: gotea cera roja sobre la tapa del inodoro y cerca de la tarjeta del baño), un frasquito vacío con etiqueta «DIGITALINA» envuelto en un pañuelo con «T.V.» escrito, un espejo en el baño, una cajita (opcional con candado de 4 dígitos 7130) para la tarjeta de la caja fuerte, plantas y cuadros.</li>
      <li>Atmósfera: luces bajas, velas LED, telarañas, música ambiente (la app ya trae viento y latidos).</li>
    </ul>

    <h2>2. Reglas para leer en voz alta</h2>
    <ul>
      <li>Dos equipos. El fantasma de Elvira narra; tú eres el inspector Ríos y árbitro.</li>
      <li>Busquen tarjetas en sala, cocina, baño y patio. Escaneen el QR, respondan la pregunta y lean la pista en secreto. Escriban el <b>sello</b> en la pantalla para sumar puntos.</li>
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
    <table class="gt"><tr><th>Código</th><th>Pista</th><th>Lugar</th><th>Escondite (editable)</th><th>Respuesta</th><th>Sello</th></tr>
    ${C.evidence.map(e => `<tr><td><b>${e.code}</b></td><td>${esc(e.title)}${e.puzzle ? " <i>(acertijo-candado)</i>" : ""}</td><td>${esc(e.room)}</td>
      <td><input class="spot" data-spot="${e.code}" value="${esc(sp[e.code] || e.spot)}"><input class="spot hint" data-spot="${e.code}:hint" value="${esc(sp[e.code + ":hint"] || e.hint)}" title="Texto de la visión"></td>
      <td>${esc(e.q.answers[0])}</td><td>${esc(e.seal)}</td></tr>`).join("")}</table>
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
document.addEventListener("keydown", e => {
  if (document.body.className !== "main" || e.target.matches("input,select,textarea")) return;
  if (e.key === "p" || e.key === "P") { $("#gear") && $("#gear").click(); }
});
document.addEventListener("pointerdown", () => { if (S.started && S.music && document.body.className === "main") SFX.startAmbient(); }, { once: true });
render();
requestAnimationFrame(tickLoop);
})();
