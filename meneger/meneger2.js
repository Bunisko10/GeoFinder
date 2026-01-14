const blocks = document.getElementById("blocks");

/* ===== 1) DODAWANIE BLOKÓW ===== */
document.querySelectorAll(".block-bar button").forEach(btn => {
  btn.addEventListener("click", () => {
    const type = btn.dataset.add;
    addBlock(type);
  });
});

function addBlock(type){
  if (type === "opis") blocks.insertAdjacentHTML("beforeend", blockOpis());
  if (type === "polecenie") blocks.insertAdjacentHTML("beforeend", blockPolecenie());
  if (type === "lines") blocks.insertAdjacentHTML("beforeend", blockLines());
  if (type === "list")  blocks.insertAdjacentHTML("beforeend", blockList());
  if (type === "table") blocks.insertAdjacentHTML("beforeend", blockTable());
  if (type === "justifyTable") blocks.insertAdjacentHTML("beforeend", blockJustifyTable());
  if (type === "pf")    blocks.insertAdjacentHTML("beforeend", blockPF());
  if (type === "luki") blocks.insertAdjacentHTML("beforeend", blockLuki());
  if (type === "calc")  blocks.insertAdjacentHTML("beforeend", blockCalc());
  if (type === "abcd")  blocks.insertAdjacentHTML("beforeend", blockABCD());

  if (type === "att1") {
    if (document.querySelector("[data-block='att1']")) return; // tylko jeden
    blocks.insertAdjacentHTML("beforeend", blockAtt("att1"));
  }

  if (type === "att2") {
    if (document.querySelector("[data-block='att2']")) return; // tylko jeden
    blocks.insertAdjacentHTML("beforeend", blockAtt("att2"));
  }


}

const att1Scope = document.getElementById("att1_scope");
const att1Box   = document.getElementById("att1_scope_box");
const att2Scope = document.getElementById("att2_scope");
const att2Box   = document.getElementById("att2_scope_box");

// zabezpieczenie: jeśli elementów nie ma, to nie krzycz
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


const autoTitleEl = document.getElementById("auto-title");

function cap(s){
  return s ? s[0].toUpperCase() + s.slice(1) : "";
}

function normVal(v){
  // zamieniamy "null" i puste na ""
  if (v === null || v === undefined) return "";
  const s = String(v).trim();
  return (s === "null" || s === "0000") ? "" : s;
}

function buildAutoTitle(){
  const srcKey  = normVal(document.getElementById("zrodlo_select")?.value) || "INNE";
  const srcText = (document.getElementById("zrodlo_other")?.value || "").trim()
    || (document.getElementById("zrodlo_select")?.selectedOptions?.[0]?.textContent || "").trim();

  const formula = normVal(document.getElementById("formula")?.value);
  const poziom  = normVal(document.getElementById("poziom")?.value);
  const rok     = normVal(document.getElementById("rok")?.value);
  const miesiac = normVal(document.getElementById("miesiac")?.value);
  const nrZad   = normVal(document.getElementById("nr_zad")?.value);

  const dzial   = normVal(document.getElementById("dzial")?.value);
  const zag     = normVal(document.getElementById("zagadnienie")?.value);
  const typ     = normVal(document.getElementById("typ")?.value);

  // ✅ 1) CKE: tytuł maturalny
  if (srcKey.startsWith("CKE")) {
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

  // ✅ 2) INNE: tytuł “zbiorowy”
  const parts = [
    "Zadanie",
    srcText ? `• ${srcText}` : null,
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

// jak ktoś zacznie pisać ręcznie w tytule → blokujemy auto
if (autoTitleEl) {
  autoTitleEl.addEventListener("input", () => {
    autoTitleEl.dataset.auto = "false";
  });
}

// reaguj na zmiany w polach
["formula","poziom","rok","miesiac","nr_zad","dzial","zagadnienie","typ","zrodlo_select","zrodlo_other"]
  .forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", updateAutoTitle);
    el.addEventListener("change", updateAutoTitle);
  });

// ustaw od razu po starcie
updateAutoTitle();



/* ===== 2) DEFINICJE BLOKÓW (HTML) ===== */

function parseTaskRefs(input){
  const raw = (input || "").trim();
  if (!raw) return [];

  const out = [];

  raw.split(",").forEach(part => {
    const p = part.trim();
    if (!p) return;

    // zakres 6-11
    const m = p.match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) {
      const a = Number(m[1]);
      const b = Number(m[2]);
      const from = Math.min(a,b);
      const to   = Math.max(a,b);
      for (let i = from; i <= to; i++) out.push(String(i));
      return;
    }

    // pojedyncze: 10.1 albo 6
    out.push(p);
  });

  return out;
}

