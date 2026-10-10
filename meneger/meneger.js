// =====================
// GEOFINDER — MENEDŻER
// meneger.js
// =====================
//
// Przy ładowaniu zadania do edycji wywołaj:
// GeoFinderManager.setLoadedId(idZadania);
//
// Przy rozpoczęciu nowego zadania:
// GeoFinderManager.setLoadedId(null);

(() => {
  "use strict";

  // Chroni przed ponownym uruchomieniem tego samego skryptu.
  if (window.__geoFinderManagerInitialized) return;
  window.__geoFinderManagerInitialized = true;
  // =====================
  // HELPERS
  // =====================

  const $ = (id) => document.getElementById(id);

  function value(id) {
    return $(id)?.value ?? "";
  }

  function normVal(v) {
    const s = String(v ?? "").trim();
    return s === "null" || s === "0000" ? "" : s;
  }

  function cap(s) {
    return s ? s[0].toUpperCase() + s.slice(1) : "";
  }

  function escapeHtml(s) {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return String(s).replace(/[&<>"']/g, (c) => entities[c]);
  }

  function keyify(s) {
    return String(s ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  // =====================
  // STAN
  // =====================

  const SUGG = {
    dzialy: [],
    zagadnienia: [],
    kompetencje: []
  };

  let currentId = null;
  let explicitId = false;
  let busy = false;
  let suggestionRequest = 0;
  let initialFields = [];

  function setLoadedId(id) {
    currentId = normVal(id) || null;
    explicitId = true;
  }

  function getLoadedId() {
    if (explicitId) return currentId;

    // Zgodność ze starszym skryptem edycji,
    // który może deklarować globalne loadedId.
    try {
      if (typeof loadedId !== "undefined") {
        return loadedId ?? null;
      }
    } catch (_) {
      // Brak dostępnego loadedId.
    }

    return currentId;
  }

  // =====================
  // KANONIZACJA METADANYCH
  // =====================

  function canonicalizeSingle(v, list) {
    const cleaned = String(v ?? "")
      .trim()
      .replace(/\s+/g, " ");

    return (
      list.find((x) => keyify(x) === keyify(cleaned)) ??
      cleaned
    );
  }

  function canonicalizeFields() {
    const groups = [
      [["dzial_1", "dzial_2"], SUGG.dzialy],
      [["zagadnienie"], SUGG.zagadnienia],
      [["kompetencja_1", "kompetencja_2"], SUGG.kompetencje]
    ];

    for (const [ids, list] of groups) {
      ids.forEach((id) => {
        if ($(id)) {
          $(id).value = canonicalizeSingle(value(id), list);
        }
      });
    }
  }

  // =====================
  // AUTOTYTUŁ
  // =====================

  function buildAutoTitle() {
    const srcKey =
      normVal(value("zrodlo_select")) || "INNE";

    const srcText =
      value("zrodlo_other").trim() ||
      $("zrodlo_select")
        ?.selectedOptions?.[0]
        ?.textContent?.trim() ||
      "";

    const formula = normVal(value("formula"));
    const level = normVal(value("poziom"));

    const date = [
      cap(normVal(value("miesiac"))),
      normVal(value("rok"))
    ]
      .filter(Boolean)
      .join(" ");

    const number = normVal(value("nr_zad"));

    let label = "";

    if (srcKey.startsWith("CKE_M")) {
      label = "Matura";
    } else if (srcKey.startsWith("CKE_I")) {
      label = "Informator CKE";
    } else if (srcKey.startsWith("CKE_P")) {
      label = "Matura próbna CKE";
    } else if (srcKey.startsWith("NER_M")) {
      label = "Matura próbna Nowa Era";
    } else if (srcKey.startsWith("OPE_M")) {
      label = "Matura próbna Operon";
    }

    if (label) {
      const parts = [
        "Zadanie",
        [label, date].filter(Boolean).join(" "),
        level ? `Poziom ${level}` : "",
        formula
          ? `(Formuła ${formula})`
          : "(brak formuły)"
      ].filter(Boolean);

      return (
        parts.join(", ") +
        (number ? ` – Zadanie ${number}` : "")
      );
    }

    const dzial = [
      normVal(value("dzial_1")),
      normVal(value("dzial_2"))
    ]
      .filter(Boolean)
      .join("; ");

    const zagadnienie = value("zagadnienie").trim();
    const typ = value("typ");

    return [
      "Zadanie",
      srcText,
      dzial,
      zagadnienie ? `– ${zagadnienie}` : "",
      typ ? `(${typ})` : "",
      number ? `– Zadanie ${number}` : ""
    ]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function updateAutoTitle() {
    const el = $("auto-title");

    if (!el || el.dataset.auto === "false") return;

    el.dataset.auto = "true";
    el.textContent = buildAutoTitle();
  }

  // =====================
  // API
  // =====================

  async function api(url, options) {
    const res = await fetch(url, options);
    const raw = await res.text();

    let data;

    try {
      data = JSON.parse(raw);
    } catch (_) {
      throw new Error(
        `Serwer zwrócił nieprawidłową odpowiedź ` +
        `(HTTP ${res.status}).`
      );
    }

    if (!res.ok || data.ok === false) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    return data;
  }

  // =====================
  // PODPOWIEDZI
  // =====================

  async function loadMetaSuggestions() {
    const seq = ++suggestionRequest;

    try {
      const target = value("db-target") || "general";

      const data = await api(
        "/api/meta_suggestions",
        { cache: "no-store" }
      );

      // Starsza odpowiedź nie nadpisuje nowszych podpowiedzi.
      if (seq !== suggestionRequest) return;

      const fields = [
        ["dzialy", "dzial_list"],
        ["zagadnienia", "zagadnienie_list"],
        ["kompetencje", "kompetencje_list"]
      ];

      for (const [key, id] of fields) {
        SUGG[key] = Array.isArray(data[key])
          ? [
              ...new Set(
                data[key].filter(
                  (x) => typeof x === "string"
                )
              )
            ]
          : [];

        if ($(id)) {
          $(id).innerHTML = SUGG[key]
            .map(
              (v) =>
                `<option value="${escapeHtml(v)}"></option>`
            )
            .join("");
        }
      }
    } catch (err) {
      console.warn(
        "Nie udało się pobrać podpowiedzi:",
        err.message
      );
    }
  }

  // =====================
  // GENEROWANIE BLOKÓW
  // =====================

  function button(action, label) {
    return `
      <button type="button" data-action="${action}">
        ${label}
      </button>
    `;
  }

  function tools(actions) {
    return `
      <div
        class="block-tools editor-only"
        contenteditable="false"
      >
        ${actions.map((a) => button(...a)).join("")}
        ${button("del-block", "Usuń blok")}
      </div>
    `;
  }

  const line = '<div class="line"></div>';

  function gap() {
    return `
      <span class="gap-unit">
        <span class="gap-text" contenteditable="true">
          [Zdanie]
        </span>
        <i class="gap-options" contenteditable="true">
          (opcja1 / opcja2)
        </i>
        <span class="inline-answer"></span>
      </span>
    `;
  }

  function pfRow(n) {
    return `
      <tr>
        <td contenteditable="true">[Zdanie ${n}]</td>
        <td class="pf-mark">P</td>
        <td class="pf-mark">F</td>
      </tr>
    `;
  }

  function calcGridRows(rows, cols) {
    return Array.from(
      { length: rows },
      () => `
        <tr>
          ${"<td>&nbsp;</td>".repeat(cols)}
        </tr>
      `
    ).join("");
  }

  const FACTORY = {
    opis: () => [
      `
        <p contenteditable="true">
          [Wprowadzenie – kliknij i wpisz]
        </p>
      `,
      []
    ],

    polecenie: () => [
      `
        <p contenteditable="true">
          <strong>[Polecenie – kliknij i wpisz]</strong>
        </p>
      `,
      []
    ],

    lines: () => [
      `
        <div class="answer-space">
          ${line.repeat(2)}
        </div>
      `,
      [
        ["add-line", "+ linia"],
        ["del-line", "− linia"]
      ]
    ],

    list: () => [
      `
        <ol class="answer-list">
          ${`<li>${line}</li>`.repeat(3)}
        </ol>
      `,
      [
        ["add-item", "+ punkt"],
        ["del-item", "− punkt"],
        ["add-line-last-item", "+ linia w punkcie"],
        ["del-line-last-item", "− linia w punkcie"]
      ]
    ],

    table: () => [
      `
        <table class="matura-table">
          <thead>
            <tr>
              <th contenteditable="true">Lp.</th>
              <th contenteditable="true">Cecha</th>
              <th contenteditable="true">Odpowiedź</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1.</td>
              <td contenteditable="true"></td>
              <td></td>
            </tr>
            <tr>
              <td>2.</td>
              <td contenteditable="true"></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      `,
      [
        ["add-row", "+ wiersz"],
        ["del-row", "− wiersz"],
        ["add-col", "+ kolumna"],
        ["del-col", "− kolumna"]
      ]
    ],

    justifyTable: () => [
      `
        <table class="justify-table">
          <tbody>
            <tr>
              <td
                class="ab-col"
                rowspan="2"
                contenteditable="true"
              >A.</td>

              <td
                class="type-col"
                rowspan="2"
                contenteditable="true"
              >...</td>

              <td
                class="middle-col"
                rowspan="4"
                contenteditable="true"
              >...</td>

              <td class="num-col">1.</td>
              <td contenteditable="true">...</td>
            </tr>

            <tr>
              <td class="num-col">2.</td>
              <td contenteditable="true">...</td>
            </tr>

            <tr>
              <td
                class="ab-col"
                rowspan="2"
                contenteditable="true"
              >B.</td>

              <td
                class="type-col"
                rowspan="2"
                contenteditable="true"
              >...</td>

              <td class="num-col">3.</td>
              <td contenteditable="true">...</td>
            </tr>

            <tr>
              <td class="num-col">4.</td>
              <td contenteditable="true">...</td>
            </tr>
          </tbody>
        </table>
      `,
      []
    ],

    pf: () => [
      `
        <table class="pf-table">
          <tbody>
            ${pfRow(1)}
            ${pfRow(2)}
          </tbody>
        </table>
      `,
      [
        ["add-pf", "+ zdanie"],
        ["del-pf", "− zdanie"]
      ]
    ],

    luki: () => [
      `<p class="gap-line">${gap()}</p>`,
      [
        ["add-gap", "+ luka"],
        ["del-gap", "− luka"]
      ]
    ],

    calc: () => [
      `
        <p><strong>Obliczenia:</strong></p>

        <table
          class="calc-grid"
          data-rows="8"
          data-cols="30"
        >
          <tbody>
            ${calcGridRows(8, 30)}
          </tbody>
        </table>
      `,
      [
        ["calc-add-row", "+ wiersz"],
        ["calc-del-row", "− wiersz"],
        ["calc-add-col", "+ kolumna"],
        ["calc-del-col", "− kolumna"]
      ]
    ],

    abcd: () => [
      `
        <div class="abcd">
          ${["A", "B", "C", "D"]
            .map(
              (c) => `
                <p contenteditable="true">
                  <strong>${c}.</strong> …
                </p>
              `
            )
            .join("")}
        </div>
      `,
      [
        ["add-answer", "+ odpowiedź"],
        ["del-answer", "− odpowiedź"]
      ]
    ]
  };

  function addBlock(type) {
    const blocks = $("blocks");
    if (!blocks) return;

    if (["att1", "att2"].includes(type)) {
      if (
        blocks.querySelector(`[data-block="${type}"]`)
      ) {
        return;
      }

      blocks.insertAdjacentHTML(
        "beforeend",
        `
          <div class="block" data-block="${type}">
            <div
              class="attachment-placeholder"
              data-att="${type}"
            >
              <p class="att-title">
                📎 Załącznik ${type.slice(-1)} (${type})
              </p>
              <p class="att-note">
                Wybierz plik w sekcji „Załączniki”
                i wpisz opis.
              </p>
            </div>

            ${tools([])}
          </div>
        `
      );

      return;
    }

    if (
      !Object.prototype.hasOwnProperty.call(
        FACTORY,
        type
      )
    ) {
      return;
    }

    const [body, actions] = FACTORY[type]();

    blocks.insertAdjacentHTML(
      "beforeend",
      `
        <div class="block" data-block="${type}">
          ${body}
          ${tools(actions)}
        </div>
      `
    );
  }

  // =====================
  // AKCJE W BLOKACH
  // =====================

  function removeLast(nodes, min = 1) {
    if (nodes.length > min) {
      nodes[nodes.length - 1].remove();
    }
  }

  function answerLabel(n) {
    let s = "";

    do {
      s = String.fromCharCode(65 + (n % 26)) + s;
      n = Math.floor(n / 26) - 1;
    } while (n >= 0);

    return s;
  }

  function handleBlockClick(e) {
    const btn = e.target.closest?.(
      "button[data-action]"
    );

    const block = btn?.closest(".block");
    if (!block) return;

    e.preventDefault();

    const action = btn.dataset.action;
    const q = (s) => block.querySelector(s);
    const qa = (s) => block.querySelectorAll(s);

    switch (action) {
      case "del-block":
        block.remove();
        return;

      case "add-line":
        q(".answer-space")?.insertAdjacentHTML(
          "beforeend",
          line
        );
        break;

      case "del-line":
        removeLast(qa(".answer-space > .line"));
        break;

      case "add-item":
        q(".answer-list")?.insertAdjacentHTML(
          "beforeend",
          `<li>${line}</li>`
        );
        break;

      case "del-item":
        removeLast(qa(".answer-list > li"));
        break;

      case "add-line-last-item":
        q(".answer-list > li:last-child")
          ?.insertAdjacentHTML("beforeend", line);
        break;

      case "del-line-last-item":
        removeLast(
          qa(".answer-list > li:last-child > .line")
        );
        break;

      case "add-gap":
        q(".gap-line")?.insertAdjacentHTML(
          "beforeend",
          ` ${gap()}`
        );
        break;

      case "del-gap":
        removeLast(qa(".gap-unit"));
        break;

      case "add-pf": {
        const table = q(".pf-table");

        if (table) {
          const tbody =
            table.tBodies[0] || table.createTBody();

          tbody.insertAdjacentHTML(
            "beforeend",
            pfRow(table.rows.length + 1)
          );
        }

        break;
      }

      case "del-pf":
        removeLast(qa(".pf-table tr"));
        break;

      case "add-answer": {
        const box = q(".abcd");
        if (!box) break;

        const label = answerLabel(
          box.querySelectorAll("p").length
        );

        box.insertAdjacentHTML(
          "beforeend",
          `
            <p contenteditable="true">
              <strong>${label}.</strong> …
            </p>
          `
        );

        break;
      }

      case "del-answer":
        removeLast(qa(".abcd p"), 2);
        break;

      case "add-row": {
        const table = q(".matura-table");
        if (!table) break;

        const count =
          table.rows[0]?.cells.length || 3;

        const tr = document.createElement("tr");

        for (let i = 0; i < count; i++) {
          const td = document.createElement("td");

          if (i === 0) {
            td.textContent = `${table.rows.length}.`;
          } else if (i !== 2) {
            td.contentEditable = "true";
          }

          tr.append(td);
        }

        const tbody =
          table.tBodies[0] || table.createTBody();

        tbody.append(tr);
        break;
      }

      case "del-row": {
        const table = q(".matura-table");

        if (table && table.rows.length > 2) {
          table.deleteRow(table.rows.length - 1);
        }

        break;
      }

      case "add-col": {
        const table = q(".matura-table");
        if (!table) break;

        const n =
          table.rows[0]?.cells.length || 0;

        Array.from(table.rows).forEach((tr, i) => {
          const cell = document.createElement(
            i === 0 ? "th" : "td"
          );

          cell.contentEditable = "true";

          if (i === 0) {
            cell.textContent = `Kolumna ${n + 1}`;
          }

          tr.append(cell);
        });

        break;
      }

      case "del-col": {
        const table = q(".matura-table");

        if (
          table &&
          table.rows[0]?.cells.length > 2
        ) {
          Array.from(table.rows).forEach((tr) => {
            tr.lastElementChild?.remove();
          });
        }

        break;
      }

      case "calc-add-row": {
        const table = q(".calc-grid");
        if (!table) break;

        const cols =
          table.rows[0]?.cells.length || 30;

        const tbody =
          table.tBodies[0] || table.createTBody();

        tbody.insertAdjacentHTML(
          "beforeend",
          calcGridRows(1, cols)
        );

        break;
      }

      case "calc-del-row":
        removeLast(qa(".calc-grid tr"), 2);
        break;

      case "calc-add-col":
        qa(".calc-grid tr").forEach((tr) => {
          tr.insertAdjacentHTML(
            "beforeend",
            "<td>&nbsp;</td>"
          );
        });
        break;

      case "calc-del-col": {
        const table = q(".calc-grid");

        if (
          table &&
          table.rows[0]?.cells.length > 2
        ) {
          Array.from(table.rows).forEach((tr) => {
            tr.lastElementChild?.remove();
          });
        }

        break;
      }
    }

    const grid = q(".calc-grid");

    if (grid) {
      grid.dataset.rows = String(grid.rows.length);
      grid.dataset.cols = String(
        grid.rows[0]?.cells.length || 0
      );
    }
  }

  // =====================
  // CZYSZCZENIE HTML DO ZAPISU
  // =====================

  function cleanClone(el) {
    const clone = el.cloneNode(true);

    clone
      .querySelectorAll(
        ".editor-only, .block-tools, script"
      )
      .forEach((n) => n.remove());

    [clone, ...clone.querySelectorAll("*")]
      .forEach((n) => {
        n.removeAttribute("contenteditable");

        Array.from(n.attributes).forEach((a) => {
          if (a.name.startsWith("on")) {
            n.removeAttribute(a.name);
          }
        });
      });

    return clone;
  }

  function getCleanTaskHTML() {
    const editor = $("task-editor");

    if (!editor) {
      throw new Error(
        "Brakuje elementu #task-editor."
      );
    }

    const clone = cleanClone(editor);

    clone.querySelector("#auto-title")?.remove();

    clone
      .querySelectorAll(".attachment-placeholder")
      .forEach((n) => n.replaceChildren());

    return clone.innerHTML;
  }

  // =====================
  // METADANE DO ZAPISU
  // =====================

  function collectMeta() {
    canonicalizeFields();
    updateAutoTitle();

    const meta = {
      target: value("db-target") || "general",

      zrodlo_key:
        value("zrodlo_select") || "INNE",

      zrodlo_text:
        value("zrodlo_other").trim() ||
        $("zrodlo_select")
          ?.selectedOptions?.[0]
          ?.textContent?.trim() ||
        "",

      auto_title:
        $("auto-title")?.textContent || null
    };

    const fields = [
      "formula",
      "poziom",
      "rok",
      "miesiac",
      "l_pkt",
      "nr_zad",
      "strona",

      "dzial_1",
      "dzial_2",

      "kompetencja_1",
      "kompetencja_2",

      "zagadnienie",
      "typ",

      "pp1",
      "pp2",
      "pp3",
      "pp4",
      "pp5",
      "pp6",

      "uwagi"
    ];

    for (const id of fields) {
      meta[id] = normVal(value(id)) || null;
    }

    for (const id of ["czas_min", "czas_max"]) {
      const n = Number(value(id));

      if (!Number.isFinite(n) || n < 0) {
        throw new Error(
          `Pole ${id} musi zawierać liczbę nieujemną.`
        );
      }

      meta[id] = n;
    }

    if (
      meta.czas_max > 0 &&
      meta.czas_min > meta.czas_max
    ) {
      throw new Error(
        "Czas minimalny nie może być większy " +
        "niż maksymalny."
      );
    }

    const flags = [
      ["praca_z_topo", "praca_z_topo"],
      ["praca_z_mapa", "praca_z_mapa"],
      [
        "praca_z_tekstem_zrodlowym",
        "praca_z_tekstem"
      ],
      ["praca_z_wykresem", "praca_z_wykresem"]
    ];

    for (const [key, id] of flags) {
      meta[key] = $(id)?.checked ? "T" : "N";
    }

    return meta;
  }

  // =====================
  // ZAŁĄCZNIKI — WIDOCZNOŚĆ ZAKRESÓW
  // =====================

  function syncScopes() {
    for (const n of [1, 2]) {
      const box = $(`att${n}_scope_box`);

      if (box) {
        box.style.display =
          value(`att${n}_scope`) === "multi"
            ? "block"
            : "none";
      }
    }
  }

  // =====================
  // RESET FORMULARZA
  // =====================

  function resetManagerUI() {
    if (busy) return;

    initialFields.forEach(
      ({ el, val, checked }) => {
        if (el.type === "file") {
          el.value = "";
        } else {
          el.value = val;
        }

        if (
          ["checkbox", "radio"].includes(el.type)
        ) {
          el.checked = checked;
        }
      }
    );

    setLoadedId(null);

    $("blocks")?.replaceChildren();

    if ($("auto-title")) {
      $("auto-title").dataset.auto = "true";
    }

    if ($("solution-editor")) {
      $("solution-editor").innerHTML = `
        <p><strong>Zasady oceniania:</strong></p>
        <p>…</p>
        <p>
          <strong>
            Klucz / przykładowe odpowiedzi:
          </strong>
        </p>
        <p>…</p>
      `;
    }

    syncScopes();
    addBlock("lines");
    updateAutoTitle();

    void loadMetaSuggestions();
  }

  // =====================
  // BLOKADA WIELOKROTNYCH OPERACJI
  // =====================

  async function runOperation(label, fn) {
    if (busy) return;

    busy = true;

    const controls = Array.from(
      document.querySelectorAll(
        [
          "#save-task",
          "#import-btn",
          "#reset-form",
          "#reset-att-soft",
          "#reset-att-hard",
          "#db-target"
        ].join(",")
      )
    );

    const states = controls.map(
      (el) => [el, el.disabled]
    );

    controls.forEach((el) => {
      el.disabled = true;
    });

    try {
      await fn();
    } catch (err) {
      console.error(label, err);
      alert(`${label}: ${err.message}`);
    } finally {
      busy = false;

      states.forEach(([el, disabled]) => {
        el.disabled = disabled;
      });
    }
  }

  // =====================
  // ZAPIS ZADANIA
  // =====================

  async function saveTask() {
    const meta = collectMeta();
    const fd = new FormData();

    fd.append(
      "meta",
      JSON.stringify({
        ...meta,
        id: getLoadedId()
      })
    );

    fd.append(
      "body_html",
      getCleanTaskHTML()
    );

    const solution = $("solution-editor");

    fd.append(
      "solution_html",
      solution
        ? cleanClone(solution).innerHTML
        : ""
    );

    for (const n of [1, 2]) {
      for (
        const field of ["type", "desc", "intro"]
      ) {
        fd.append(
          `att${n}_${field}`,
          value(`att${n}_${field}`)
        );
      }

      // Odczyt tych pól musi być zgodny z backendem.
      const scope =
        value(`att${n}_scope`) || "single";

      const tasks =
        scope === "multi"
          ? value(`att${n}_tasks`).trim()
          : "";

      if (scope === "multi" && !tasks) {
        throw new Error(
          `Załącznik ${n}: wpisz numery zadań we wiązce.`
        );
      }

      fd.append(`att${n}_scope`, scope);
      fd.append(`att${n}_tasks`, tasks);

      const file =
        $(`att${n}_file`)?.files?.[0];

      if (file) {
        fd.append(`att${n}_file`, file);
      }
    }

      const endpoint = getLoadedId()
        ? "/api/update_task"
        : "/api/save_task";

      const data = await api(
        endpoint,
        {
          method: "POST",
          body: fd
        }
      );

    if (!data.ok || !data.id) {
      throw new Error(
        "Serwer nie potwierdził zapisu " +
        "i ID zadania."
      );
    }

    setLoadedId(data.id);

    alert(`Zapisano! ID: ${data.id}`);

    await loadMetaSuggestions();
  }

  // =====================
  // IMPORT ZIP
  // =====================

  async function importPackage() {
    const file =
      $("import-file")?.files?.[0];

    if (!file) {
      throw new Error("Wybierz plik .zip.");
    }

    if (!/\.zip$/i.test(file.name)) {
      throw new Error(
        "Import wymaga pliku .zip."
      );
    }

    const target =
      value("db-target") || "general";

    const fd = new FormData();
    fd.append("package", file);

    const data = await api(
      "/api/import_package",
      {
        method: "POST",
        body: fd
      }
    );

    if (!data.ok) {
      throw new Error(
        data.error ||
        "Serwer nie potwierdził importu."
      );
    }

      alert(
        `Import zakończony.\n` +
        `Zadania: ${data.imported_count ?? 1}\n` +
        `Dodane: ${data.created_count ?? 0}\n` +
        `Nadpisane: ${data.updated_count ?? 0}`
      );

    if ($("import-file")) {
      $("import-file").value = "";
    }

    await loadMetaSuggestions();
  }

  // =====================
  // RESET ZAŁĄCZNIKÓW
  // =====================

  async function resetAttachments(mode) {
    const target =
      value("db-target") || "general";

    const msg =
      mode === "hard"
        ? (
            `Baza: ${target}. ` +
            "Usunąć pliki załączników i wyczyścić " +
            "pola załączników w rekordach?"
          )
        : (
            `Baza: ${target}. ` +
            "Usunąć pliki załączników? " +
            "Odwołania w rekordach pozostaną."
          );

    if (!confirm(msg)) return;

    const data = await api(
      "/api/reset_attachments",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ mode })
      }
    );

    if (!data.ok) {
      throw new Error(
        "Serwer nie potwierdził resetu."
      );
    }

    alert(
      `OK: ${data.mode ?? mode}\n` +
      `Usunięte pliki: ${data.removed_files ?? 0}\n` +
      `Wyczyszczone rekordy: ${data.records_cleared ?? 0}`
    );
  }

  // =====================
  // WKLEJANIE CZYSTEGO TEKSTU
  // =====================

  function handlePaste(e) {
    const editable = e.target.closest?.(
      "[contenteditable]"
    );

    if (
      !editable ||
      editable.getAttribute("contenteditable") !==
        "true"
    ) {
      return;
    }

    if (
      !editable.closest(
        "#task-editor, #solution-editor"
      )
    ) {
      return;
    }

    if (!e.clipboardData) return;

    e.preventDefault();

    const text =
      e.clipboardData.getData("text/plain");

    const selection = window.getSelection();

    if (!selection?.rangeCount) return;

    const range = selection.getRangeAt(0);

    if (
      !editable.contains(
        range.commonAncestorContainer
      )
    ) {
      return;
    }

    range.deleteContents();

    const node = document.createTextNode(text);

    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);

    selection.removeAllRanges();
    selection.addRange(range);

    editable.dispatchEvent(
      new Event("input", { bubbles: true })
    );
  }

  // =====================
  // INIT
  // =====================

  function init() {
    // Stan początkowy pól służy do resetowania.
    initialFields = Array.from(
      document.querySelectorAll(
        "input, select, textarea"
      )
    ).map((el) => ({
      el,
      val: el.value,
      checked: el.checked
    }));

    // Dodawanie bloków.
    document
      .querySelectorAll(".block-bar button")
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          addBlock(btn.dataset.add);
        });
      });

    // Akcje wewnątrz bloków.
    $("blocks")?.addEventListener(
      "click",
      handleBlockClick
    );

    // Zakresy załączników.
    for (const n of [1, 2]) {
      $(`att${n}_scope`)?.addEventListener(
        "change",
        syncScopes
      );
    }

    // Ręczna edycja wyłącza automatyczny tytuł.
    $("auto-title")?.addEventListener(
      "input",
      () => {
        $("auto-title").dataset.auto = "false";
      }
    );

    const titleFields = [
      "formula",
      "poziom",
      "rok",
      "miesiac",
      "nr_zad",
      "dzial_1",
      "dzial_2",
      "zagadnienie",
      "typ",
      "zrodlo_select",
      "zrodlo_other"
    ];

    for (const id of titleFields) {
      for (const event of ["input", "change"]) {
        $(id)?.addEventListener(
          event,
          updateAutoTitle
        );
      }
    }

    // Ujednolicanie pisowni metadanych.
    for (
      const id of [
        "dzial_1",
        "dzial_2",
        "zagadnienie",
        "kompetencja_1",
        "kompetencja_2"
      ]
    ) {
      $(id)?.addEventListener("blur", () => {
        canonicalizeFields();
        updateAutoTitle();
      });
    }

    // ID zadania nie przechodzi automatycznie
    // między różnymi bazami.
    $("db-target")?.addEventListener(
      "change",
      () => {
        setLoadedId(null);
        void loadMetaSuggestions();
      }
    );

    const operations = [
      ["save-task", "Błąd zapisu", saveTask],
      ["import-btn", "Błąd importu", importPackage],
      [
        "reset-att-soft",
        "Błąd resetu",
        () => resetAttachments("soft")
      ],
      [
        "reset-att-hard",
        "Błąd resetu",
        () => resetAttachments("hard")
      ]
    ];

    for (const [id, label, fn] of operations) {
      $(id)?.addEventListener("click", (e) => {
        e.preventDefault();
        void runOperation(label, fn);
      });
    }

    $("reset-form")?.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        resetManagerUI();
      }
    );

    document.addEventListener(
      "paste",
      handlePaste
    );
