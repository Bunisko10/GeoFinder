// =====================
// GEOFINDER – MENEDŻER
// meneger.js (clean)
// =====================

// ---------- DOM ----------
const blocks = document.getElementById("blocks");

const autoTitleEl = document.getElementById("auto-title");
const saveBtn = document.getElementById("save-task");

const att1Scope = document.getElementById("att1_scope");
const att1Box   = document.getElementById("att1_scope_box");
const att2Scope = document.getElementById("att2_scope");
const att2Box   = document.getElementById("att2_scope_box");

// ---------- HELPERS: tekst ----------
function cap(s){ return s ? s[0].toUpperCase() + s.slice(1) : ""; }
function normVal(v){
  if (v === null || v === undefined) return "";
  const s = String(v).trim();
  return (s === "null" || s === "0000") ? "" : s;
}
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// ---------- AUTOTYTUŁ ----------
function buildAutoTitle(){
  const srcKey  = normVal(document.getElementById("zrodlo_select")?.value) || "INNE";
  const srcText = (document.getElementById("zrodlo_other")?.value || "").trim()
    || (document.getElementById("zrodlo_select")?.selectedOptions?.[0]?.textContent || "").trim();

  const formula = normVal(document.getElementById("formula")?.value);
  const poziom  = normVal(document.getElementById("poziom")?.value);
  const rok     = normVal(document.getElementById("rok")?.value);
  const miesiac = normVal(document.getElementById("miesiac")?.value);
  const nrZad   = normVal(document.getElementById("nr_zad")?.value);

const dz1 = normVal(document.getElementById("dzial_1")?.value);
const dz2 = normVal(document.getElementById("dzial_2")?.value);
const dzial = [dz1, dz2].filter(Boolean).join("; ");

  const zag     = normVal(document.getElementById("zagadnienie")?.value);
  const typ     = normVal(document.getElementById("typ")?.value);

  // CKE
  if (srcKey.startsWith("CKE_M")) {
    const formulaTxt = formula ? `Formuła ${formula}` : "brak formuły";
    const parts = [
      "Zadanie",
      (miesiac || rok) ? `Matura ${cap(miesiac)} ${rok}`.trim() : null,
      poziom ? `Poziom ${poziom}` : null,
      `(${formulaTxt})`,
      nrZad ? `– Zadanie ${nrZad}` : null
    ].filter(Boolean);

    return parts.join(", ").replace(", –", " –");
  }

if (srcKey.startsWith("CKE_I")) {
    const formulaTxt = formula ? `Formuła ${formula}` : "brak formuły";
    const parts = [
      "Zadanie",
      (miesiac || rok) ? `Informator CKE ${cap(miesiac)} ${rok}`.trim() : null,
      poziom ? `Poziom ${poziom}` : null,
      `(${formulaTxt})`,
      nrZad ? `– Zadanie ${nrZad}` : null
    ].filter(Boolean);

    return parts.join(", ").replace(", –", " –");
  }
  


const isTrial = ["CKE_P", "NER_M", "OPE_M"].some(p => srcKey.startsWith(p));

if (isTrial) {
  const formulaTxt = formula ? `Formuła ${formula}` : "brak formuły";

  // marka próbnej matury (ładna etykieta)
  let brand = "";
  if (srcKey.startsWith("CKE_P")) brand = "CKE";
  else if (srcKey.startsWith("NER_M")) brand = "Nowa Era";
  else if (srcKey.startsWith("OPE_M")) brand = "Operon";

  const parts = [
    "Zadanie",
    (miesiac || rok) ? `Matura próbna ${brand} ${cap(miesiac)} ${rok}`.trim() : `Matura próbna ${brand}`.trim(),
    poziom ? `Poziom ${poziom}` : null,
    `(${formulaTxt})`,
    nrZad ? `– Zadanie ${nrZad}` : null
  ].filter(Boolean);

  return parts.join(", ").replace(", –", " –");
}



  // INNE
  const parts = [
    "Zadanie",
    srcText ? ` ${srcText}` : null,
    dzial || null,
    zag ? `– ${zag}` : null,
    typ ? `(${typ})` : null,
    nrZad ? `– Zadanie ${nrZad}` : null,
  ].filter(Boolean);

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function updateAutoTitle(){
  if (!autoTitleEl) return;
  if (autoTitleEl.dataset.auto !== "true") return;
  autoTitleEl.textContent = buildAutoTitle();
}

// ---------- CLEAN PASTE (czysty tekst) ----------
document.addEventListener("paste", (e) => {
  const target = e.target;
  if (!target.closest("[contenteditable='true']")) return;

  e.preventDefault();
  const text = (e.clipboardData || window.clipboardData).getData("text/plain");
  document.execCommand("insertText", false, text);
});

// ---------- (opcjonalnie) czyszczenie span/style po input ----------
document.addEventListener("input", (e) => {
  const el = e.target;
  if (!el.closest("[contenteditable='true']")) return;

  el.querySelectorAll("[style], font, span").forEach(n => {
    n.replaceWith(n.textContent);
  });
});

// =====================
// SUGGESTIONS (Google vibe)
// =====================
let SUGG = { dzialy: [], zagadnienia: [], kompetencje: [] };

function fillDatalist(id, arr) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = (arr || []).map(v => `<option value="${escapeHtml(v)}"></option>`).join("");
}

