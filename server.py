from flask import Flask, request, jsonify, send_from_directory
from pathlib import Path
import json
import re
import os

APP = Flask(__name__)

# ROOT musi brać się z env (dla EXE onefile), a jak nie ma env → fallback do folderu pliku
ROOT = Path(os.environ.get("GEOFINDER_ROOT", str(Path(__file__).resolve().parent)))

print("ROOT =", ROOT)
print("CWD  =", Path().resolve())

# DOPASUJ do swojej struktury:
DATA_JSON = ROOT / "data" / "tasks_private.json"
TASKS_DIR = ROOT / "tasks_private"
ATT_DIR   = ROOT / "attachment_private"
IMG_DIR   = ROOT / "img_private"

for p in [TASKS_DIR, ATT_DIR, IMG_DIR, DATA_JSON.parent]:
    p.mkdir(parents=True, exist_ok=True)
if not DATA_JSON.exists():
    DATA_JSON.write_text("[]", encoding="utf-8")



def norm(v):
    if v is None:
        return ""
    s = str(v).strip()
    if s in ("null", "0000", ""):
        return ""
    return s

def slug(s: str) -> str:
    s = (s or "").strip()
    s = re.sub(r"\s+", "_", s)
    s = re.sub(r"[^A-Za-z0-9_ĄąĆćĘęŁłŃńÓóŚśŹźŻż-]", "", s)
    return s

def parse_nr_zad(nr: str):
    """
    "10.1" -> ("10","1"), "27" -> ("27","0")
    """
    nr = (nr or "").strip()
    if not nr:
        return ("00", "0")
    if "." in nr:
        a,b = nr.split(".", 1)
        return (a.strip(), b.strip() or "0")
    return (nr, "0")

def make_sheet_prefix(src_key: str, formula: str, poziom: str, rok: str, miesiac: str) -> str:
    yy = formula[-2:] if formula else "XX"
    lvl = "R" if "Rozszerz" in (poziom or "") else "P"
    return f"{src_key}{yy}{lvl}_{rok}_{miesiac}"


def build_task_id(meta: dict) -> str:
    src_key = norm(meta.get("zrodlo_key", "INNE"))
    formula = norm(meta.get("formula"))
    poziom  = norm(meta.get("poziom"))
    rok     = norm(meta.get("rok"))
    miesiac = norm(meta.get("miesiac"))
    nr_zad  = norm(meta.get("nr_zad"))

    # arkusze typu matura (CKE_*, NER_M, OPE_M itd.)
    if src_key.startswith(("CKE_", "NER_M", "OPE_M")):
        sheet = make_sheet_prefix(src_key, formula, poziom, rok, miesiac)
        main, sub = parse_nr_zad(nr_zad)          # 29.2 -> ("29","2")
        return f"{sheet}_Z{main}_{sub}"

    # INNE
    prefix = src_key if src_key not in ("INNE",) else "INNE"
    dzial = slug(meta.get("dzial_1") or "Zadania")
    tasks = json.loads(DATA_JSON.read_text(encoding="utf-8"))
    pat = re.compile(rf"^{re.escape(prefix)}_{re.escape(dzial)}_(\d{{3}})_0$")
    nums = [int(m.group(1)) for t in tasks if (m := pat.match(str(t.get("id",""))))]
    nxt = (max(nums) + 1) if nums else 1
    return f"{prefix}_{dzial}_{nxt:03d}_0"

def bundle_attachment_base_id(meta: dict) -> str:
    """
    Dla 29.1 / 29.2 / 29.3 -> wspólny base: <sheet>_Z29
    """
    src_key = norm(meta.get("zrodlo_key", "INNE"))
    formula = norm(meta.get("formula"))
    poziom  = norm(meta.get("poziom"))
    rok     = norm(meta.get("rok"))
    miesiac = norm(meta.get("miesiac"))
    nr_zad  = norm(meta.get("nr_zad"))

    sheet = make_sheet_prefix(src_key, formula, poziom, rok, miesiac)
    main, _sub = parse_nr_zad(nr_zad)
    return f"{sheet}_Z{main}"