function blockOpis(){
  return `
  <div class="block" data-block="opis">

    <p contenteditable="true">[Wprowadzenie – kliknij i wpisz]</p>

   <div class="block-tools editor-only" contenteditable="false">
      <button type="button" data-action="del-block">Usuń blok</button>
    </div>
  </div>`;
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
    <p><strong>[wybór A–D]</strong></p>

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
    <p><strong>Tabela z uzasadnieniem</strong></p>

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

async function loadMetaSuggestions() {
  const res = await fetch("/api/meta_suggestions", { cache: "no-store" });
  if (!res.ok) return;
  const data = await res.json();

  fillDatalist("dzial_list", data.dzialy || []);
  fillDatalist("zagadnienie_list", data.zagadnienia || []);
  fillDatalist("kompetencje_list", data.kompetencje || []);
}

function fillDatalist(id, arr) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = (arr || [])
    .map(v => `<option value="${escapeHtml(v)}"></option>`)
    .join("");
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

document.addEventListener("DOMContentLoaded", () => {
  loadMetaSuggestions();
});


function getCleanTaskHTML(){
  const editor = document.getElementById("task-editor");
  const clone = editor.cloneNode(true);

  // 1) usuń przyciski i rzeczy tylko do edycji
  clone.querySelectorAll(".editor-only").forEach(el => el.remove());
  clone.querySelectorAll(".block-tools").forEach(el => el.remove()); // na wszelki wypadek

  // 2) usuń auto-tytuł z treści (bo backend i tak robi własny <h1>)
  clone.querySelector("#auto-title")?.remove();

  // 3) zostaw placeholdery att, ale usuń ich środek (żeby nie było opisów w treści)
  clone.querySelectorAll(".attachment-placeholder").forEach(ph => {
    ph.innerHTML = ""; // generator potem podmieni placeholder na wrapper HTML
  });

  return clone.innerHTML;
}


function collectMeta(){
  const zKey = document.getElementById("zrodlo_select")?.value || "INNE";
  const zText = (document.getElementById("zrodlo_other")?.value || "").trim()
    || (document.getElementById("zrodlo_select")?.selectedOptions?.[0]?.textContent || "").trim();

  const kompet = (document.getElementById("kompetencje")?.value || "")
    .split(/[;,]/).map(s=>s.trim()).filter(Boolean);

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

    dzial_1: dz[0] || null,
    dzial_2: dz[1] || null,

    zagadnienie: document.getElementById("zagadnienie")?.value || null,
    typ: document.getElementById("typ")?.value || null,

    kompetencja_1: kompet[0] || null,
    kompetencja_2: kompet[1] || null,

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


/* ===== 3) PRZYCISKI W ŚRODKU BLOKÓW (+/–/usuń) ===== */
blocks.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const action = btn.dataset.action;
  const block = btn.closest(".block");
  if (!block) return;

  if (action === "del-block") block.remove();

  if (action === "add-line") {
    block.querySelector(".answer-space")
      .insertAdjacentHTML("beforeend", `<div class="line"></div>`);
  }

if (action === "add-item") {
  block.querySelector("ol.answer-list")
    .insertAdjacentHTML("beforeend", `<li><div class="line"></div></li>`);
}

if (action === "del-item") {
  const items = block.querySelectorAll("ol.answer-list li");
  if (items.length > 1) items[items.length - 1].remove();
}

  if (action === "add-row") {
    const table = block.querySelector("table");
    const rows = table.querySelectorAll("tr");
    const next = rows.length; // 1 = nagłówek
    table.insertAdjacentHTML(
      "beforeend",
      `<tr><td>${next}.</td><td contenteditable="true"></td><td></td></tr>`
    );
  }

  if (action === "del-row") {
    const table = block.querySelector("table");
    const rows = table.querySelectorAll("tr");
    if (rows.length > 2) rows[rows.length - 1].remove();
  }
  if (action === "add-col") {
  const table = block.querySelector("table");
  const rows = table.querySelectorAll("tr");
  const colCount = rows[0].children.length; // ile jest teraz kolumn

  rows.forEach((tr, idx) => {
    if (idx === 0) {
      // nagłówek
      tr.insertAdjacentHTML("beforeend", `<th contenteditable="true">Kolumna ${colCount}</th>`);
    } else {
      // zwykłe wiersze
      tr.insertAdjacentHTML("beforeend", `<td contenteditable="true"></td>`);
    }
  });
}

if (action === "del-col") {
  const table = block.querySelector("table");
  const rows = table.querySelectorAll("tr");
  const colCount = rows[0].children.length;

  // nie pozwól usunąć poniżej 2 kolumn (Lp. + 1 kolumna treści)
  if (colCount <= 2) return;

  rows.forEach(tr => {
    tr.lastElementChild?.remove();
  });
}



if (action === "add-calc-line") {
  block.querySelector(".answer-space-clean")
    .insertAdjacentHTML("beforeend", `<div class="line"></div>`);
}



  if (action === "add-pf") {
    block.querySelector("table")
      .insertAdjacentHTML(
        "beforeend",
        `<tr>
           <td contenteditable="true">[Nowe zdanie]</td>
           <td class="pf-mark">P</td>
           <td class="pf-mark">F</td>
         </tr>`
      );
  }

  if (action === "del-pf") {
    const rows = block.querySelectorAll("table tr");
    if (rows.length > 2) rows[rows.length - 1].remove();
  }

if (action === "add-calc-line") {
  const box = block.querySelector(".answer-space-clean");
  if (box) box.insertAdjacentHTML("beforeend", `<div class="line"></div>`);
}

if (action === "erase-calc-line") {
  const box = block.querySelector(".answer-space-clean");
  const lines = box ? box.querySelectorAll(".line") : [];
  if (lines.length > 1) lines[lines.length - 1].remove();
}


if (action === "add-gap") {
  const line = block.querySelector(".gap-line");
  if (!line) return;

  line.insertAdjacentHTML("beforeend", `
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
  if (!box) return;

  const ps = box.querySelectorAll("p");
  if (ps.length > 2) ps[ps.length - 1].remove();
}



});



// domyślnie dodaj jeden blok linii po starcie
addBlock("lines");


// ustaw od razu po starcie
updateAutoTitle();

document.getElementById("save-task").addEventListener("click", async () => {
  const payload = collectMeta();

  const fd = new FormData();
  fd.append("meta", JSON.stringify(payload));
fd.append("body_html", getCleanTaskHTML());
  fd.append("solution_html", document.getElementById("solution-editor").innerHTML);

  // att1
  fd.append("att1_type", document.getElementById("att1_type")?.value || "");
  fd.append("att1_desc", document.getElementById("att1_desc")?.value || "");
  const a1 = document.getElementById("att1_file")?.files?.[0];
  if (a1) fd.append("att1_file", a1);

  // att2
  fd.append("att2_type", document.getElementById("att2_type")?.value || "");
  fd.append("att2_desc", document.getElementById("att2_desc")?.value || "");
  const a2 = document.getElementById("att2_file")?.files?.[0];
  if (a2) fd.append("att2_file", a2);
const res = await fetch("/api/save_task", { method: "POST", body: fd });
const data = await res.json();

if (!res.ok || !data.ok) {
  alert("Błąd zapisu: " + (data.error || res.status));
  return;
}

alert("Zapisano! ID: " + data.id);
await loadMetaSuggestions();
});

console.log("JS działa do końca");
console.log("save-task =", document.getElementById("save-task"));

