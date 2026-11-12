(() => {
  "use strict";

  const CASES = window.CASES;
  const STORE_KEY = "casusbouwer-v12";
  const AXES = [
    { id: "v", label: "Veiligheid", hint: "telt 1,5 keer", w: 1.5 },
    { id: "s", label: "Eenvoud", hint: "makkelijk werken, weinig opletten" },
  ];
  const nl = (n) => String(n).replace(".", ","); // 11.6 → 11,6
  const band = (n) => (n >= 4 ? 2 : n >= 3 ? 1 : 0);
  const BAND_CLASS = ["band-low", "band-mid", "band-high"];

  // ── State ────────────────────────────────────────────────────────────
  const fresh = () => ({ sel: {}, log: [] });
  const state = load() || { caseIdx: 0, view: "case", cases: {} };
  if (state.view !== "board") state.view = "case";
  CASES.forEach((c) => (state.cases[c.id] = state.cases[c.id] || fresh()));
  const facilitator = false; // versie voor deelnemers: geen facilitatormodus

  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)); } catch { return null; }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* opslag niet beschikbaar */ }
  }

  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const isPhone = () => window.matchMedia("(max-width: 980px)").matches;
  const cur = () => CASES[state.caseIdx];
  const cs = () => state.cases[cur().id];
  const block = (c, id) => c.blocks.find((b) => b.id === id);
  const slotOf = (c, id) => c.slots.find((s) => s.id === id);
  // Een sidequest-vak (optional) mag leeg blijven en telt niet mee in de scores, alleen in de bevindingen.
  const required = (c) => c.slots.filter((sl) => !sl.optional);
  const missingSlots = (c, data) => required(c).filter((sl) => !data.sel[sl.id]);
  const caseById = (id) => CASES.find((c) => c.id === id);
  const labelOf = (id) => caseById(id)?.label || id;
  const canEval = (c) => facilitator || c.selfEval;
  const hasEval = (data) => data.log.some((e) => e.t === "eval");

  function place(blockId) {
    const c = cur(), b = block(c, blockId);
    if (!b) return;
    cs().sel[b.slot] = blockId;
    if (cs().carried) delete cs().carried[b.slot];
    save(); render();
  }

  // Lege vakken vullen met de keuze uit een eerdere ronde, als dat blok hier ook bestaat.
  function applyCarry(c, data) {
    let changed = false;
    c.slots.filter((sl) => sl.carry && !data.sel[sl.id]).forEach((sl) => {
      for (const [from, slot] of sl.carry) {
        const id = state.cases[from]?.sel[slot];
        if (id && c.blocks.some((b) => b.id === id && b.slot === sl.id)) {
          data.sel[sl.id] = id;
          (data.carried ||= {})[sl.id] = from;
          changed = true;
          break;
        }
      }
    });
    if (changed) save();
  }

  // ── Beoordeling (deterministisch) ────────────────────────────────────
  // Veiligheid = min(gemiddelde, zwakste schakel + 1) + aanpassingen, daarna begrensd door risico's.
  // Eenvoud = gemiddelde + aanpassingen. Alles begrensd op 1–5.
  function evaluate(c, data) {
    const s = {};
    c.slots.forEach((sl) => (s[sl.id] = data.sel[sl.id] || null));
    if (c.derive) Object.assign(s, c.derive(s));

    const findings = c.rules.flatMap((r) => [].concat(r(s) || [])).filter(Boolean);

    const chosen = c.slots.filter((sl) => !sl.optional && s[sl.id]).map((sl) => ({ sl, b: block(c, s[sl.id]) }));
    const ignore = new Set(findings.flatMap((f) => f.ignoreMin || []));
    const avg = (k) => chosen.reduce((a, { b }) => a + b[k], 0) / chosen.length;
    const adj = (k) => findings.reduce((a, f) => a + ((f.adj && f.adj[k]) || 0), 0);
    const clamp = (n) => Math.max(1, Math.min(5, n));
    const round = (n) => Math.round(n * 10) / 10;

    const forMin = chosen.filter(({ sl }) => !ignore.has(sl.id));
    const weakest = forMin.reduce((w, it) => (!w || it.b.v < w.b.v ? it : w), null);
    const avgV = avg("v");
    const afterWeak = weakest ? Math.min(avgV, weakest.b.v + 1) : avgV;
    const caps = findings.filter((f) => f.cap && f.cap.v != null).map((f) => f.cap.v);
    const capV = caps.length ? Math.min(...caps) : null;
    let v = afterWeak + adj("v");
    if (capV != null) v = Math.min(v, capV);

    const scores = {
      v: round(clamp(v)),
      s: round(clamp(avg("s") + adj("s"))),
    };
    return {
      scores,
      total: round(AXES.reduce((a, x) => a + (x.w || 1) * scores[x.id], 0)),
      findings: findings.map(({ type, text }) => ({ type, text })),
      calc: {
        rows: chosen.map(({ sl, b }) => ({ slot: sl.label, title: b.title, v: b.v, s: b.s, ignored: ignore.has(sl.id) })),
        avg: { v: round(avgV), s: round(avg("s")) },
        adj: { v: round(adj("v")), s: round(adj("s")) },
        weakest: weakest ? { title: weakest.b.title, v: weakest.b.v } : null,
        afterWeak: round(afterWeak),
        capV,
      },
    };
  }

  // ── Casus (links) ────────────────────────────────────────────────────
  function pushEval() {
    const c = cur(), data = cs();
    const round = data.log.filter((e) => e.t === "eval").length + 1;
    data.log.push({ t: "eval", round, snap: evaluate(c, data) });
  }

  const list = (items, cls = "") => `<ul class="info-list ${cls}">${items.map((g) => `<li>${g}</li>`).join("")}</ul>`;
  const box = (title, body, cls = "", ico = "") =>
    `<section class="info ${cls}"><h3 class="info-head">${ico ? mini(ico) : ""}<span>${title}</span></h3>${body}</section>`;

  // Kleine schetsjes bij de tekst links (zelfde bibberstijl als de tekeningen op het bord).
  const MINI = {
    v: `<path class="fill-soft" d="M20 4 l13 5 v10 q0 11 -13 17 q-13 -6 -13 -17 v-10 z"/><path class="accent" d="M14 20 l4 4 l8 -9"/>`,
    e: `<path class="fill-soft" d="M23 3 l-13 20 h9 l-3 14 l14 -21 h-9 z"/>`,
    s: `<path class="fill-soft" d="M7 13 h8 q-1 -7 5 -7 q6 0 5 7 h8 v8 q-6 -1 -6 4 q0 5 6 4 v6 h-26 z"/>`,
    k: `<circle class="fill-soft" cx="20" cy="20" r="15"/><circle cx="20" cy="20" r="10"/><path d="M23.5 15 q-6 -2.5 -7.5 5 q1.5 7.5 7.5 5 M14 18.5 h7 M14 21.5 h7"/>`,
    book: `<path class="fill-soft" d="M5 10 q8 -4 15 2 v22 q-7 -5 -15 -2 z"/><path class="fill-soft" d="M35 10 q-8 -4 -15 2 v22 q7 -5 15 -2 z"/>`,
    target: `<circle class="fill-soft" cx="18" cy="22" r="14"/><circle cx="18" cy="22" r="8"/><circle cx="18" cy="22" r="2"/><path class="accent" d="M19 21 l15 -15 M28 5 l6 1 l1 6"/>`,
    bulb: `<path class="fill-soft" d="M20 4 q11 0 11 11 q0 6 -5 10 v4 h-12 v-4 q-5 -4 -5 -10 q0 -11 11 -11 z"/><path d="M15 33 h10 M17 37 h6 M20 29 v-8 l-3 -3 M20 21 l3 -3"/>`,
    check: `<circle class="fill-soft" cx="20" cy="20" r="15"/><path class="accent" d="M13 20 l5 5 l9 -10"/>`,
    trophy: `<path class="fill-soft" d="M12 6 h16 v9 q0 9 -8 9 q-8 0 -8 -9 z"/><path d="M12 9 h-5 q0 8 6 9 M28 9 h5 q0 8 -6 9 M20 24 v6"/><path class="fill-soft" d="M13 35 h14 l-2 -5 h-10 z"/>`,
    risk: `<path class="fill-soft" d="M20 5 l16 29 h-32 z"/><path d="M20 15 v9 M20 29 v.1"/>`,
    insight: `<path class="fill-soft" d="M20 4 q11 0 11 11 q0 6 -5 10 v4 h-12 v-4 q-5 -4 -5 -10 q0 -11 11 -11 z"/><path d="M15 33 h10 M17 37 h6"/>`,
    good: `<circle class="fill-soft" cx="20" cy="20" r="15"/><path d="M13 20 l5 5 l9 -10"/>`,
  };
  const mini = (n) => MINI[n] ? `<svg class="doodle mini mini-${n}" viewBox="0 0 40 40" aria-hidden="true">${MINI[n]}</svg>` : "";
  const ROUND_ICON = { r1: "gitlab", r2: "laptop", eind: "data" };

  // Altijd hetzelfde: hoe je een opstelling bouwt en hoe hij scoort.
  function howBox() {
    const where = isPhone() ? "Kies onder <b>Opstelling</b>" : "Kies rechts";
    const tiles = AXES.map((a) => `<div class="ax-tile ax-${a.id}">${mini(a.id)}<span><b>${a.label}</b>${a.hint ? `<small>${a.hint}</small>` : ""}</span></div>`).join("");
    return box("Zo werkt het", `
      <p>${where} in elk vak één blok. Elke opstelling krijgt een score op twee punten:</p>
      <div class="ax-tiles">${tiles}</div>
      <p class="small muted">Totaal = 1,5 × veiligheid + eenvoud. Er is geen perfect antwoord en geen maximumscore: de scores zijn er om de opstellingen van de groepjes met elkaar te vergelijken.</p>`, "how");
  }

  function renderSide() {
    const c = cur(), data = cs();
    const before = CASES.slice(0, CASES.indexOf(c));
    const out = [howBox(), `
      <header class="case-banner case-${c.id}">
        <span class="round-nr" aria-hidden="true">${esc(c.nr)}</span>
        <span class="case-banner-text"><span class="case-label">${esc(c.label)}</span><h2>${esc(c.title)}</h2></span>
        ${icon(ROUND_ICON[c.id])}
      </header>`];
    out.push(box("De casus", c.story.map((p) => `<p>${esc(p)}</p>`).join(""), "story", "book"));
    out.push(box("De opdracht", `<p>${esc(c.task)}</p>`, "task", "target"));
    out.push(box("Goed om te weten", list(c.facts.map(esc), "dots"), "facts", "bulb"));
    if (c.carrySummary) {
      const rounds = before.filter((p) => p.selfEval).map((p) => {
        const ev = [...state.cases[p.id].log].reverse().find((e) => e.t === "eval");
        return `<span class="pill">${esc(p.label)}</span> ${esc(p.title)}: ${ev ? `<b>${nl(ev.snap.total)}</b>` : "nog niet beoordeeld"}`;
      });
      out.push(box("Jullie scores per ronde", list(rounds), "carry", "trophy"));
    }
    const evals = data.log.filter((e) => e.t === "eval");
    if (evals.length) out.push(evalBox(evals));
    $("side").innerHTML = out.join("");
  }

  const FINDING_GROUPS = [["risk", "Risico's"], ["insight", "Inzichten"], ["good", "Sterke punten"]];
  function evalBox(evals) {
    const e = evals[evals.length - 1], r = e.snap;
    const earlier = evals.length > 1 ? `<p class="small muted">Eerdere beoordelingen: ${evals.slice(0, -1).map((x) => `${x.round}: ${nl(x.snap.total)}`).join(" · ")}</p>` : "";
    const groups = FINDING_GROUPS.map(([type, title]) => {
      const fs = r.findings.filter((f) => f.type === type);
      return fs.length ? `<div class="f-group f-${type}"><h4 class="f-head">${mini(type)}<span>${title}</span></h4>${list(fs.map(findingHtml))}</div>` : "";
    }).join("");
    return `<section class="info eval" id="eval-box"><h3 class="info-head">${mini("trophy")}<span>Beoordeling ${e.round}</span></h3>${scoreCard(r)}${earlier}${groups}</section>`;
  }

  function findingHtml(f) {
    return esc(f.text.charAt(0).toUpperCase() + f.text.slice(1));
  }

  function scoreCard(r) {
    const k = r.calc;
    const ax = (id) => AXES.find((a) => a.id === id);
    const line = (id) => {
      const a = ax(id);
      if (id === "v") {
        const parts = [`gemiddelde ${nl(k.avg.v)}`];
        if (k.weakest) parts.push(`zwakste schakel ‘${esc(k.weakest.title)}’ (${nl(k.weakest.v)}) → hoogstens ${nl(k.weakest.v + 1)}, dus ${nl(k.afterWeak)}`);
        if (k.adj.v) parts.push(`aanpassingen ${k.adj.v > 0 ? "+" : ""}${nl(k.adj.v)}`);
        if (k.capV != null) parts.push(`begrensd door een risico tot ${nl(k.capV)}`);
        return `<li><b>${a.label} ${nl(r.scores.v)}</b>: ${parts.join("; ")}.</li>`;
      }
      return `<li><b>${a.label} ${nl(r.scores[id])}</b>: gemiddelde ${nl(k.avg[id])}${k.adj[id] ? `, aanpassingen ${k.adj[id] > 0 ? "+" : ""}${nl(k.adj[id])}` : ""}.</li>`;
    };
    return `
      <div class="scorecard">
        <div class="score-top">
          <span>Totaal</span>
          <span class="total"><b>${nl(r.total)}</b></span>
        </div>
        <div class="score-line">${AXES.map((a) => `<span class="ax-chip ax-${a.id}">${mini(a.id)}${a.label} <b class="${BAND_CLASS[band(r.scores[a.id])]}">${nl(r.scores[a.id])}</b>${a.w ? ` <span class="muted">×${nl(a.w)}</span>` : ""}</span>`).join("")}</div>
        <details class="calc">
          <summary>Hoe is dit berekend?</summary>
          <ul>${["v", "s"].map(line).join("")}<li><b>Totaal ${nl(r.total)}</b> = 1,5 × veiligheid + eenvoud.</li></ul>
          <table>
            <thead><tr><th>Vak</th><th>Blok</th><th title="Veiligheid">V</th><th title="Eenvoud">S</th></tr></thead>
            <tbody>${k.rows.map((row) => `<tr${row.ignored ? ' class="ignored" title="Telt niet mee als zwakste schakel"' : ""}><td>${esc(row.slot)}</td><td>${esc(row.title)}</td><td>${nl(row.v)}</td><td>${nl(row.s)}</td></tr>`).join("")}</tbody>
          </table>
          <p class="small muted">De score is deterministisch: dezelfde blokken geven altijd dezelfde uitkomst.</p>
        </details>
        <button type="button" class="btn ghost tiny" data-copy>Kopieer samenvatting</button>
      </div>`;
  }

  // ── Render ───────────────────────────────────────────────────────────
  function render() {
    document.body.classList.toggle("is-facilitator", facilitator);
    document.body.classList.toggle("view-case", state.view === "case");
    document.body.classList.toggle("view-board", state.view === "board");
    document.querySelectorAll(".mobile-nav button").forEach((b) => b.classList.toggle("active", b.dataset.view === state.view));
    applyCarry(cur(), cs());
    renderTabs();
    renderSide();
    renderBar();
    renderBoard();
    renderFacil();
    const c = cur();
    $("fill-count").textContent = `${required(c).length - missingSlots(c, cs()).length}/${required(c).length}`;
  }

  function renderTabs() {
    $("tabs").innerHTML = CASES.map((c, i) => `
      <button class="tab ${i === state.caseIdx ? "active" : ""}" data-case="${i}" type="button" ${i === state.caseIdx ? 'aria-current="page"' : ""} aria-label="${esc(c.label)}: ${esc(c.title)}">
        <span class="tab-nr">${c.nr}</span><span class="tab-title">${esc(c.title)}</span>
      </button>`).join("");
  }

  // Balk met voortgang en de knop om te beoordelen.
  function renderBar() {
    const c = cur(), data = cs();
    const el = $("board-bar");
    el.hidden = !canEval(c);
    if (!canEval(c)) return;
    const total = required(c).length;
    const done = total - missingSlots(c, data).length;
    el.innerHTML = `
      <span class="bar-progress"><b>${done} van ${total}</b> vakken gekozen</span>
      <button type="button" class="btn primary" id="evaluate" ${done < total ? "disabled" : ""}>${hasEval(data) ? "Beoordeel opnieuw" : "Beoordeel deze opstelling"}</button>`;
  }

  function badges(b, carriedFrom) {
    return [
      carriedFrom ? `<span class="badge from">Uit ${esc(labelOf(carriedFrom).toLowerCase())}</span>` : "",
      b.from ? `<span class="badge from">Nieuw sinds ${esc(labelOf(b.from).toLowerCase())}</span>` : "",
    ].join("");
  }


  // ── Schetsjes per zone ───────────────────────────────────────────────
  // Simpele lijntekeningen; het filter #rough (in index.html) maakt de lijnen wat bibberig.
  const ICONS = {
    artifactory: `
      <path class="fill-soft" d="M10 30 l14 -7 l14 7 v16 l-14 7 l-14 -7 z"/><path d="M10 30 l14 7 l14 -7 M24 37 v16"/>
      <path class="fill-soft" d="M42 30 l14 -7 l14 7 v16 l-14 7 l-14 -7 z"/><path d="M42 30 l14 7 l14 -7 M56 37 v16"/>
      <path d="M26 20 l14 -7 l14 7 M40 13 v-6"/><path class="accent" d="M36 10 l4 -4 l4 4"/>`,
    mens: `
      <circle cx="26" cy="18" r="9"/>
      <path d="M17.5 15 q8 -10 17 -1"/>
      <path d="M23 19 h.1 M29.5 19 h.1" stroke-width="3"/>
      <path d="M23.5 23 q2.8 2.2 5.6 0"/>
      <path d="M8 60 q0 -22 18 -24 q12 1 15 10"/>
      <path class="fill-soft" d="M38 47 l26 -2 l5 -20 l-26 2 z"/>
      <path d="M31 49 l38 -3"/>
      <path class="accent" d="M48 35 l4 4 l7 -9"/>`,
    agent: `
      <rect x="5" y="5" width="70" height="54" rx="7" stroke-dasharray="6 5"/>
      <path d="M5 16 h70"/>
      <path d="M11 10.5 h.1 M16 10.5 h.1 M21 10.5 h.1" stroke-width="3"/>
      <rect class="fill-soft" x="26" y="27" width="28" height="22" rx="6"/>
      <path d="M40 27 v-5"/><circle cx="40" cy="20" r="2"/>
      <path d="M34 37 h.1 M46 37 h.1" stroke-width="4"/>
      <path d="M35 44 q5 3 10 0"/>
      <path d="M26 36 h-4 M54 36 h4"/>`,
    model: `
      <path class="fill-soft" d="M27 52 c-10 0 -15 -8 -11 -15 c-7 -6 -1 -17 8 -15 c2 -9 15 -10 19 -2 c7 -5 17 0 15 9 c9 3 7 15 -2 16 c0 8 -10 11 -15 6 c-4 3 -10 3 -14 1z"/>
      <path d="M31 25 q5 4 0 9 q-5 5 0 10"/>
      <path d="M44 22 q-3 6 2 9 q5 3 1 9"/>
      <path class="accent" d="M67 8 v10 M62 13 h10 M8 50 v6 M5 53 h6"/>`,
    gitlab: `
      <g class="gitlab">
        <circle class="fill-brand" cx="20" cy="13" r="6"/>
        <circle class="fill-brand" cx="20" cy="51" r="6"/>
        <circle class="fill-brand" cx="58" cy="21" r="6"/>
        <path d="M20 19 v26"/>
        <path d="M58 27 q0 16 -32 21"/>
        <path d="M30 44 l-4 4 l5 3"/>
      </g>`,
    harness: `
      <rect class="fill-soft" x="8" y="10" width="64" height="44" rx="5"/>
      <path d="M8 20 h64"/>
      <path class="accent" d="M18 31 l7 5 l-7 5"/>
      <path d="M30 42 h14"/>`,
    internet: `
      <circle class="fill-soft" cx="40" cy="32" r="24"/>
      <ellipse cx="40" cy="32" rx="10" ry="24"/>
      <path d="M16 32 h48 M20 20 q20 6 40 0 M20 44 q20 -6 40 0"/>`,
    vm: `
      <rect class="fill-soft" x="12" y="8" width="56" height="16" rx="3"/>
      <rect class="fill-soft" x="12" y="28" width="56" height="16" rx="3"/>
      <path d="M20 16 h.1 M26 16 h.1 M20 36 h.1 M26 36 h.1" stroke-width="3"/>
      <path d="M44 16 h16 M44 36 h16 M40 44 v8 M24 56 h32"/>`,
    laptop: `
      <rect class="fill-soft" x="16" y="10" width="48" height="32" rx="3"/>
      <path class="fill-soft" d="M8 52 h64 l-6 -10 h-52 z"/>
      <path class="accent" d="M26 21 l6 5 l-6 5"/>
      <path d="M36 31 h12 M36 52 h8"/>`,
    data: `
      <path class="fill-soft" d="M20 5 h30 l11 11 v43 h-41 z"/>
      <path d="M50 5 v11 h11"/>
      <path d="M27 26 h26 M27 34 h26 M27 42 h15"/>
      <circle cx="56" cy="47" r="8"/>
      <path d="M62 53 l8 8"/>`,
  };
  const icon = (z) => ICONS[z] ? `<svg class="doodle doodle-${z}" viewBox="0 0 80 64" aria-hidden="true">${ICONS[z]}</svg>` : "";
  const arrowDown = (text) => `
      <div class="flow flow-down">
        <svg class="doodle" viewBox="0 0 24 48" aria-hidden="true"><path d="M12 2 q-4 11 0 22 q4 10 0 20"/><path d="M5 35 l7 10 l7 -10"/></svg>
        <span>${esc(text)}</span>
      </div>`;

  // Enkele pijl naar rechts (van de agent naar de modellen).
  const arrowRight = (text) => `
      <div class="flow flow-right">
        <svg class="doodle" viewBox="0 0 96 24" aria-hidden="true"><path d="M6 12 q21 -7 42 0 q21 7 42 0"/><path d="M81 4 l11 8 l-11 8"/></svg>
        <span>${esc(text)}</span>
      </div>`;

  // Dubbele pijl: verticaal (tussen GitLab en een blok eronder) of horizontaal (tussen agent en ontwikkelaar).
  const arrowBoth = (text, dir) => dir === "v" ? `
      <div class="flow flow-both-v">
        <svg class="doodle" viewBox="0 0 24 64" aria-hidden="true"><path d="M12 6 q-4 13 0 26 q4 13 0 26"/><path d="M5 15 l7 -11 l7 11"/><path d="M5 49 l7 11 l7 -11"/></svg>
        <span>${esc(text)}</span>
      </div>` : `
      <div class="flow flow-both-h">
        <svg class="doodle" viewBox="0 0 96 24" aria-hidden="true"><path d="M6 12 q21 -7 42 0 q21 7 42 0"/><path d="M15 4 l-11 8 l11 8"/><path d="M81 4 l11 8 l-11 8"/></svg>
        <span>${esc(text)}</span>
      </div>`;

  // ── Schetsen van het onderwerp van elke ronde ────────────────────────
  // Ronde 1: issues op een bord, de repo met een branch, en de pipeline die op een runner met internet draait.
  const GITLAB_SKETCH = `
    <svg class="sketch sketch-gitlab" viewBox="0 0 640 150" role="img" aria-label="Schets: issues op een bord, de repo met main en een branch van de agent, en een push die de pipeline start op een runner met internet.">
      <g class="sk">
        <rect x="8" y="22" width="56" height="116" rx="6"/><rect x="72" y="22" width="56" height="116" rx="6"/><rect x="136" y="22" width="56" height="116" rx="6"/>
        <rect class="card" x="14" y="32" width="44" height="18" rx="3"/><rect class="card" x="14" y="56" width="44" height="18" rx="3"/><rect class="card" x="14" y="80" width="44" height="18" rx="3"/>
        <rect class="card hot" x="78" y="32" width="44" height="18" rx="3"/>
        <rect class="card" x="142" y="32" width="44" height="18" rx="3"/><rect class="card" x="142" y="56" width="44" height="18" rx="3"/>
        <path d="M222 56 h150"/><circle class="dot" cx="240" cy="56" r="6"/><circle class="dot" cx="290" cy="56" r="6"/><circle class="dot" cx="352" cy="56" r="6"/>
        <path class="branch" d="M290 62 q6 38 34 38 h44"/><circle class="dot hot" cx="338" cy="100" r="6"/><circle class="dot hot" cx="368" cy="100" r="6"/>
        <path class="push" d="M384 100 q22 0 34 -20"/><path class="push" d="M408 78 l11 -1 l-1 11"/>
        <rect class="card" x="430" y="30" width="62" height="24" rx="4"/><rect class="card" x="430" y="62" width="62" height="24" rx="4"/><rect class="card" x="430" y="94" width="62" height="24" rx="4"/>
        <rect x="512" y="44" width="54" height="60" rx="6"/><path d="M522 60 h34 M522 74 h34 M522 88 h20"/>
        <path class="push" d="M566 74 q18 -2 28 -16"/><circle class="globe" cx="612" cy="40" r="20"/><ellipse cx="612" cy="40" rx="8" ry="20"/><path d="M592 40 h40"/>
      </g>
      <g class="sk-text">
        <text x="100" y="14" text-anchor="middle">Issues</text>
        <text x="36" y="150" text-anchor="middle" class="sm">open</text><text x="100" y="150" text-anchor="middle" class="sm">bezig</text><text x="164" y="150" text-anchor="middle" class="sm">klaar</text>
        <text x="296" y="14" text-anchor="middle">Repo</text>
        <text x="222" y="46" class="sm">main</text><text x="330" y="124" text-anchor="middle" class="sm">branch van de agent</text>
        <text x="398" y="72" text-anchor="middle" class="sm">push</text>
        <text x="461" y="14" text-anchor="middle">Pipeline</text>
        <text x="461" y="46" text-anchor="middle" class="sm">test</text><text x="461" y="78" text-anchor="middle" class="sm">lint</text><text x="461" y="110" text-anchor="middle" class="sm">build</text>
        <text x="539" y="122" text-anchor="middle" class="sm">runner</text><text x="612" y="78" text-anchor="middle" class="sm">internet</text>
      </g>
    </svg>`;

  // Ronde 2: de laptop met Downloads (vol tekst van buiten), documenten, ~/.ssh en conda; rechts de quarantainemap.
  const LAPTOP_SKETCH = `
    <svg class="sketch sketch-laptop" viewBox="0 0 640 150" role="img" aria-label="Schets: een laptop met de mappen Downloads, Documenten, ~/.ssh en conda. Van internet komen downloads binnen, tekst van buiten. Rechts de quarantainemap, die je later zelf leegt.">
      <g class="sk">
        <circle class="globe" cx="56" cy="48" r="20"/><ellipse cx="56" cy="48" rx="8" ry="20"/><path d="M36 48 h40"/>
        <path class="push" d="M80 56 q50 12 98 -2"/><path class="push" d="M169 47 l10 7 l-10 8"/>
        <rect x="150" y="10" width="340" height="110" rx="8"/>
        <path d="M118 138 h404 l-24 -18 h-356 z"/><path d="M292 131 h56"/>
        <path class="card hot" d="M182 34 h18 l5 6 h33 v32 h-56 z"/><path d="M190 34 v-10 h14 v10 M210 34 v-12 h14 v12"/>
        <path class="card" d="M262 34 h18 l5 6 h33 v32 h-56 z"/>
        <path class="card hot" d="M342 34 h18 l5 6 h33 v32 h-56 z"/>
        <rect class="card" x="420" y="36" width="52" height="10" rx="2"/><rect class="card" x="420" y="50" width="52" height="10" rx="2"/><rect class="card" x="420" y="64" width="52" height="10" rx="2"/>
        <path class="push" d="M492 70 q28 -4 50 4"/><path class="push" d="M533 66 l10 8 l-11 6"/>
        <path class="card" d="M552 52 h20 l5 6 h35 v40 h-60 z"/>
      </g>
      <g class="sk-text">
        <text x="56" y="86" text-anchor="middle" class="sm">internet</text>
        <text x="114" y="44" text-anchor="middle" class="sm">downloads</text>
        <text x="210" y="88" text-anchor="middle" class="sm">Downloads</text>
        <text x="290" y="88" text-anchor="middle" class="sm">Documenten</text>
        <text x="370" y="88" text-anchor="middle" class="sm">~/.ssh</text>
        <text x="446" y="88" text-anchor="middle" class="sm">conda</text>
        <text x="320" y="108" text-anchor="middle" class="sm">en je git-inlog, netwerkschijven, VPN</text>
        <text x="518" y="60" text-anchor="middle" class="sm">verplaatsen</text>
        <text x="582" y="118" text-anchor="middle" class="sm">quarantaine</text>
      </g>
    </svg>`;

  // Eindronde: meldingen van aannemers en weggebruikers, met gevoelige details, als export op de netwerkschijf.
  const DATA_SKETCH = `
    <svg class="sketch sketch-data" viewBox="0 0 640 150" role="img" aria-label="Schets: aannemers en weggebruikers sturen meldingen in, tekst van buiten. Een stapel van 18.000 meldingen met zwakke plekken, beveiligingsdetails en namen van bestuurders, als export op de netwerkschijf.">
      <g class="sk">
        <path class="card" d="M12 20 h82 v28 h-56 l-10 10 v-10 h-16 z"/>
        <path class="card" d="M12 78 h82 v28 h-56 l-10 10 v-10 h-16 z"/>
        <path class="push" d="M98 36 q34 4 64 22"/><path class="push" d="M151 50 l12 8 l-12 5"/>
        <path class="push" d="M98 92 q34 -4 64 -22"/><path class="push" d="M151 79 l12 -8 l-12 -5"/>
        <rect x="182" y="14" width="80" height="92" rx="4"/>
        <rect x="176" y="20" width="80" height="92" rx="4"/>
        <rect class="card" x="170" y="26" width="80" height="92" rx="4"/>
        <path d="M180 44 h58 M180 56 h44 M180 92 h52"/><path class="hot-line" d="M180 68 h58 M180 80 h30 M180 104 h40"/>
        <path class="wall" d="M252 40 h46 M252 70 h46 M252 100 h46"/>
        <rect class="card hot" x="300" y="28" width="142" height="24" rx="4"/>
        <rect class="card hot" x="300" y="58" width="142" height="24" rx="4"/>
        <rect class="card hot" x="300" y="88" width="142" height="24" rx="4"/>
        <path class="push" d="M446 70 q20 0 40 0"/><path class="push" d="M477 63 l10 7 l-10 7"/>
        <rect x="496" y="44" width="124" height="52" rx="6"/><path d="M510 62 h56 M510 78 h56"/><circle cx="600" cy="70" r="4"/>
      </g>
      <g class="sk-text">
        <text x="53" y="38" text-anchor="middle" class="sm">aannemer</text>
        <text x="53" y="96" text-anchor="middle" class="sm">weggebruiker</text>
        <text x="66" y="140" text-anchor="middle" class="sm">tekst van buiten</text>
        <text x="210" y="138" text-anchor="middle">18.000 meldingen</text>
        <text x="371" y="44" text-anchor="middle" class="sm">zwakke plekken</text>
        <text x="371" y="74" text-anchor="middle" class="sm">beveiligingsdetails</text>
        <text x="371" y="104" text-anchor="middle" class="sm">namen van bestuurders</text>
        <text x="466" y="58" text-anchor="middle" class="sm">export</text>
        <text x="558" y="114" text-anchor="middle" class="sm">netwerkschijf</text>
      </g>
    </svg>`;
  const SKETCHES = { gitlab: GITLAB_SKETCH, laptop: LAPTOP_SKETCH, data: DATA_SKETCH };

  // ── Bord ─────────────────────────────────────────────────────────────
  // Het onderwerp van de ronde (focus) groot bovenaan, met een schets. Daaronder links de agent, genest in zijn lagen:
  // de VM (als die optie er is) om het harnas, het harnas om de agent. Rechts de mens, buiten die lagen.
  // Pijlen tussen focus, agent en mens. Onder de mens, los van de agent, de modellen: het model krijgt alles wat de agent leest.
  // Wat verder nog meedoet (GitLab, internet), staat onderaan.
  const NEST = ["vm", "harness"];
  function renderBoard() {
    const c = cur(), data = cs();
    const top = c.focus;
    const has = (z) => c.zones[z] != null && z !== top;
    const rest = Object.keys(c.zones).filter((z) => ![top, "agent", "mens", "model", ...NEST].includes(z));
    const slotsOf = (z) => c.slots.filter((sl) => sl.zone === z);
    const slotsHtml = (z) => slotsOf(z).length ? `<div class="zone-slots">${slotsOf(z).map((sl) => slotHtml(c, data, sl)).join("")}</div>` : "";
    const note = (z) => c.zoneNotes?.[z] ? `<p class="zone-note">${esc(c.zoneNotes[z])}</p>` : "";
    const zone = (z, extra = "", inner = "") => `
      <section class="zone zone-${z}${inner ? " nest" : ""}">
        <header class="zone-head">${icon(z)}<h3 class="zone-label">${esc(c.zones[z])}</h3></header>
        ${extra}${note(z)}${slotsHtml(z)}${inner ? `<div class="nest-inner">${inner}</div>` : ""}
      </section>`;
    // Van binnen naar buiten: agent, dan harnas eromheen, dan de VM.
    const agentStack = ["harness", "vm"].reduce((inner, z) => has(z) ? zone(z, "", inner) : inner, zone("agent"));
    const a = c.arrows || {};
    $("board").innerHTML = `
      <div class="board-tri${has("model") ? " with-models" : ""}">
        <div class="tri-top">${zone(top, SKETCHES[top] ? `<div class="sketch-wrap">${SKETCHES[top]}</div>` : "")}</div>
        <div class="tri-up tri-up-agent">${arrowBoth(a.agent || "", "v")}</div>
        <div class="tri-up tri-up-mens">${arrowBoth(a.mens || "", "v")}</div>
        <div class="tri-agent">${agentStack}</div>
        <div class="tri-mid">${arrowBoth(a.between || "", "h")}</div>
        <div class="tri-mens">${zone("mens")}</div>
        ${has("model") ? `<div class="tri-mdl">${arrowRight(a.model || "")}</div><div class="tri-dn">${arrowDown(a.model || "")}</div><div class="tri-models">${zone("model")}</div>` : ""}
      </div>
      ${rest.length ? `${arrowDown(a.rest || "")}<div class="board-bottom">${rest.map((z) => zone(z)).join("")}</div>` : ""}`;
  }

  function slotHtml(c, data, sl) {
    const b = data.sel[sl.id] ? block(c, data.sel[sl.id]) : null;
    if (!b) {
      return `
        <button type="button" class="slot empty${sl.optional ? " optional" : ""}" data-choose="${sl.id}">
          ${sl.optional ? '<span class="sq-tag">Sidequest</span>' : ""}<span class="slot-label">${esc(sl.label)}</span>
          <span class="slot-cta">${sl.optional ? "+ Optioneel: kies een blok" : "+ Kies een blok"}</span>
        </button>`;
    }
    return `
      <button type="button" class="slot filled${sl.optional ? " optional" : ""}" data-choose="${sl.id}" aria-label="${esc(sl.label)}: ${esc(b.title)}. Kies een ander blok.">
        ${sl.optional ? '<span class="sq-tag">Sidequest</span>' : ""}<span class="slot-label">${esc(sl.label)}</span>
        <span class="slot-title">${esc(b.title)}</span>
        ${b.desc ? `<span class="slot-desc">${esc(b.desc)}</span>` : ""}
        <span class="slot-badges">${badges(b, data.carried?.[sl.id])}</span>
      </button>`;
  }

  function renderFacil() {
    $("facil")?.remove();
  }

  // ── Kiezer ───────────────────────────────────────────────────────────
  function openSheet(slotId) {
    const c = cur(), data = cs(), sl = slotOf(c, slotId);
    const opts = c.blocks.filter((b) => b.slot === slotId);
    $("sheet").innerHTML = `
      <div class="sheet-head">
        <div>
          <h2 id="sheet-title">${esc(sl.label)}</h2>
          <p class="small muted">${sl.optional ? "Sidequest: optioneel. Telt niet mee in de scores, maar je krijgt er wel feedback op." : "Kies één blok."}</p>
        </div>
        <button type="button" class="btn ghost" data-close-sheet>Sluit</button>
      </div>
      <div class="sheet-list">${opts.map((b) => {
        const current = data.sel[slotId] === b.id;
        return `
          <button type="button" class="option${current ? " current" : ""}" data-pick="${b.id}">
            <span class="option-head"><span class="option-title">${esc(b.title)}</span>${current ? '<span class="badge current">Huidige keuze</span>' : ""}${badges(b)}</span>
            ${b.desc ? `<span class="option-desc">${esc(b.desc)}</span>` : ""}
            ${b.detail ? `<span class="option-detail">${esc(b.detail)}</span>` : ""}
          </button>`;
      }).join("")}${sl.optional && data.sel[slotId] ? `<button type="button" class="btn ghost" data-clear="${slotId}">Leeg laten</button>` : ""}</div>`;
    $("sheet").hidden = false;
    $("sheet-backdrop").hidden = false;
    $("sheet").querySelector(".option")?.focus();
  }
  function closeSheet() {
    $("sheet").hidden = true;
    $("sheet-backdrop").hidden = true;
  }

  // ── Export ───────────────────────────────────────────────────────────
  function summary() {
    const c = cur(), data = cs();
    const lines = [`${c.label}: ${c.title}`, ""];
    c.slots.forEach((sl) => lines.push(`${sl.label}: ${data.sel[sl.id] ? block(c, data.sel[sl.id]).title : "—"}`));
    const ev = [...data.log].reverse().find((e) => e.t === "eval");
    if (ev) {
      const r = ev.snap.scores;
      lines.push("", `Laatste score: veiligheid ${nl(r.v)}, eenvoud ${nl(r.s)} (totaal ${nl(ev.snap.total)})`);
    }
    return lines.join("\n");
  }
  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (t.hidden = true), 2200);
  }

  // ── Events ───────────────────────────────────────────────────────────
  document.addEventListener("click", (e) => {
    const t = e.target.closest("button, .sheet-backdrop");
    if (!t) return;
    if (t.dataset.case != null) {
      state.caseIdx = Number(t.dataset.case);
      save(); render();
      return;
    }
    if (t.dataset.view) { state.view = t.dataset.view; save(); render(); window.scrollTo({ top: 0 }); return; }
    if (t.dataset.choose) { openSheet(t.dataset.choose); return; }
    if (t.dataset.pick) { place(t.dataset.pick); closeSheet(); return; }
    if (t.dataset.clear) { delete cs().sel[t.dataset.clear]; save(); closeSheet(); render(); return; }
    if (t.dataset.closeSheet != null || t.id === "sheet-backdrop") { closeSheet(); return; }
    if (t.id === "evaluate") {
      pushEval();
      save();
      state.view = "case";
      render();
      // Naar de nieuwe beoordeling; op een groot scherm scrolt alleen de linkerkolom.
      requestAnimationFrame(() => {
        const box = $("eval-box"), side = $("side");
        if (isPhone()) box.scrollIntoView({ behavior: "smooth", block: "start" });
        else side.scrollTo({ top: box.offsetTop - 4, behavior: "smooth" }); // .side is sticky, dus de offsetParent
      });
      return;
    }
    if (t.dataset.copy != null) {
      navigator.clipboard?.writeText(summary()).then(() => toast("Samenvatting gekopieerd"), () => toast("Kopiëren lukte niet"));
      return;
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSheet();
  });


  // Hoogte van de topbalk doorgeven, voor de plakkende balken op een telefoon.
  const syncTop = () => document.documentElement.style.setProperty("--top-h", document.querySelector(".topbar").offsetHeight + "px");
  window.addEventListener("resize", syncTop);

  render();
  syncTop();

})();