def make_task_html(full_title: str, body_html: str, solution_html: str) -> str:
    # To jest pełny plik zadania w Twoim stylu (meta-placeholder zostawiamy!)
    return f"""<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <title>{full_title}</title>
  <link rel="stylesheet" href="../style.css">
</head>
<body>

<h1>{full_title}</h1>

<div class="meta">
  <span class="meta-placeholder" data-meta="zrodlo"></span>
  <span class="meta-placeholder" data-meta="rok"></span>
  <span class="meta-points"><span class="meta-placeholder" data-meta="l_pkt"></span></span>
  <span class="meta-placeholder" data-meta="kompetencje"></span>
</div>

{body_html}

<details class="solution">
  <summary>Pokaż rozwiązanie</summary>
  <div class="solution-content">
    {solution_html}
  </div>
</details>

</body>
</html>"""

def make_attachment_wrapper(img_rel_src: str, alt_text: str, intro_html: str = "") -> str:
    alt_text = (alt_text or "").replace('"', "'")
    intro_html = intro_html or ""

    return f"""<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <title>Załącznik</title>
  <link rel="stylesheet" href="../style.css">
</head>
<body>
  <div class="task-intro">
    {intro_html}
    <div class="attachment">
      <img src="{img_rel_src}" alt="{alt_text}">
    </div>
  </div>
</body>
</html>"""

def bundle_base_id(meta: dict) -> str:
    """
    Z meta (rok/miesiac/formula/poziom/nr_zad) robi bazę załącznika dla wiązki:
    np. ..._Z29  (bez _2/_3)
    """
    src_key = norm(meta.get("zrodlo_key", "INNE"))
    formula = norm(meta.get("formula"))
    poziom  = norm(meta.get("poziom"))
    rok     = norm(meta.get("rok"))
    miesiac = norm(meta.get("miesiac"))
    nr_zad  = norm(meta.get("nr_zad"))

    # arkusz (prefix) – tak jak w build_task_id
    yy = formula[-2:] if formula else "XX"
    lvl = "R" if "Rozszerz" in (poziom or "") else "P"

    # numer główny zadania: 29.2 -> 29
    main, _sub = parse_nr_zad(nr_zad)

    # baza dla załącznika: np. CKE_M23R_2024_maj_Z29
    return f"{src_key}{yy}{lvl}_{rok}_{miesiac}_Z{main}"


