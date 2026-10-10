console.log("edytuj.js start");

const pick = document.getElementById("task-pick");
const srcSel = document.getElementById("edit-source");
const refreshBtn = document.getElementById("refresh-list");
const loadBtn = document.getElementById("load-task");
const openBtn = document.getElementById("open-html");

const banner = document.getElementById("edit-banner");
const bannerId = document.getElementById("edit-id");
const resetBtn = document.getElementById("reset-form");
// ===== podczyt treści HTML =====

function extractBodyHtml(fullHtml){
  // bierzemy środek między <div class="meta"> ... </div> a <details class="solution">
  const m = fullHtml.match(/<\/div>\s*([\s\S]*?)\s*<details class="solution">/i);
  if (!m) return "";
  return m[1].trim();
}

function extractSolutionHtml(fullHtml){
  // bierzemy wnętrze <div class="solution-content"> ... </div>
  const m = fullHtml.match(/<div class="solution-content">\s*([\s\S]*?)\s*<\/div>\s*<\/details>/i);
  if (!m) return "";
  return m[1].trim();
}



// ===== helpers =====
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}

function mapSourceTextToKey(z){
  const t = String(z || "").toLowerCase();

  if (t.includes("matury cke")) return "CKE_M";
  if (t.includes("informator cke")) return "CKE_I";
  if (t.includes("stubcia")) return "STU";
  if (t.includes("bolesławiec") || t.includes("boleslawiec")) return "BOL";
  if (t.includes("nowa era") && t.includes("prób")) return "NER_M";
  if (t.includes("operon") && t.includes("prób")) return "OPE_M";
  if (t.includes("nowa era")) return "NER";
  if (t.includes("operon")) return "OPE";
  return "INN";
}

function renderPreview(record, fullHtml){
  const box = document.getElementById("preview");
  if (!box) return;

  const body = extractBodyHtml(fullHtml);
  const sol  = extractSolutionHtml(fullHtml);

  const meta = `
    <div class="meta">
      <span>${record.zrodlo ?? ""}</span>
      <span>${record.rok ?? ""}</span>
      <span>${record.l_pkt ?? ""} pkt</span>
      <span>${[record.kompetencja_1, record.kompetencja_2].filter(Boolean).join("; ")}</span>
    </div>
  `;

  const bodySafe = body
    .replaceAll('<div class="attachment-placeholder" data-att="att1"></div>', '<div class="attachment-placeholder">[Załącznik 1]</div>')
    .replaceAll('<div class="attachment-placeholder" data-att="att2"></div>', '<div class="attachment-placeholder">[Załącznik 2]</div>');

  box.innerHTML = `
    <h2>${escapeHtml(record.id)}</h2>
    ${meta}
    ${bodySafe}
    <details class="solution">
      <summary>Pokaż rozwiązanie</summary>
      <div class="solution-content">${sol}</div>
    </details>
  `;
}


function setVal(id, val) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = (val === null || val === undefined) ? "" : String(val);
}

function setSelectByTextOrValue(selectId, want) {
  const el = document.getElementById(selectId);
  if (!el) return;

  const w = (want ?? "").toString().trim();
  if (!w) { 
    // jeśli masz opcję null
    if (Array.from(el.options).some(o => o.value === "null")) el.value = "null";
    return;
  }

  // po value
  const byValue = Array.from(el.options).find(o => o.value === w);
  if (byValue) { el.value = w; return; }

  // po tekście
  const byText = Array.from(el.options).find(o => (o.textContent || "").trim() === w);
  if (byText) { el.value = byText.value; return; }
}

function fillFormFromRecord(r) {
  // ⚠️ zrodlo w JSON to tekst ("Matury CKE"), a select ma kody ("CKE_M")
  // więc: zostaw select jak jest, a tekst daj w dopisku:
setSelectByTextOrValue("zrodlo_select", mapSourceTextToKey(r.zrodlo));
setVal("zrodlo_other", (mapSourceTextToKey(r.zrodlo) === "INN") ? (r.zrodlo || "") : "");


  setSelectByTextOrValue("formula", r.formula ?? "null");
  setSelectByTextOrValue("poziom", r.poziom ?? "null");

  setVal("rok", r.rok);
  setVal("miesiac", r.miesiac);
  setVal("l_pkt", r.l_pkt);
  setVal("nr_zad", r.nr_zad);
  setVal("strona", r.strona);

  setVal("dzial_1", r.dzial_1);
  setVal("dzial_2", r.dzial_2);
  setVal("zagadnienie", r.zagadnienie);
  setSelectByTextOrValue("typ", r.typ);

  setVal("kompetencja_1", r.kompetencja_1);
  setVal("kompetencja_2", r.kompetencja_2);

  // info o att
  const att1 = document.getElementById("current-att1");
  const att2 = document.getElementById("current-att2");
  if (att1) att1.textContent = r.att1_id ? `${r.att1_id} (${r.att1_type || ""})` : "brak";
  if (att2) att2.textContent = r.att2_id ? `${r.att2_id} (${r.att2_type || ""})` : "brak";
}

// ===== list =====
async function loadTasksList(){
  if (!pick) return;
  pick.innerHTML = "<option>Ładowanie…</option>";

  const src = srcSel?.value || "general";
  const res = await fetch("/api/tasks_list", { cache:"no-store" });
  if (!res.ok) {
    pick.innerHTML = "<option>Nie udało się pobrać listy</option>";
    console.warn("tasks_list error", res.status);
    return;
  }

  const data = await res.json();
  pick.innerHTML = data.map(t => {
    const label = `${t.id} | ${t.zrodlo ?? ""} ${t.rok ?? ""} ${t.miesiac ?? ""} | nr: ${t.nr_zad ?? ""}`;
    return `<option value="${escapeHtml(t.id)}">${escapeHtml(label)}</option>`;
  }).join("");
}