async function loadMetaSuggestions() {
  const res = await fetch("/api/meta_suggestions", { cache: "no-store" });
  if (!res.ok) return;

  const data = await res.json();

  SUGG.dzialy = data.dzialy || [];
  SUGG.zagadnienia = data.zagadnienia || [];
  SUGG.kompetencje = data.kompetencje || [];

  fillDatalist("dzial_list", SUGG.dzialy);
  fillDatalist("zagadnienie_list", SUGG.zagadnienia);
  fillDatalist("kompetencje_list", SUGG.kompetencje);
}

function keyify(s){
  return String(s || "").trim().replace(/\s+/g, " ").toLowerCase();
}
function canonicalizeSingle(value, list){
  const vKey = keyify(value);
  if (!vKey) return value;

  const map = new Map((list || []).map(x => [keyify(x), x]));
  return map.get(vKey) || String(value).trim().replace(/\s+/g, " ");
}
function canonicalizeMulti(value, list){
  const parts = String(value || "")
    .split(/[;,]/)
    .map(s => s.trim())
    .filter(Boolean);

  const canon = parts.map(p => canonicalizeSingle(p, list));
  return canon.join("; ");
}

// =====================

function blockOpis(){
  return `
  <div class="block" data-block="opis">

    <p contenteditable="true">[Wprowadzenie – kliknij i wpisz]</p>

   <div class="block-tools editor-only" contenteditable="false">
      <button type="button" data-action="del-block">Usuń blok</button>
    </div>
  </div>`;
}

function blockCalc(){
  return `
  <div class="block" data-block="calc">
    <p><strong>Obliczenia:</strong></p>

    <table class="calc-grid" data-rows="8" data-cols="30">
      ${calcGridRows(8, 30)}
    </table>

    <div class="block-tools editor-only" contenteditable="false">
      <button type="button" data-action="calc-add-row">+ wiersz</button>
      <button type="button" data-action="calc-del-row">- wiersz</button>
      <button type="button" data-action="del-block">Usuń blok</button>
    </div>
  </div>`;
}

function calcGridRows(rows, cols){
  let html = "";
  for (let r = 0; r < rows; r++){
    html += "<tr>";
    for (let c = 0; c < cols; c++){
      html += `<td>&nbsp;</td>`;
    }
    html += "</tr>";
  }
  return html;
}


function blockPolecenie(){
  return `
  <div class="block" data-block="polecenie">
    <p contenteditable="true"><strong>[Polecenie – kliknij i wpisz]</strong></p>

    <div class="block-tools editor-only" contenteditable="false">

      <button type="button" data-action="del-block">Usuń blok</button>
    </div>
  </div>`;
}


function blockLines(){
  return `
  <div class="block" data-block="lines">
    <div class="answer-space">
      <div class="line"></div>
      <div class="line"></div>
    </div>

<div class="block-tools editor-only" contenteditable="false">

      <button type="button" data-action="add-line">+ linia</button>
      <button type="button" data-action="del-block">Usuń blok</button>
    </div>
  </div>`;
}