@APP.route("/api/save_task", methods=["POST"])
def save_task():
    try:
        meta_json = request.form.get("meta", "{}")
        body_html = request.form.get("body_html", "")
        solution_html = request.form.get("solution_html", "")

        meta = json.loads(meta_json)

        # debug info (pomaga, jak coś nie dochodzi)
        print("SAVE_TASK HIT")
        print("form keys:", list(request.form.keys()))
        print("files:", list(request.files.keys()))

        zrodlo_text = meta.get("zrodlo_text") or "inne"
        meta["zrodlo"] = zrodlo_text

        task_id = build_task_id(meta)

        full_title = meta.get("auto_title") or f"Zadanie {task_id}"
        html_text = make_task_html(full_title, body_html, solution_html)
        task_path = TASKS_DIR / f"{task_id}.html"
        task_path.write_text(html_text, encoding="utf-8")

        def handle_att(which: str):
            f = request.files.get(f"{which}_file")
            att_type = request.form.get(f"{which}_type") or None
            desc = request.form.get(f"{which}_desc") or ""
            intro = request.form.get(f"{which}_intro", "") or ""

            # ID wspólne dla wiązki (tu użyj swojej funkcji bundle_base_id/meta)
            bundle_id = bundle_base_id(meta)  # np. CKE_M23R_2024_maj_Z29
            att_id = f"{bundle_id}_000" if which == "att1" else f"{bundle_id}_001"
            wrapper_path = ATT_DIR / f"{att_id}.html"
            src = f"../attachment_private/{att_id}.html"

            # 1) brak uploadu -> jeśli wrapper istnieje, to reuse
            if (not f) or (f.filename == ""):
                if wrapper_path.exists():
                    return (att_id, att_type or "img", src)
                return (None, None, None)

            ext = Path(f.filename).suffix.lower()

            # 2) upload .html -> traktuj jako gotowy wrapper
            if ext == ".html":
                f.save(wrapper_path)
                return (att_id, att_type or "img", src)

            # 3) upload obrazka -> zapis obrazka + generowanie wrappera
            if ext in (".png", ".jpg", ".jpeg", ".webp"):
                img_name = f"{att_id}{ext}"
                img_path = IMG_DIR / img_name
                f.save(img_path)

                wrapper_html = make_attachment_wrapper(
                    f"../img_private/{img_name}",
                    desc,
                    intro_html=intro
                )
                wrapper_path.write_text(wrapper_html, encoding="utf-8")

                return (att_id, att_type or "img", src)

            # 4) inny typ -> odrzuć
            return (None, None, None)


        att1_id, att1_type, att1_src = handle_att("att1")
        att2_id, att2_type, att2_src = handle_att("att2")

        record = {
          "id": task_id,
          "dzial_1": meta.get("dzial_1"),
          "dzial_2": meta.get("dzial_2"),
          "zrodlo": meta.get("zrodlo"),
          "formula": meta.get("formula") or None,
          "poziom": meta.get("poziom") or None,
          "l_pkt": int(meta.get("l_pkt") or 0),
          "rok": int(meta["rok"]) if meta.get("rok") else None,
          "miesiac": meta.get("miesiac") or None,
          "zagadnienie": meta.get("zagadnienie") or None,
          "typ": meta.get("typ") or None,
          "kompetencja_1": meta.get("kompetencja_1"),
          "kompetencja_2": meta.get("kompetencja_2"),
          "praca_z_topo": meta.get("praca_z_topo"),
          "praca_z_mapa": meta.get("praca_z_mapa"),
          "praca_z_tekstem_zrodlowym": meta.get("praca_z_tekstem_zrodlowym"),
          "praca_z_wykresem": meta.get("praca_z_wykresem"),
          "czas_min": int(meta.get("czas_min") or 0),
          "czas_max": int(meta.get("czas_max") or 0),
          "strona": int(meta["strona"]) if meta.get("strona") else None,
          "nr_zad": meta.get("nr_zad"),
          "html": f"../tasks_private/{task_id}.html",
          "if_att": "T" if (att1_id or att2_id) else "N",
          "att1_id": att1_id,
          "att1_type": att1_type,
          "att1_src": att1_src,
          "att2_id": att2_id,
          "att2_type": att2_type,
          "att2_src": att2_src,
          "student": meta.get("student") or "N",
          "uwagi": meta.get("uwagi"),
          "podstawa_programowa_1": meta.get("pp1"),
          "podstawa_programowa_2": meta.get("pp2"),
          "podstawa_programowa_3": meta.get("pp3"),
          "podstawa_programowa_4": meta.get("pp4"),
          "podstawa_programowa_5": meta.get("pp5"),
          "podstawa_programowa_6": meta.get("pp6"),
          "DO_uzup": meta.get("DO_uzup")
        }

        tasks = json.loads(DATA_JSON.read_text(encoding="utf-8"))
        tasks.append(record)
        DATA_JSON.write_text(json.dumps(tasks, ensure_ascii=False, indent=2), encoding="utf-8")

        return jsonify({"ok": True, "id": task_id, "html": record["html"]})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"ok": False, "error": str(e)}), 500