// Formularz obsługujemy przyciskami.
// Enter w pojedynczym polu nie przeładuje strony.
$("task-form")?.addEventListener(
  "submit",
  (e) => e.preventDefault()
);

// Resetuje wyłącznie pola załączników.
// Nie usuwa plików zapisanych już w bazie.
$("reset-attachments")?.addEventListener(
  "click",
  (e) => {
    e.preventDefault();

    if (busy) return;

    for (const n of [1, 2]) {
      const file = $(`att${n}_file`);

      if (file) {
        file.value = "";
      }

      for (
        const field of ["desc", "intro", "tasks"]
      ) {
        const el = $(`att${n}_${field}`);

        if (el) {
          el.value = "";
        }
      }

      const type = $(`att${n}_type`);
      const scope = $(`att${n}_scope`);

      if (type) {
        type.value = "img";
      }

      if (scope) {
        scope.value = "single";
      }
    }

    syncScopes();
  }
);
    syncScopes();
    updateAutoTitle();

    // Nie dopisuje domyślnego bloku,
    // jeśli zadanie ma już treść.
    if (
      $("blocks") &&
      !$("blocks").querySelector(".block")
    ) {
      addBlock("lines");
    }

    void loadMetaSuggestions();

    console.log("meneger.js OK");
  }

  // =====================
  // PUBLICZNE FUNKCJE
  // =====================

  window.GeoFinderManager = {
    addBlock,
    buildAutoTitle,
    updateAutoTitle,
    collectMeta,
    getCleanTaskHTML,
    loadMetaSuggestions,
    resetManagerUI,
    setLoadedId,
    getLoadedId
  };

  // Zgodność z wywołaniami z istniejącego HTML
  // i pozostałych skryptów.
  Object.assign(window, {
    addBlock,
    buildAutoTitle,
    updateAutoTitle,
    collectMeta,
    getCleanTaskHTML,
    loadMetaSuggestions,
    resetManagerUI
  });

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }
})();