function blockABCD(){
  return `
  <div class="block" data-block="abcd">

    <div class="abcd">
      <p contenteditable="true"><strong>A.</strong> …</p>
      <p contenteditable="true"><strong>B.</strong> …</p>
      <p contenteditable="true"><strong>C.</strong> …</p>
      <p contenteditable="true"><strong>D.</strong> …</p>
    </div>

<div class="block-tools editor-only" contenteditable="false">

      <button type="button" data-action="add-answer">+ odpowiedź</button>
      <button type="button" data-action="del-answer">- odpowiedź</button>

      <button type="button" data-action="del-block">Usuń blok</button>
    </div>
  </div>`;
}


function blockLuki(){
  return `
  <div class="block" data-block="luki">
    <p class="gap-line">
      <span class="gap-unit">
        <span class="gap-text" contenteditable="true">[Zdanie]</span>
        <i class="gap-options" contenteditable="true">(opcja1 / opcja2)</i>
        <span class="inline-answer"></span>
      </span>
    </p>

<div class="block-tools editor-only" contenteditable="false">

      <button type="button" data-action="add-gap">+ luka</button>
      <button type="button" data-action="del-gap">- luka</button>
      <button type="button" data-action="del-block">Usuń blok</button>
    </div>
  </div>`;
}



function blockList(){
  return `
  <div class="block" data-block="list">
    <ol class="answer-list">
      <li><div class="line"></div></li>
      <li><div class="line"></div></li>
      <li><div class="line"></div></li>
    </ol>

    <div class="block-tools editor-only" contenteditable="false">
      <button type="button" data-action="add-item">+ punkt</button>
      <button type="button" data-action="del-item">- punkt</button>
      <button type="button" data-action="add-line-last-item">+ linia w punkcie</button>
      <button type="button" data-action="del-line-last-item">- linia w punkcie</button>
      <button type="button" data-action="del-block">Usuń blok</button>
    </div>
  </div>`;
}

function blockTable(){
  return `
  <div class="block" data-block="table">
    <table class="matura-table">
      <tr><th>Lp.</th><th>Cecha</th><th>Odpowiedź</th></tr>
      <tr><td>1.</td><td contenteditable="true"></td><td></td></tr>
      <tr><td>2.</td><td contenteditable="true"></td><td></td></tr>
    </table>

<div class="block-tools editor-only" contenteditable="false">

      <button type="button" data-action="add-row">+ wiersz</button>
      <button type="button" data-action="del-row">- wiersz</button>
      <button type="button" data-action="add-col">+ kolumna</button>
      <button type="button" data-action="del-col">- kolumna</button>
      <button type="button" data-action="del-block">Usuń blok</button>
    </div>
  </div>`;
}

function blockJustifyTable(){
  return `
  <div class="block" data-block="justifyTable">

    <table class="justify-table">
      <tbody>
        <tr>
          <td class="ab-col" rowspan="2" contenteditable="true">A.</td>
          <td class="type-col" rowspan="2" contenteditable="true">...</td>
          <td class="middle-col" rowspan="4" contenteditable="true">...</td>
          <td class="num-col">1.</td>
          <td contenteditable="true">...</td>
        </tr>

        <tr>
          <td class="num-col">2.</td>
          <td contenteditable="true">...</td>
        </tr>

        <tr>
          <td class="ab-col" rowspan="2" contenteditable="true">B.</td>
          <td class="type-col" rowspan="2" contenteditable="true">...</td>
          <td class="num-col">3.</td>
          <td contenteditable="true">...</td>
        </tr>

        <tr>
          <td class="num-col">4.</td>
          <td contenteditable="true">...</td>
        </tr>
      </tbody>
    </table>

   <div class="block-tools editor-only" contenteditable="false">

      <button type="button" data-action="del-block">Usuń blok</button>
    </div>
  </div>`;
}