print("META_SUGGESTIONS ROUTE LOADED")

@APP.get("/api/meta_suggestions")
def meta_suggestions():
    # bierzemy z DATA_JSON (Twoje tasks_private.json)
    tasks = json.loads(DATA_JSON.read_text(encoding="utf-8"))

    dzialy = set()
    zagadnienia = set()
    kompetencje = set()

    def add_set(s, val):
        if not val:
            return
        v = str(val).strip()
        if v:
            s.add(v)

    for t in tasks:
        add_set(dzialy, t.get("dzial_1"))
        add_set(dzialy, t.get("dzial_2"))
        add_set(zagadnienia, t.get("zagadnienie"))

        # masz kompetencja_1 / _2
        add_set(kompetencje, t.get("kompetencja_1"))
        add_set(kompetencje, t.get("kompetencja_2"))

        # jeśli kiedyś dodasz listę "kompetencje": [...]
        if isinstance(t.get("kompetencje"), list):
            for k in t["kompetencje"]:
                add_set(kompetencje, k)

    # sortowanie PL-ish
    out = {
        "dzialy": sorted(dzialy, key=lambda x: x.lower()),
        "zagadnienia": sorted(zagadnienia, key=lambda x: x.lower()),
        "kompetencje": sorted(kompetencje, key=lambda x: x.lower()),
    }
    return jsonify(out)



@APP.post("/api/reset_attachments")
def reset_attachments():
    mode = (request.get_json(silent=True) or {}).get("mode", "soft")

    # 1) usuń pliki
    removed_files = 0
    for folder in [ATT_DIR, IMG_DIR]:
        if folder.exists():
            for p in folder.iterdir():
                if p.is_file():
                    p.unlink(missing_ok=True)
                    removed_files += 1

    # 2) hard reset: wyczyść pola w JSON
    changed = 0
    if mode == "hard":
        tasks = json.loads(DATA_JSON.read_text(encoding="utf-8"))

        for t in tasks:
            # jeśli cokolwiek było ustawione -> wyzeruj
            if t.get("if_att") == "T" or t.get("att1_id") or t.get("att2_id"):
                t["if_att"] = "N"
                t["att1_id"] = None
                t["att1_type"] = None
                t["att1_src"] = None
                t["att2_id"] = None
                t["att2_type"] = None
                t["att2_src"] = None
                changed += 1

        DATA_JSON.write_text(json.dumps(tasks, ensure_ascii=False, indent=2), encoding="utf-8")

    return jsonify({
        "ok": True,
        "mode": mode,
        "removed_files": removed_files,
        "records_cleared": changed
    })

@APP.post("/api/fix_title")
def fix_title():
    payload = request.get_json(silent=True) or {}
    task_id = payload.get("id")
    new_title = (payload.get("title") or "").strip()

    if not task_id or not new_title:
        return jsonify({"ok": False, "error": "missing"}), 400

    html_path = TASKS_DIR / f"{task_id}.html"
    if not html_path.exists():
        return jsonify({"ok": False, "error": "html not found"}), 404

    text = html_path.read_text(encoding="utf-8")

    # 1) <title>...</title>
    text = re.sub(r"<title>.*?</title>", f"<title>{new_title}</title>", text, flags=re.DOTALL)

    # 2) pierwszy <h1>...</h1>
    text = re.sub(r"<h1>.*?</h1>", f"<h1>{new_title}</h1>", text, count=1, flags=re.DOTALL)

    html_path.write_text(text, encoding="utf-8")

    return jsonify({"ok": True})