// ===== load one =====
async function loadTaskById(id){
  const src = srcSel?.value || "general";
  const res = await fetch(`/api/task/${encodeURIComponent(id)}`, { cache:"no-store" });
  const data = await res.json().catch(()=>({}));
  if (!res.ok || !data.ok) {
    alert("Nie udało się wczytać zadania.");
    return null;
  }
  return data;
}

let loadedId = null;

loadBtn?.addEventListener("click", async () => {
  const id = pick?.value;
  if (!id) return;

  const data = await loadTaskById(id);
  if (!data) return;

  loadedId = data.record.id;

  // banner
  if (banner && bannerId) {
    banner.style.display = "flex";
    bannerId.textContent = loadedId;
  }

  // metadane
  fillFormFromRecord(data.record);

  // html
  const full = data.html || "";
  const body = extractBodyHtml(full);
  const sol  = extractSolutionHtml(full);

  // 1) contenteditable
  document.getElementById("edit-body").innerHTML = body;
  document.getElementById("edit-solution").innerHTML = sol;

  // 2) textarea (advanced)
  document.getElementById("edit-body-html").value = body;
  document.getElementById("edit-solution-html").value = sol;

  // 3) preview
  renderPreview(data.record, full);
});





openBtn?.addEventListener("click", async () => {
  const id = pick?.value;
  if (!id) return;

  const data = await loadTaskById(id);
  if (!data) return;

  const htmlRel = data.record.html;
  if (!htmlRel) { alert("Brak ścieżki HTML w rekordzie."); return; }

  // ../tasks_private/x.html -> /tasks_private/x.html
  const url = htmlRel.startsWith("../") ? htmlRel.slice(2) : htmlRel;
  window.open(url, "_blank");
});

refreshBtn?.addEventListener("click", loadTasksList);
srcSel?.addEventListener("change", loadTasksList);

// reset formularza (bez reload strony)
resetBtn?.addEventListener("click", () => {
  document.getElementById("edit-form")?.reset();
  if (banner) banner.style.display = "none";
  // wyczyść opisy att
  const a1 = document.getElementById("current-att1");
  const a2 = document.getElementById("current-att2");
  if (a1) a1.textContent = "";
  if (a2) a2.textContent = "";
});


document.getElementById("save-update")?.addEventListener("click", async () => {
  if (!loadedId) { alert("Najpierw wczytaj zadanie."); return; }

  const target = document.getElementById("edit-source")?.value || "general";

  // weź meta z formularza
  const meta = {
    zrodlo_key: document.getElementById("zrodlo_select")?.value || "INN",
    zrodlo_text: document.getElementById("zrodlo_other")?.value?.trim()
      || document.getElementById("zrodlo_select")?.selectedOptions?.[0]?.textContent?.trim()
      || "",

    formula: document.getElementById("formula")?.value || null,
    poziom: document.getElementById("poziom")?.value || null,
    rok: document.getElementById("rok")?.value || null,
    miesiac: document.getElementById("miesiac")?.value || null,
    l_pkt: document.getElementById("l_pkt")?.value || 0,
    nr_zad: document.getElementById("nr_zad")?.value || null,
    strona: document.getElementById("strona")?.value || null,

    dzial_1: document.getElementById("dzial_1")?.value?.trim() || null,
    dzial_2: document.getElementById("dzial_2")?.value?.trim() || null,
    zagadnienie: document.getElementById("zagadnienie")?.value?.trim() || null,
    typ: document.getElementById("typ")?.value || null,

    kompetencja_1: document.getElementById("kompetencja_1")?.value?.trim() || null,
    kompetencja_2: document.getElementById("kompetencja_2")?.value?.trim() || null,

    uwagi: document.getElementById("uwagi")?.value || null,

    id: loadedId
  };

  const body_html = document.getElementById("edit-body")?.innerHTML || "";
  const solution_html = document.getElementById("edit-solution")?.innerHTML || "";

  const fd = new FormData();
  fd.append("meta", JSON.stringify(meta));
  fd.append("body_html", body_html);
  fd.append("solution_html", solution_html);

  // att1/att2 (opcjonalnie)
  const a1 = document.getElementById("att1_file")?.files?.[0];
  if (a1) fd.append("att1_file", a1);
  fd.append("att1_desc", document.getElementById("att1_desc")?.value || "");
  fd.append("att1_intro", document.getElementById("att1_intro")?.value || "");
  fd.append("att1_type", "img"); // albo dodaj select w edytorze

  const a2 = document.getElementById("att2_file")?.files?.[0];
  if (a2) fd.append("att2_file", a2);
  fd.append("att2_desc", document.getElementById("att2_desc")?.value || "");
  fd.append("att2_intro", document.getElementById("att2_intro")?.value || "");
  fd.append("att2_type", "img");

  const res = await fetch("/api/update_task", {
    method: "POST",
    body: fd
  });

  const data = await res.json().catch(()=>({}));
  if (!res.ok || !data.ok) {
    alert("Błąd zapisu: " + (data.error || res.status));
    return;
  }

  alert("Zapisano! ID: " + data.id);
});



document.addEventListener("DOMContentLoaded", loadTasksList);