function blockPF(){
  return `
  <div class="block" data-block="pf">

    <table class="pf-table">
      <tr>
        <td contenteditable="true">[Zdanie 1]</td>
        <td class="pf-mark">P</td>
        <td class="pf-mark">F</td>
      </tr>
      <tr>
        <td contenteditable="true">[Zdanie 2]</td>
        <td class="pf-mark">P</td>
        <td class="pf-mark">F</td>
      </tr>
    </table>

<div class="block-tools editor-only" contenteditable="false">

      <button type="button" data-action="add-pf">+ zdanie</button>
      <button type="button" data-action="del-pf">- zdanie</button>
      <button type="button" data-action="del-block">Usuń blok</button>
    </div>
  </div>`;
}

function blockAtt(which){
  const num = (which === "att1") ? "1" : "2";
  return `
  <div class="block" data-block="${which}">

    <div class="attachment-placeholder" data-att="${which}">
      <p class="att-title">📎 Załącznik ${num} (${which})</p>
      <p class="att-note">Wybierz plik w sekcji „Załączniki” i wpisz opis.</p>
    </div>

<div class="block-tools editor-only" contenteditable="false">
      <button type="button" data-action="del-block">Usuń blok</button>
    </div>
  </div>`;
}

// =====================
// addBlock (jedno miejsce prawdy)
// =====================
const BLOCK_FACTORY = {
  opis: blockOpis,
  polecenie: blockPolecenie,
  lines: blockLines,
  list: blockList,
  table: blockTable,
  justifyTable: blockJustifyTable,
  pf: blockPF,
  luki: blockLuki,
  calc: blockCalc,
  abcd: blockABCD,
  // att1/att2 obsłużymy niżej
};

function addBlock(type){
  if (!blocks) return;

  if (type === "att1") {
    if (document.querySelector("[data-block='att1']")) return;
    blocks.insertAdjacentHTML("beforeend", blockAtt("att1"));
    return;
  }
  if (type === "att2") {
    if (document.querySelector("[data-block='att2']")) return;
    blocks.insertAdjacentHTML("beforeend", blockAtt("att2"));
    return;
  }

  const fn = BLOCK_FACTORY[type];
  if (!fn) return;

  blocks.insertAdjacentHTML("beforeend", fn());
}

// =====================
// CLEAN HTML do zapisu
// =====================
function getCleanTaskHTML(){
  const editor = document.getElementById("task-editor");
  const clone = editor.cloneNode(true);

  clone.querySelectorAll(".editor-only").forEach(el => el.remove());
  clone.querySelectorAll(".block-tools").forEach(el => el.remove());
  clone.querySelector("#auto-title")?.remove();

  clone.querySelectorAll(".attachment-placeholder").forEach(ph => {
    ph.innerHTML = "";
  });

  return clone.innerHTML;
}

// =====================
// META do zapisu
// =====================
function collectMeta(){
  const zKey = document.getElementById("zrodlo_select")?.value || "INNE";
  const zText = (document.getElementById("zrodlo_other")?.value || "").trim()
    || (document.getElementById("zrodlo_select")?.selectedOptions?.[0]?.textContent || "").trim();


  const dz = (document.getElementById("dzial")?.value || "")
    .split(/[;,]/).map(s=>s.trim()).filter(Boolean);

  return {
    zrodlo_key: zKey,
    zrodlo_text: zText,
    formula: document.getElementById("formula")?.value,
    poziom: document.getElementById("poziom")?.value,
    rok: document.getElementById("rok")?.value,
    miesiac: document.getElementById("miesiac")?.value,
    l_pkt: document.getElementById("l_pkt")?.value,
    nr_zad: document.getElementById("nr_zad")?.value,
    strona: document.getElementById("strona")?.value,

dzial_1: document.getElementById("dzial_1")?.value?.trim() || null,
dzial_2: document.getElementById("dzial_2")?.value?.trim() || null,

kompetencja_1: document.getElementById("kompetencja_1")?.value?.trim() || null,
kompetencja_2: document.getElementById("kompetencja_2")?.value?.trim() || null,

    zagadnienie: document.getElementById("zagadnienie")?.value || null,
    typ: document.getElementById("typ")?.value || null,



    praca_z_topo: document.getElementById("praca_z_topo")?.checked ? "T" : "N",
    praca_z_mapa: document.getElementById("praca_z_mapa")?.checked ? "T" : "N",
    praca_z_tekstem_zrodlowym: document.getElementById("praca_z_tekstem")?.checked ? "T" : "N",
    praca_z_wykresem: document.getElementById("praca_z_wykresem")?.checked ? "T" : "N",

    czas_min: document.getElementById("czas_min")?.value || 0,
    czas_max: document.getElementById("czas_max")?.value || 0,

    pp1: document.getElementById("pp1")?.value || null,
    pp2: document.getElementById("pp2")?.value || null,
    pp3: document.getElementById("pp3")?.value || null,
    pp4: document.getElementById("pp4")?.value || null,
    pp5: document.getElementById("pp5")?.value || null,
    pp6: document.getElementById("pp6")?.value || null,

    uwagi: document.getElementById("uwagi")?.value || null,
    auto_title: document.getElementById("auto-title")?.textContent || null
  };
}