@APP.post("/api/rename_attachment")
def rename_attachment():
    payload = request.get_json(silent=True) or {}
    old_id = (payload.get("old_id") or "").strip()
    new_id = (payload.get("new_id") or "").strip()

    if not old_id or not new_id:
        return jsonify({"ok": False, "error": "missing ids"}), 400

    # 1) znajdź wrapper
    old_wrapper = ATT_DIR / f"{old_id}.html"
    new_wrapper = ATT_DIR / f"{new_id}.html"
    if not old_wrapper.exists():
        return jsonify({"ok": False, "error": "old wrapper not found"}), 404

    # 2) znajdź obrazek (dowolne rozszerzenie)
    exts = [".png", ".jpg", ".jpeg", ".webp"]
    old_img = None
    for ext in exts:
        cand = IMG_DIR / f"{old_id}{ext}"
        if cand.exists():
            old_img = cand
            break

    # 3) przenieś obrazek jeśli istnieje
    if old_img:
        new_img = IMG_DIR / f"{new_id}{old_img.suffix.lower()}"
        old_img.rename(new_img)

        # 4) popraw wrapper: src i ewentualnie tytuł
        w = old_wrapper.read_text(encoding="utf-8")
        w = w.replace(f"../img_private/{old_id}{old_img.suffix.lower()}", f"../img_private/{new_img.name}")
        w = re.sub(r"<title>.*?</title>", "<title>Załącznik</title>", w, flags=re.DOTALL)
        new_wrapper.write_text(w, encoding="utf-8")
        old_wrapper.unlink(missing_ok=True)
    else:
        # bez obrazka: tylko rename wrappera
        old_wrapper.rename(new_wrapper)

    # 5) popraw JSON: wszystkie rekordy, gdzie att1_id/att2_id == old_id
    tasks = json.loads(DATA_JSON.read_text(encoding="utf-8"))
    changed = 0
    for t in tasks:
        for which in ("att1", "att2"):
            if t.get(f"{which}_id") == old_id:
                t[f"{which}_id"] = new_id
                # src zawsze w tej samej strukturze
                t[f"{which}_src"] = f"../attachment_private/{new_id}.html"
                changed += 1

    DATA_JSON.write_text(json.dumps(tasks, ensure_ascii=False, indent=2), encoding="utf-8")

    return jsonify({"ok": True, "updated_records": changed})



@APP.get("/api/tasks_list")
def tasks_list():
    src = request.args.get("src", "private")
    path = (ROOT / "data" / ("tasks.json" if src == "public" else "tasks_private.json"))

    if not path.exists():
        return jsonify([])

    tasks = json.loads(path.read_text(encoding="utf-8"))
    out = []
    for t in tasks:
        out.append({
            "id": t.get("id"),
            "zrodlo": t.get("zrodlo"),
            "rok": t.get("rok"),
            "miesiac": t.get("miesiac"),
            "nr_zad": t.get("nr_zad"),
            "html": t.get("html"),
        })
    return jsonify(out)

@APP.get("/api/task/<task_id>")
def get_task(task_id):
    src = request.args.get("src", "private")
    path = (ROOT / "data" / ("tasks.json" if src == "public" else "tasks_private.json"))

    if not path.exists():
        return jsonify({"ok": False, "error": "no db"}), 404

    tasks = json.loads(path.read_text(encoding="utf-8"))
    rec = next((t for t in tasks if str(t.get("id")) == task_id), None)
    if not rec:
        return jsonify({"ok": False, "error": "not found"}), 404

    # opcjonalnie: wczytaj pełny HTML (na przyszłość)
    html_text = ""
    html_rel = rec.get("html") or ""
    if html_rel.startswith("../"):
        html_rel = html_rel[3:]
    html_path = ROOT / html_rel
    if html_path.exists():
        html_text = html_path.read_text(encoding="utf-8")

    return jsonify({"ok": True, "record": rec, "html": html_text})


# serwuj pliki statyczne projektu
@APP.route("/")
def home():
    return send_from_directory(ROOT, "index.html")

@APP.route("/<path:path>")
def static_files(path):
    return send_from_directory(ROOT, path)


if __name__ == "__main__":
    APP.run("127.0.0.1", 8000, debug=False, threaded=True)