// =====================
// EVENTY: block-bar (klik w dodawanie bloków)
// =====================
document.querySelectorAll(".block-bar button").forEach(btn => {
  btn.addEventListener("click", () => addBlock(btn.dataset.add));
});

// =====================
// EVENTY: scope att1/att2
// =====================
if (att1Scope && att1Box) {
  att1Scope.addEventListener("change", () => {
    att1Box.style.display = (att1Scope.value === "multi") ? "block" : "none";
  });
}
if (att2Scope && att2Box) {
  att2Scope.addEventListener("change", () => {
    att2Box.style.display = (att2Scope.value === "multi") ? "block" : "none";
  });
}

// =====================
// EVENTY: akcje w blokach (klik)
// =====================
blocks?.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const action = btn.dataset.action;
  const block = btn.closest(".block");
  if (!block) return;

  if (action === "del-block") block.remove();

  if (action === "add-line") {
    block.querySelector(".answer-space")
      ?.insertAdjacentHTML("beforeend", `<div class="line"></div>`);
  }

  if (action === "add-item") {
    block.querySelector("ol.answer-list")
      ?.insertAdjacentHTML("beforeend", `<li><div class="line"></div></li>`);
  }

  if (action === "del-item") {
    const items = block.querySelectorAll("ol.answer-list li");
    if (items.length > 1) items[items.length - 1].remove();
  }

  if (action === "add-line-last-item") {
    const items = block.querySelectorAll("ol.answer-list li");
    const last = items[items.length - 1];
    last?.insertAdjacentHTML("beforeend", `<div class="line"></div>`);
  }

  if (action === "del-line-last-item") {
    const items = block.querySelectorAll("ol.answer-list li");
    const last = items[items.length - 1];
    const lines = last ? last.querySelectorAll(".line") : [];
    if (lines.length > 1) lines[lines.length - 1].remove();
  }

  if (action === "add-row") {
    const table = block.querySelector("table");
    const rows = table ? table.querySelectorAll("tr") : [];
    if (!table) return;
    const next = rows.length;
    table.insertAdjacentHTML("beforeend",
      `<tr><td>${next}.</td><td contenteditable="true"></td><td></td></tr>`
    );
  }

  if (action === "del-row") {
    const table = block.querySelector("table");
    const rows = table ? table.querySelectorAll("tr") : [];
    if (rows.length > 2) rows[rows.length - 1].remove();
  }

  if (action === "add-col") {
    const table = block.querySelector("table");
    const rows = table ? table.querySelectorAll("tr") : [];
    if (!rows.length) return;
    const colCount = rows[0].children.length;

    rows.forEach((tr, idx) => {
      tr.insertAdjacentHTML("beforeend", idx === 0
        ? `<th contenteditable="true">Kolumna ${colCount}</th>`
        : `<td contenteditable="true"></td>`
      );
    });
  }

  if (action === "del-col") {
    const table = block.querySelector("table");
    const rows = table ? table.querySelectorAll("tr") : [];
    if (!rows.length) return;
    const colCount = rows[0].children.length;
    if (colCount <= 2) return;
    rows.forEach(tr => tr.lastElementChild?.remove());
  }

  if (action === "add-gap") {
    const line = block.querySelector(".gap-line");
    line?.insertAdjacentHTML("beforeend", `
      <span class="gap-unit">
        <span class="gap-text" contenteditable="true"> [kolejny fragment]</span>
        <i class="gap-options" contenteditable="true">(opcja1 / opcja2)</i>
        <span class="inline-answer"></span>
      </span>
    `);
  }

  if (action === "del-gap") {
    const units = block.querySelectorAll(".gap-unit");
    if (units.length > 1) units[units.length - 1].remove();
  }

  if (action === "add-answer") {
    const box = block.querySelector(".abcd");
    if (!box) return;
    const letters = Array.from(box.querySelectorAll("p")).map(p => (p.textContent || "").trim()[0]);
    const last = letters[letters.length - 1] || "D";
    const nextChar = String.fromCharCode(last.charCodeAt(0) + 1);

    box.insertAdjacentHTML("beforeend",
      `<p contenteditable="true"><strong>${nextChar}.</strong> …</p>`
    );
  }

  if (action === "del-answer") {
    const box = block.querySelector(".abcd");
    const ps = box ? box.querySelectorAll("p") : [];
    if (ps.length > 2) ps[ps.length - 1].remove();
  }

  if (action === "calc-add-row") {
  const table = block.querySelector(".calc-grid");
  if (!table) return;
  const cols = table.querySelector("tr")?.children.length || 8;

  const tr = document.createElement("tr");
  for (let i = 0; i < cols; i++){
    const td = document.createElement("td");
    td.innerHTML = "&nbsp;";
    tr.appendChild(td);
  }
  table.appendChild(tr);
}

if (action === "calc-del-row") {
  const table = block.querySelector(".calc-grid");
  if (!table) return;
  const rows = table.querySelectorAll("tr");
  if (rows.length > 2) rows[rows.length - 1].remove(); // zostaw min 2
}

if (action === "calc-add-col") {
  const table = block.querySelector(".calc-grid");
  if (!table) return;
  table.querySelectorAll("tr").forEach(tr => {
    const td = document.createElement("td");
    td.innerHTML = "&nbsp;";
    tr.appendChild(td);
  });
}

if (action === "calc-del-col") {
  const table = block.querySelector(".calc-grid");
  if (!table) return;
  const firstRow = table.querySelector("tr");
  if (!firstRow) return;
  const cols = firstRow.children.length;
  if (cols <= 2) return; // zostaw min 2

  table.querySelectorAll("tr").forEach(tr => {
    tr.lastElementChild?.remove();
  });
}

});

function resetManagerUI() {
  // 1) reset pól formularza (input/select/checkbox)


  // 2) ukryj pola scope dla wiązek
  const att1Box = document.getElementById("att1_scope_box");
  const att2Box = document.getElementById("att2_scope_box");
  if (att1Box) att1Box.style.display = "none";
  if (att2Box) att2Box.style.display = "none";

  // 3) wyczyść edytor treści (bloki)
  const blocks = document.getElementById("blocks");
  if (blocks) blocks.innerHTML = "";

  // 4) przywróć auto-tytuł i włącz auto-mode
  const title = document.getElementById("auto-title");
  if (title) {
    title.dataset.auto = "true";
    title.textContent = "[Tytuł zadania]";
  }

  // 5) wyczyść rozwiązanie
  const sol = document.getElementById("solution-editor");
  if (sol) {
    sol.innerHTML = `
      <p><strong>Zasady oceniania:</strong></p>
      <p>…</p>
      <p><strong>Klucz / przykładowe odpowiedzi:</strong></p>
      <p>…</p>
    `;
  }

  // 6) “odśwież” podpowiedzi (nie trzeba reload strony)
  if (typeof loadMetaSuggestions === "function") {
    loadMetaSuggestions();
  }

  // 7) dodaj domyślny blok, jak lubisz (np. linie)
  if (typeof addBlock === "function") {
    addBlock("lines");
  }

  // 8) przebuduj auto-tytuł na bazie resetowanych pól
  if (typeof updateAutoTitle === "function") {
    updateAutoTitle();
  }
}

document.getElementById("reset-form")?.addEventListener("click", resetManagerUI);


async function resetAttachments(mode){
  const msg = (mode === "hard")
    ? "Usunie pliki załączników ORAZ wyczyści pola att w tasks_private.json. Na pewno?"
    : "Usunie tylko pliki załączników (img_private + attachment_private). Na pewno?";

  if (!confirm(msg)) return;

  const res = await fetch("/api/reset_attachments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode })
  });

  const data = await res.json().catch(()=> ({}));
  if (!res.ok || !data.ok) {
    alert("Błąd resetu");
    return;
  }

  alert(
    `OK: ${data.mode}\n` +
    `Usunięte pliki: ${data.removed_files}\n` +
    `Wyczyszczone rekordy: ${data.records_cleared}`
  );
}

document.getElementById("reset-att-soft")?.addEventListener("click", () => resetAttachments("soft"));
document.getElementById("reset-att-hard")?.addEventListener("click", () => resetAttachments("hard"));


// =====================
// ZAPIS
// =====================
saveBtn?.addEventListener("click", async () => {
  const payload = collectMeta();

  const fd = new FormData();
  fd.append("meta", JSON.stringify(payload));
  fd.append("body_html", getCleanTaskHTML());
  fd.append("solution_html", document.getElementById("solution-editor").innerHTML);

  // att1
  fd.append("att1_type", document.getElementById("att1_type")?.value || "");
  fd.append("att1_desc", document.getElementById("att1_desc")?.value || "");
  fd.append("att1_intro", document.getElementById("att1_intro")?.value || "");

  const a1 = document.getElementById("att1_file")?.files?.[0];
  if (a1) fd.append("att1_file", a1);

  // att2
  fd.append("att2_type", document.getElementById("att2_type")?.value || "");
  fd.append("att2_desc", document.getElementById("att2_desc")?.value || "");
  fd.append("att2_intro", document.getElementById("att2_intro")?.value || "");
  const a2 = document.getElementById("att2_file")?.files?.[0];
  if (a2) fd.append("att2_file", a2);

  const res = await fetch("/api/save_task", { method: "POST", body: fd });
  const data = await res.json();

  if (!res.ok || !data.ok) {
    alert("Błąd zapisu: " + (data.error || res.status));
    return;
  }

  alert("Zapisano! ID: " + data.id);

  // odśwież podpowiedzi po zapisie
  await loadMetaSuggestions();
});

// =====================
// INIT
// =====================
document.addEventListener("DOMContentLoaded", async () => {
  // auto-title
  updateAutoTitle();
  autoTitleEl?.addEventListener("input", () => (autoTitleEl.dataset.auto = "false"));



  ["formula","poziom","rok","miesiac","nr_zad","dzial","zagadnienie","typ","zrodlo_select","zrodlo_other"]
    .forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", updateAutoTitle);
      el.addEventListener("change", updateAutoTitle);
    });

  // suggestions
  await loadMetaSuggestions();

  // kanonizacja na blur
  document.getElementById("dzial_1")?.addEventListener("blur", (e)=>{
    e.target.value = canonicalizeSingle(e.target.value, SUGG.dzialy);
  });

  document.getElementById("dzial_2")?.addEventListener("blur", (e)=>{
    e.target.value = canonicalizeSingle(e.target.value, SUGG.dzialy);
  });
  document.getElementById("zagadnienie")?.addEventListener("blur", (e)=>{
    e.target.value = canonicalizeSingle(e.target.value, SUGG.zagadnienia);
  });

  document.getElementById("kompetencja_1")?.addEventListener("blur", (e)=>{
  e.target.value = canonicalizeSingle(e.target.value, SUGG.kompetencje);
});
document.getElementById("kompetencja_2")?.addEventListener("blur", (e)=>{
  e.target.value = canonicalizeSingle(e.target.value, SUGG.kompetencje);
});

  // domyślny blok
  addBlock("lines");

  console.log("meneger.js OK");
});
